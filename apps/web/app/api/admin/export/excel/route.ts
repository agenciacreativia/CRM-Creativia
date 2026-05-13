import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getTenantFromHeaders } from "@/lib/tenant";
import {
  buildExport,
  bundleToExcel,
  ALL_INCLUDE,
  type ExportInclude,
} from "@/lib/export/build";
import { createServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (user.rol !== "admin")
    return NextResponse.json({ error: "Solo admin puede exportar" }, { status: 403 });

  const tenant = await getTenantFromHeaders();
  if (!tenant) return NextResponse.json({ error: "Tenant no resuelto" }, { status: 400 });

  let include: ExportInclude = ALL_INCLUDE;
  try {
    const body = (await request.json()) as { include?: Partial<ExportInclude> };
    if (body.include) include = { ...ALL_INCLUDE, ...body.include };
  } catch {
    // empty body OK
  }

  const bundle = await buildExport({
    include,
    tenantId: tenant.id,
    tenantName: tenant.nombre_empresa,
  });
  const buffer = bundleToExcel(bundle);

  const supabase = await createServerSupabase();
  await supabase.from("backup_log").insert({
    tenant_id: tenant.id,
    accion: "export",
    formato: "json", // schema enum only allows json|csv; reuse json for excel for now
    registros: { ...bundle.metadata.totalRecords, _formato: "xlsx" } as Record<string, unknown>,
    tamano_bytes: buffer.length,
    realizado_por: user.id,
  });

  const date = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="crm-${tenant.subdominio}-${date}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
