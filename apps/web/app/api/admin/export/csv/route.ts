import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getTenantFromHeaders } from "@/lib/tenant";
import { createServerSupabase } from "@/lib/supabase/server";
import { rowsToCsv, rowsToExcel } from "@/lib/export/build";

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
  const format = (url.searchParams.get("format") ?? "csv").toLowerCase();
  if (!ALLOWED.has(table)) {
    return NextResponse.json({ error: "Tabla no permitida" }, { status: 400 });
  }

  const supabase = await createServerSupabase();
  const { data, error } = await supabase.from(table).select("*").limit(10000);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data ?? []) as Array<Record<string, unknown>>;
  const date = new Date().toISOString().slice(0, 10);

  let body: string | Buffer;
  let contentType: string;
  let filename: string;

  if (format === "xlsx") {
    body = rowsToExcel(rows, table);
    contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    filename = `${table}-${tenant.subdominio}-${date}.xlsx`;
  } else {
    body = rowsToCsv(rows);
    contentType = "text/csv; charset=utf-8";
    filename = `${table}-${tenant.subdominio}-${date}.csv`;
  }

  await supabase.from("backup_log").insert({
    tenant_id: tenant.id,
    accion: "export",
    formato: format === "xlsx" ? "json" : "csv", // enum only json|csv; treat xlsx as json-family
    registros: { [table]: rows.length, _formato: format } as Record<string, unknown>,
    tamano_bytes: body.length,
    realizado_por: user.id,
  });

  return new NextResponse(body as BodyInit, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
