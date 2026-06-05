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

const TABLAS: Record<string, { tabla: string; cols: string }> = {
  contactos: { tabla: "contacto", cols: "*" },
  empresas: { tabla: "empresa", cols: "*" },
  oportunidades: { tabla: "oportunidad", cols: "*" },
  productos: { tabla: "producto", cols: "*" },
};

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
  delete body.tenant_id; delete body.id;
  const admin = createAdminSupabase();
  const { data, error } = await admin.from(t.tabla).update(body).eq("id", id).eq("tenant_id", a.tenantId).select(t.cols).single();
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
