import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { getTenantFromHeaders } from "@/lib/tenant";
import { loadDashboard } from "@/lib/db/dashboard";
import { Greeting } from "./greeting";
import { OrigenChart, EtapaChart, EstadoChart, MotivosChart } from "./charts";

const TIPO_ICON: Record<string, string> = {
  llamada: "📞",
  email: "✉️",
  whatsapp: "💬",
  reunion: "📅",
  otra: "•",
};

function fmtCurrency(n: number, m: string) {
  return new Intl.NumberFormat("es", { style: "currency", currency: m, maximumFractionDigits: 0 }).format(n);
}
function fmtDateTime(iso: string | null) {
  if (!iso) return "Sin fecha";
  return new Date(iso).toLocaleString("es", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default async function DashboardPage() {
  const [user, tenant, dash] = await Promise.all([
    getSessionUser(),
    getTenantFromHeaders(),
    loadDashboard(),
  ]);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <Greeting nombre={user?.nombre ?? ""} tenant={tenant?.nombre_empresa ?? ""} />
        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
          {dash.scope === "admin" ? "Vista admin (todo el tenant)" : "Vista personal (solo tus oportunidades)"}
        </span>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Oportunidades activas"
          value={dash.kpis.oportunidades_activas.toString()}
        />
        <KpiCard
          label="Valor en pipeline"
          value={fmtCurrency(dash.kpis.valor_pipeline, dash.kpis.moneda_pipeline)}
        />
        <KpiCard
          label="Tasa de cierre"
          value={dash.kpis.win_rate != null ? `${dash.kpis.win_rate}%` : "—"}
          hint={dash.kpis.win_rate == null ? "Sin oportunidades cerradas" : "ganadas / decididas"}
        />
        <KpiCard
          label="Actividades pendientes"
          value={dash.kpis.actividades_pendientes.toString()}
        />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Origen de empresas">
          <OrigenChart data={dash.charts.origen_empresas} />
        </ChartCard>
        <ChartCard title="Oportunidades activas por etapa">
          <EtapaChart data={dash.charts.oportunidades_por_etapa} />
        </ChartCard>
        <ChartCard title="Estado de oportunidades">
          <EstadoChart data={dash.charts.estado_distribution} />
        </ChartCard>
        <ChartCard title="Motivos de pérdida (top 5)">
          <MotivosChart data={dash.charts.motivos_perdida} />
        </ChartCard>
      </section>

      {dash.actividades_proximas.length > 0 && (
        <section className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-sm font-bold uppercase text-gray-500 mb-3">Próximas actividades pendientes</h2>
          <ul className="divide-y divide-gray-100">
            {dash.actividades_proximas.map((a) => (
              <li key={a.id} className="py-2 flex items-center justify-between">
                <div>
                  <p className="text-sm">
                    <span className="mr-2">{TIPO_ICON[a.tipo] ?? "•"}</span>
                    <Link href={`/oportunidades/${a.oportunidad_id}`} className="text-brand-primary hover:underline font-medium">
                      {a.oportunidad_nombre}
                    </Link>
                    {a.descripcion && <span className="text-gray-600"> · {a.descripcion}</span>}
                  </p>
                </div>
                <span className="text-xs text-gray-500">{fmtDateTime(a.fecha_programada)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {dash.scope === "admin" && dash.asesores.length > 0 && (
        <section className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <header className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-sm font-bold uppercase text-gray-500">Desempeño por asesor</h2>
          </header>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <Th>Asesor</Th>
                <Th className="text-right">Activas</Th>
                <Th className="text-right">Ganadas</Th>
                <Th className="text-right">Perdidas</Th>
                <Th className="text-right">Tasa cierre</Th>
                <Th className="text-right">Activ. completadas</Th>
              </tr>
            </thead>
            <tbody>
              {dash.asesores.map((a) => (
                <tr key={a.id} className="border-t border-gray-100">
                  <Td className="font-medium">{a.nombre}</Td>
                  <Td className="text-right">{a.oportunidades_asignadas}</Td>
                  <Td className="text-right text-status-ok">{a.ganadas}</Td>
                  <Td className="text-right text-status-danger">{a.perdidas}</Td>
                  <Td className="text-right">{a.win_rate != null ? `${a.win_rate}%` : "—"}</Td>
                  <Td className="text-right">{a.actividades_completadas}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

function KpiCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
      <h3 className="text-sm font-bold uppercase text-gray-500 mb-3">{title}</h3>
      {children}
    </div>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-6 py-2 font-medium ${className ?? ""}`}>{children}</th>;
}
function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-6 py-2.5 ${className ?? ""}`}>{children}</td>;
}
