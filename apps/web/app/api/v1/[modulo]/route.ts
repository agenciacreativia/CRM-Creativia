import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/db/api-keys";
import { createAdminSupabase } from "@/lib/supabase/admin";

/**
 * API pública v1 — lista por módulo.
 *
 *   GET  /api/v1/{modulo}          → lista los últimos N registros
 *   POST /api/v1/{modulo}          → crea un registro (lead va a lista de espera si se excede el límite)
 *
 * Módulos soportados: contactos, empresas, oportunidades, productos.
 * Auth: header  `Authorization: Bearer crm_...`
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Regex estándar para UUID v1-v5 (validación de formato previa a consultar la DB).
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Verifica que un id exista en una tabla para el tenant dado.
 * Devuelve true si pertenece al tenant, false en caso contrario.
 */
async function perteneceAlTenant(
  admin: ReturnType<typeof createAdminSupabase>,
  tabla: string,
  id: string,
  tenantId: string,
): Promise<boolean> {
  const { data, error } = await admin.from(tabla).select("id").eq("id", id).eq("tenant_id", tenantId).maybeSingle();
  if (error) return false;
  return !!data;
}

// `writable`: ALLOWLIST de columnas que la API pública puede setear vía body.
// SEGURIDAD: sin esto, el insert hacía `{ tenant_id, ...body }` y el cliente
// podía sobrescribir `tenant_id` (escritura cross-tenant) o columnas internas
// como `en_espera`, `creado_por`, `eliminada_en`, `campos_custom`. Cualquier
// campo del body que no esté acá se descarta.
const TABLAS: Record<string, { tabla: string; cols: string; required: string[]; writable: string[] }> = {
  contactos: {
    tabla: "contacto",
    cols: "id, nombre, email, telefono, empresa_id, creado_en",
    required: ["nombre", "email"],
    writable: ["nombre", "email", "telefono", "telefono_whatsapp", "cargo", "empresa_id", "descripcion", "origen", "asignado_id"],
  },
  empresas: {
    tabla: "empresa",
    cols: "id, nombre, estado_empresa, telefono, creado_en",
    required: ["nombre"],
    writable: ["nombre", "email", "telefono", "sitio_web", "direccion", "ciudad", "pais", "descripcion", "estado_empresa", "origen", "asignado_id"],
  },
  oportunidades: {
    tabla: "oportunidad",
    cols: "id, nombre, valor, moneda, estado, pipeline_id, etapa_id, contacto_id, empresa_id, creado_en",
    required: ["nombre", "contacto_id", "empresa_id", "pipeline_id", "etapa_id"],
    writable: ["nombre", "valor", "moneda", "estado", "pipeline_id", "etapa_id", "contacto_id", "empresa_id", "probabilidad_cierre", "fecha_esperada_cierre", "descripcion", "asignado_id"],
  },
  productos: {
    tabla: "producto",
    cols: "id, nombre, categoria, destino, precio_desde, moneda, activo, creado_en",
    required: ["nombre"],
    writable: ["nombre", "categoria", "destino", "duracion", "precio_desde", "moneda", "descripcion", "incluye", "no_incluye", "proveedor", "activo"],
  },
};

/** Filtra el body del cliente dejando solo las columnas en la allowlist. */
function pickWritable(body: Record<string, unknown>, writable: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of writable) {
    if (body[k] !== undefined) out[k] = body[k];
  }
  return out;
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

