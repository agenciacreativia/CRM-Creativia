import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/db/api-keys";
import { createAdminSupabase } from "@/lib/supabase/admin";

/**
 * /api/v1/{modulo}/{id} — operaciones sobre un registro específico.
 *   GET    → leer
 *   PATCH  → actualizar
 *   DELETE → eliminar (soft-delete para oportunidades)
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// `writable`: allowlist de columnas actualizables vía PATCH. SEGURIDAD:
// antes el update aplicaba el body crudo (solo borrando tenant_id/id), lo que
// permitía togglear columnas internas (en_espera, eliminada_en, creado_por,
// campos_custom). Cualquier campo fuera de esta lista se descarta.
const TABLAS: Record<string, { tabla: string; cols: string; writable: string[] }> = {
  contactos: { tabla: "contacto", cols: "*", writable: ["nombre", "email", "telefono", "telefono_whatsapp", "cargo", "empresa_id", "descripcion", "origen", "asignado_id"] },
  empresas: { tabla: "empresa", cols: "*", writable: ["nombre", "email", "telefono", "sitio_web", "direccion", "ciudad", "pais", "descripcion", "estado_empresa", "origen", "asignado_id"] },
  oportunidades: { tabla: "oportunidad", cols: "*", writable: ["nombre", "valor", "moneda", "estado", "pipeline_id", "etapa_id", "contacto_id", "empresa_id", "probabilidad_cierre", "fecha_esperada_cierre", "descripcion", "asignado_id"] },
  productos: { tabla: "producto", cols: "*", writable: ["nombre", "categoria", "destino", "duracion", "precio_desde", "moneda", "descripcion", "incluye", "no_incluye", "proveedor", "activo"] },
};

function pickWritable(body: Record<string, unknown>, writable: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of writable) {
    if (body[k] !== undefined) out[k] = body[k];
  }
  return out;
}

export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: CORS }); }

async function auth(req: NextRequest) {
  const h = req.headers.get("authorization") ?? "";
  const raw = h.startsWith("Bearer ") ? h.slice(7) : "";
  return authenticateApiKey(raw);
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ modulo: string; id: string }> }) {
  const { modulo, id } = await params;
  const t = TABLAS[modulo];
  if (!t) return NextResponse.json({ error: "modulo desconocido" }, { status: 404, headers: CORS });
  const a = await auth(req);
  if (!a) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: CORS });
  const admin = createAdminSupabase();
  const { data, error } = await admin.from(t.tabla).select(t.cols).eq("id", id).eq("tenant_id", a.tenantId).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 400, headers: CORS });
  if (!data) return NextResponse.json({ error: "not found" }, { status: 404, headers: CORS });
  return NextResponse.json({ data }, { headers: CORS });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ modulo: string; id: string }> }) {
  const { modulo, id } = await params;
  const t = TABLAS[modulo];
  if (!t) return NextResponse.json({ error: "modulo desconocido" }, { status: 404, headers: CORS });
  const a = await auth(req);
  if (!a) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: CORS });
  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "invalid json" }, { status: 400, headers: CORS }); }
  const patch = pickWritable(body, t.writable);
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "no hay campos actualizables en el body" }, { status: 400, headers: CORS });
  }
  const admin = createAdminSupabase();
  const { data, error } = await admin.from(t.tabla).update(patch).eq("id", id).eq("tenant_id", a.tenantId).select(t.cols).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400, headers: CORS });
  return NextResponse.json({ data, uso: { usados: a.usados, limite: a.limite } }, { headers: CORS });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ modulo: string; id: string }> }) {
  const { modulo, id } = await params;
  const t = TABLAS[modulo];
  if (!t) return NextResponse.json({ error: "modulo desconocido" }, { status: 404, headers: CORS });
  const a = await auth(req);
  if (!a) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: CORS });
  const admin = createAdminSupabase();
  if (modulo === "oportunidades") {
    const { error } = await admin.from("oportunidad").update({ estado: "eliminado" }).eq("id", id).eq("tenant_id", a.tenantId);
    if (error) return NextResponse.json({ error: error.message }, { status: 400, headers: CORS });
    return NextResponse.json({ data: { id, soft_delete: true } }, { headers: CORS });
  }
  const { error } = await admin.from(t.tabla).delete().eq("id", id).eq("tenant_id", a.tenantId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400, headers: CORS });
  return NextResponse.json({ data: { id, deleted: true } }, { headers: CORS });
}
