import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getTenantFromHeaders } from "@/lib/tenant";
import { createServerSupabase } from "@/lib/supabase/server";
import { rowsToCsv } from "@/lib/export/build";

export const dynamic = "force-dynamic";

const ALLOWED = new Set([
  "empresa",
  "contacto",
  "oportunidad",
  "actividad",
  "nota",
  "sede",
  "pipeline",
  "etapa_pipeline",
  "motivo_perdida",
  "campo_personalizado",
]);

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (user.rol !== "admin")
    return NextResponse.json({ error: "Solo admin puede exportar" }, { status: 403 });

  const tenant = await getTenantFromHeaders();
  if (!tenant) return NextResponse.json({ error: "Tenant no resuelto" }, { status: 400 });

  const url = new URL(request.url);
  const table = url.searchParams.get("table") ?? "empresa";
  if (!ALLOWED.has(table)) {
    return NextResponse.json({ error: "Tabla no permitida" }, { status: 400 });
  }

  const supabase = await createServerSupabase();
  const { data, error } = await supabase.from(table).select("*").limit(10000);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const csv = rowsToCsv((data ?? []) as Array<Record<string, unknown>>);

  // Audit
  await supabase.from("backup_log").insert({
    tenant_id: tenant.id,
    accion: "export",
    formato: "csv",
    registros: { [table]: data?.length ?? 0 },
    tamano_bytes: csv.length,
    realizado_por: user.id,
  });

  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${table}-${tenant.subdominio}-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
