import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";

type TenantRow = {
  id: string;
  nombre_empresa: string | null;
  subdominio: string | null;
  plan: string | null;
  plan_id: string | null;
  estado: string | null;
  admin_email: string | null;
  creado_en: string | null;
  trial_termina_en: string | null;
  nit?: string | null;
};

export default async function CuentaPage() {
  const user = await getSessionUser();
  if (!user || user.rol !== "admin") redirect("/dashboard");
  const supabase = await createServerSupabase();
  // Pido solo columnas que sabemos que existen (sin logo_url ni dominio personalizado todavía).
  const { data: tenant } = await supabase
    .from("tenant")
    .select("id, nombre_empresa, subdominio, plan, plan_id, estado, admin_email, creado_en, trial_termina_en, nit")
    .eq("id", user.tenantId)
    .maybeSingle<TenantRow>();

  return (
    <div className="space-y-4">
      <PageHeader
        title="Cuenta de mi agencia"
        subtitle="Datos generales de tu agencia. Cambios sensibles requieren contactar a soporte."
        backHref="/ajustes"
        backLabel="Ajustes"
      />

      {!tenant ? (
        <p className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">No se pudo cargar el tenant.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">Identidad</h2>
            <dl className="space-y-2 text-sm">
              <Row k="Nombre comercial" v={tenant.nombre_empresa ?? "—"} />
              <Row k="Subdominio" v={tenant.subdominio ?? "—"} />
              <Row k="NIT / CUIT" v={tenant.nit ?? "—"} />
              <Row k="Email del administrador" v={tenant.admin_email ?? "—"} />
            </dl>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">Plan y operaciones</h2>
            <dl className="space-y-2 text-sm">
              <Row k="Plan" v={tenant.plan ?? "—"} />
              <Row k="Estado" v={tenant.estado ?? "—"} />
              <Row k="Cuenta creada" v={tenant.creado_en ? new Date(tenant.creado_en).toLocaleDateString("es") : "—"} />
              <Row k="Trial termina" v={tenant.trial_termina_en ? new Date(tenant.trial_termina_en).toLocaleDateString("es") : "—"} />
            </dl>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/ajustes/facturacion" className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">Facturación</Link>
              <Link href="/ajustes/integraciones" className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">API y webhooks</Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-gray-50 pb-2 last:border-0">
      <dt className="text-xs text-gray-500">{k}</dt>
      <dd className="text-sm font-medium text-gray-800">{v}</dd>
    </div>
  );
}
