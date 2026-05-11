import { getSessionUser } from "@/lib/auth";
import { getTenantFromHeaders } from "@/lib/tenant";
import { Greeting } from "./greeting";

export default async function DashboardPage() {
  const [user, tenant] = await Promise.all([
    getSessionUser(),
    getTenantFromHeaders(),
  ]);

  return (
    <div className="space-y-6">
      <Greeting nombre={user?.nombre ?? ""} tenant={tenant?.nombre_empresa ?? ""} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="kpi.opportunities_active" value="—" />
        <KpiCard label="kpi.pipeline_value" value="—" />
        <KpiCard label="kpi.win_rate" value="—" />
        <KpiCard label="kpi.pending_activities" value="—" />
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <p className="text-sm text-gray-500">
          Sprint 1 — infra multi-tenant lista. Las métricas reales y gráficos llegan en Sprint 5.
        </p>
      </div>
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
      <KpiLabel labelKey={label} />
      <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  );
}

function KpiLabel({ labelKey }: { labelKey: string }) {
  // Server component fallback (i18n is client-side for now)
  const fallback: Record<string, string> = {
    "kpi.opportunities_active": "Oportunidades activas",
    "kpi.pipeline_value": "Valor en pipeline",
    "kpi.win_rate": "Tasa de cierre",
    "kpi.pending_activities": "Actividades pendientes",
  };
  return <p className="text-xs uppercase tracking-wide text-gray-500">{fallback[labelKey]}</p>;
}
