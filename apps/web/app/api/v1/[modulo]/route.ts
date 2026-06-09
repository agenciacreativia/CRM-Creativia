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

const TABLAS: Record<string, { tabla: string; cols: string; required: string[] }> = {
  contactos: { tabla: "contacto", cols: "id, nombre, email, telefono, empresa_id, creado_en", required: ["nombre", "email"] },
  empresas: { tabla: "empresa", cols: "id, nombre, estado_empresa, telefono, creado_en", required: ["nombre"] },
  oportunidades: { tabla: "oportunidad", cols: "id, nombre, valor, moneda, estado, pipeline_id, etapa_id, contacto_id, empresa_id, creado_en", required: ["nombre", "contacto_id", "empresa_id"] },
  productos: { tabla: "producto", cols: "id, nombre, categoria, destino, precio_desde, moneda, activo, creado_en", required: ["nombre"] },
};

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
  // Rate limit consume cuenta sólo para escrituras; lectura sólo informativo
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

  const admin = createAdminSupabase();

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
    const insertHeld: Record<string, unknown> = { tenant_id: a.tenantId, en_espera: true, ...body };
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
  const insert: Record<string, unknown> = { tenant_id: a.tenantId, ...body };
  const { data, error } = await admin.from(t.tabla).insert(insert).select(t.cols).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400, headers: CORS });
  return NextResponse.json({ data, uso: { usados: a.usados, limite: a.limite } }, { status: 201, headers: CORS });
}
