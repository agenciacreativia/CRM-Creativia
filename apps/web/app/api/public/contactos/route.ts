import { NextRequest, NextResponse } from "next/server";
import { tenantIdFromApiKey } from "@/lib/db/api-keys";
import { createAdminSupabase } from "@/lib/supabase/admin";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

async function auth(req: NextRequest): Promise<string | null> {
  const h = req.headers.get("authorization") ?? "";
  const raw = h.startsWith("Bearer ") ? h.slice(7) : "";
  return tenantIdFromApiKey(raw);
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(req: NextRequest) {
  const tenantId = await auth(req);
  if (!tenantId) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: CORS });
  const admin = createAdminSupabase();
  const limit = Math.min(100, Number(req.nextUrl.searchParams.get("limit") ?? "50"));
  const { data, error } = await admin
    .from("contacto")
    .select("id, nombre, email, telefono, empresa_id, creado_en")
    .eq("tenant_id", tenantId)
    .order("creado_en", { ascending: false })
    .limit(limit);
  if (error) return NextResponse.json({ error: error.message }, { status: 400, headers: CORS });
  return NextResponse.json({ data }, { headers: CORS });
}

export async function POST(req: NextRequest) {
  const tenantId = await auth(req);
  if (!tenantId) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: CORS });
  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "invalid json" }, { status: 400, headers: CORS }); }

  const nombre = String(body.nombre ?? "").trim();
  const email = String(body.email ?? "").trim();
  if (!nombre || !email) return NextResponse.json({ error: "nombre y email son obligatorios" }, { status: 400, headers: CORS });

  const admin = createAdminSupabase();
  // Find or create a default "API" company for unattached contacts.
  let empresaId: string;
  const { data: emp } = await admin.from("empresa").select("id").eq("tenant_id", tenantId).ilike("nombre", "API").maybeSingle();
  if (emp) empresaId = emp.id as string;
  else {
    const { data: created, error } = await admin
      .from("empresa").insert({ tenant_id: tenantId, nombre: "API", estado_empresa: "prospecto" }).select("id").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400, headers: CORS });
    empresaId = created.id as string;
  }
  const { data, error } = await admin
    .from("contacto")
    .insert({
      tenant_id: tenantId, empresa_id: empresaId, nombre, email,
      telefono: body.telefono ? String(body.telefono) : null,
    })
    .select("id, nombre, email")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400, headers: CORS });
  return NextResponse.json({ data }, { status: 201, headers: CORS });
}