async function auth(req: NextRequest) {
  const h = req.headers.get("authorization") ?? "";
  const raw = h.startsWith("Bearer ") ? h.slice(7) : "";
  return authenticateApiKey(raw);
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ modulo: string }> }) {
  const { modulo } = await params;
  const t = TABLAS[modulo];
  if (!t) return NextResponse.json({ error: "modulo desconocido", soportados: Object.keys(TABLAS) }, { status: 404, headers: CORS });
  const a = await auth(req);
  if (!a) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: CORS });
  // Lectura devuelve uso pero no incrementa contador (sólo escrituras consumen cuota).
  const admin = createAdminSupabase();
  const limit = Math.min(200, Number(req.nextUrl.searchParams.get("limit") ?? "50"));
  const { data, error } = await admin.from(t.tabla).select(t.cols).eq("tenant_id", a.tenantId).order("creado_en", { ascending: false }).limit(limit);
  if (error) return NextResponse.json({ error: error.message }, { status: 400, headers: CORS });
  return NextResponse.json({ data, uso: { usados: a.usados, limite: a.limite } }, { headers: CORS });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ modulo: string }> }) {
  const { modulo } = await params;
  const t = TABLAS[modulo];
  if (!t) return NextResponse.json({ error: "modulo desconocido", soportados: Object.keys(TABLAS) }, { status: 404, headers: CORS });
  const a = await auth(req);
  if (!a) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: CORS });

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "invalid json" }, { status: 400, headers: CORS }); }

  const missing = t.required.filter((k) => !body[k] || String(body[k]).trim() === "");
  if (missing.length) return NextResponse.json({ error: `campos requeridos: ${missing.join(", ")}` }, { status: 400, headers: CORS });

  // Validación de formato UUID para todas las FKs provistas en el body.
  // Evita inserts con strings inválidos que devolverían un error genérico de Postgres.
  const camposUuid = ["contacto_id", "empresa_id", "pipeline_id", "etapa_id"] as const;
  for (const campo of camposUuid) {
    const valor = body[campo];
    if (valor !== undefined && valor !== null && valor !== "" && !UUID_RE.test(String(valor))) {
      return NextResponse.json({ error: `${campo} no es un UUID válido` }, { status: 400, headers: CORS });
    }
  }

  const admin = createAdminSupabase();

  // Validación de pertenencia al tenant para FKs provistas explícitamente.
  // Previene cross-tenant: si el id existe pero pertenece a otro tenant,
  // se rechaza con un mensaje claro en lugar de fallar silenciosamente por RLS.
  const fkValidaciones: Array<{ campo: string; tabla: string }> = [
    { campo: "empresa_id", tabla: "empresa" },
    { campo: "contacto_id", tabla: "contacto" },
  ];
  if (modulo === "oportunidades") {
    fkValidaciones.push({ campo: "pipeline_id", tabla: "pipeline" });
    // La tabla real es etapa_pipeline (no "etapa") — con "etapa" la validación
    // siempre fallaba y rechazaba toda creación de oportunidad vía API.
    fkValidaciones.push({ campo: "etapa_id", tabla: "etapa_pipeline" });
  }
  for (const { campo, tabla } of fkValidaciones) {
    const valor = body[campo];
    if (valor !== undefined && valor !== null && valor !== "") {
      const ok = await perteneceAlTenant(admin, tabla, String(valor), a.tenantId);
      if (!ok) return NextResponse.json({ error: `${campo} no existe o no pertenece al tenant` }, { status: 400, headers: CORS });
    }
  }

  // Sobre cap → desviar a lista de espera usando la columna `en_espera`
  // (mecanismo existente desde migración 0021 — el row queda guardado pero
  // oculto por RLS hasta que el admin lo libere). Solo para contactos/oportunidades.
  if (a.exceeded && (modulo === "contactos" || modulo === "oportunidades")) {
    // Auto-empresa para contactos sin empresa_id (igual que el flujo normal de abajo)
    if (modulo === "contactos" && !body.empresa_id) {
      const { data: emp } = await admin.from("empresa").select("id").eq("tenant_id", a.tenantId).ilike("nombre", "API").maybeSingle();
      if (emp) body.empresa_id = emp.id;
      else {
        const { data: created, error } = await admin.from("empresa").insert({ tenant_id: a.tenantId, nombre: "API", estado_empresa: "prospecto", en_espera: true }).select("id").single();
        if (error) return NextResponse.json({ error: error.message }, { status: 400, headers: CORS });
        body.empresa_id = created.id;
      }
    }
    // Allowlist + tenant_id/en_espera SIEMPRE al final, para que el body del
    // cliente no pueda sobrescribirlos (mass-assignment cross-tenant).
    const insertHeld: Record<string, unknown> = { ...pickWritable(body, t.writable), tenant_id: a.tenantId, en_espera: true };
    const { data: held, error: heldErr } = await admin.from(t.tabla).insert(insertHeld).select("id").single();
    if (heldErr) return NextResponse.json({ error: heldErr.message }, { status: 400, headers: CORS });
    return NextResponse.json({
      data: { id: held.id, en_lista_espera: true },
      mensaje: "Tu cuenta excedió el límite mensual de la API. El lead quedó en lista de espera (en_espera=true) y se libera al subir el plan o al pasar el mes.",
      uso: { usados: a.usados, limite: a.limite },
    }, { status: 202, headers: CORS });
  }

  // Inserción normal. Si es contacto y no se da empresa_id, autocrear empresa "API".
  if (modulo === "contactos" && !body.empresa_id) {
    const { data: emp, error: empErr } = await admin.from("empresa").select("id").eq("tenant_id", a.tenantId).ilike("nombre", "API").maybeSingle();
    if (empErr) return NextResponse.json({ error: empErr.message }, { status: 500, headers: CORS });
    if (emp) body.empresa_id = emp.id;
    else {
      const { data: created, error } = await admin.from("empresa").insert({ tenant_id: a.tenantId, nombre: "API", estado_empresa: "prospecto" }).select("id").single();
      if (error) return NextResponse.json({ error: error.message }, { status: 400, headers: CORS });
      body.empresa_id = created.id;
    }
  }
  // Allowlist de columnas + tenant_id al final (no sobrescribible por el body).
  const insert: Record<string, unknown> = { ...pickWritable(body, t.writable), tenant_id: a.tenantId };
  const { data, error } = await admin.from(t.tabla).insert(insert).select(t.cols).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400, headers: CORS });
  return NextResponse.json({ data, uso: { usados: a.usados, limite: a.limite } }, { status: 201, headers: CORS });
}
