import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getTenantFromHeaders } from "@/lib/tenant";
import { buildExport, ALL_INCLUDE, type ExportInclude } from "@/lib/export/build";
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
    // body optional — default to ALL
  }

  const bundle = await buildExport({
    include,
    tenantId: tenant.id,
    tenantName: tenant.nombre_empresa,
  });
  const body = JSON.stringify(bundle, null, 2);

  // Audit
  const supabase = await createServerSupabase();
  await supabase.from("backup_log").insert({
    tenant_id: tenant.id,
    accion: "export",
    formato: "json",
    registros: bundle.metadata.totalRecords,
    tamano_bytes: body.length,
    realizado_por: user.id,
  });

  const date = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="crm-${tenant.subdominio}-${date}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
