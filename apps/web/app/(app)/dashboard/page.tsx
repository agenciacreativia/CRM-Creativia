import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { getTenantFromHeaders } from "@/lib/tenant";
import { loadDashboard } from "@/lib/db/dashboard";
import { Greeting } from "./greeting";
import {
  OrigenChart,
  EtapaChart,
  MotivosChart,
  ForecastChart,
  EmbudoChart,
} from "./charts";

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

  const { atencion, forecast, embudo } = dash;
  const totalAtencion =
    atencion.actividades_vencidas.length +
    atencion.oportunidades_estancadas.length +
    atencion.oportunidades_sin_actividad.length;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <Greeting nombre={user?.nombre ?? ""} tenant={tenant?.nombre_empresa ?? ""} />
        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
          {dash.scope === "admin" ? "Vista admin (todo el tenant)" : "Vista personal (solo tus oportunidades)"}
        </span>
      </header>

      {/* ---------- KPIs ---------- */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <KpiCard
          label="Valor en pipeline"
          value={fmtCurrency(dash.kpis.valor_pipeline, dash.kpis.moneda_pipeline)}
        />
        <KpiCard
          label="Oportunidades activas"
          value={dash.kpis.oportunidades_activas.toString()}
          href="/oportunidades/tabla?estado=activo"
        />
        <KpiCard
          label="Tasa de cierre"
          value={dash.kpis.win_rate != null ? `${dash.kpis.win_rate}%` : "—"}
          hint={dash.kpis.win_rate == null ? "Sin oportunidades cerradas" : "ganadas / decididas"}
        />
        <KpiCard
          label="Actividades pendientes"
          value={dash.kpis.actividades_pendientes.toString()}
          href="#actividades-pendientes"
        />
      </section>

      {/* ---------- Bloque A: Mi atención hoy ---------- */}
      {totalAtencion > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500">
            Mi atención hoy
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <AtencionCard
              accent="orange"
              title="Actividades vencidas"
              count={atencion.actividades_vencidas.length}
              empty="No tienes actividades vencidas. 🎉"
            >
              {atencion.actividades_vencidas.slice(0, 5).map((a) => (
                <AtencionRow
                  key={a.id}
                  href={`/oportunidades/${a.oportunidad_id}`}
                  primary={
                    <>
                      <span className="mr-1.5">{TIPO_ICON[a.tipo] ?? "•"}</span>
                      {a.oportunidad_nombre}
                    </>
                  }
                  secondary={a.descripcion}
                  meta={fmtDateTime(a.fecha_programada)}
                  metaTone="danger"
                />
              ))}
            </AtencionCard>

            <AtencionCard
              accent="orange"
              title="Oportunidades estancadas"
              count={atencion.oportunidades_estancadas.length}
              empty="Todo dentro de los plazos. 🚀"
              hint="Pasaron el límite de su etapa"
            >
              {atencion.oportunidades_estancadas.slice(0, 5).map((o) => (
                <AtencionRow
                  key={o.id}
                  href={`/oportunidades/${o.id}`}
                  primary={o.nombre}
                  secondary={`${o.empresa_nombre} · ${o.etapa_nombre}`}
                  meta={`${o.dias_en_etapa}d (máx ${o.dias_maximo}d)`}
                  metaTone="danger"
                />
              ))}
            </AtencionCard>

            <AtencionCard
              accent="navy"
              title="Sin actividad reciente"
              count={atencion.oportunidades_sin_actividad.length}
              empty="Todas las oportunidades tienen contacto reciente."
              hint="14+ días sin contacto"
            >
              {atencion.oportunidades_sin_actividad.slice(0, 5).map((o) => (
                <AtencionRow
                  key={o.id}
                  href={`/oportunidades/${o.id}`}
                  primary={o.nombre}
                  secondary={o.empresa_nombre}
                  meta={`${o.dias_sin_actividad}d sin contacto`}
                  metaTone="muted"
                />
              ))}
            </AtencionCard>
          </div>
        </section>
      )}

      {/* ---------- Bloque B: Forecast ---------- */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500">
          Forecast
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <ForecastKpi
            label="Cierra este mes"
            value={fmtCurrency(forecast.valor_mes_actual, forecast.moneda)}
            sub={`${forecast.cuenta_mes_actual} oportunidad${forecast.cuenta_mes_actual === 1 ? "" : "es"}`}
          />
          <ForecastKpi
            label="Cierra esta semana"
            value={fmtCurrency(forecast.valor_semana, forecast.moneda)}
            sub={`${forecast.cuenta_semana} oportunidad${forecast.cuenta_semana === 1 ? "" : "es"}`}
          />
          <ForecastKpi
            label="Tiempo promedio de cierre"
            value={forecast.velocidad_dias != null ? `${forecast.velocidad_dias} días` : "—"}
            sub={forecast.velocidad_dias != null ? "ganadas (últimos 12 meses)" : "Sin ganadas históricas"}
          />
        </div>
        <div className="bg-white p-6 card-stripe-green">
          <h3 className="text-sm font-bold uppercase text-gray-500 mb-4 tracking-widest">
            Valor esperado (próximos 3 meses)
          </h3>
          <ForecastChart data={forecast.por_mes} moneda={forecast.moneda} />
        </div>
      </section>

      {/* ---------- Bloque C: Embudo de conversión ---------- */}
      {embudo.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500">
            Embudo de conversión
          </h2>
          <div className="bg-white p-6 card-stripe-navy">
            <div className="flex items-baseline justify-between mb-4">
              <h3 className="text-sm font-bold uppercase text-gray-500 tracking-widest">
                Pipeline · {dash.embudo_pipeline_nombre}
              </h3>
              <span className="text-xs text-gray-400">
                Una oportunidad cuenta en cada etapa por la que pasó
              </span>
            </div>
            <EmbudoChart data={embudo} />
          </div>
        </section>
      )}

      {/* ---------- Gráficos clásicos ---------- */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Origen de empresas" accent="sky">
          <OrigenChart data={dash.charts.origen_empresas} />
        </ChartCard>
        <ChartCard title="Oportunidades activas por etapa" accent="navy">
          <EtapaChart data={dash.charts.oportunidades_por_etapa} />
        </ChartCard>
        <ChartCard title="Motivos de pérdida (top 5)" accent="orange">
          <MotivosChart data={dash.charts.motivos_perdida} />
        </ChartCard>
      </section>

      {/* ---------- Próximas actividades pendientes ---------- */}
      {dash.actividades_proximas.length > 0 && (
        <section id="actividades-pendientes" className="bg-white border border-gray-200 rounded-lg p-6 scroll-mt-20">
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

      {/* ---------- Desempeño por asesor (admin) ---------- */}
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

function KpiCard({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: string;
  hint?: string;
  href?: string;
}) {
  const inner = (
    <>
      <p className="text-xs uppercase tracking-widest opacity-80">{label}</p>
      <p className="text-4xl font-bold mt-2">{value}</p>
      {hint && <p className="text-xs opacity-70 mt-2">{hint}</p>}
    </>
  );
  if (href) {
    return (
      <Link
        href={href}
        className="card-featured p-6 block hover:-translate-y-0.5 transition cursor-pointer"
      >
        {inner}
      </Link>
    );
  }
  return <div className="card-featured p-6">{inner}</div>;
}

function ForecastKpi({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-white p-6 card-stripe-green">
      <p className="text-xs uppercase tracking-widest text-gray-500">{label}</p>
      <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
      <p className="text-xs text-gray-500 mt-1.5">{sub}</p>
    </div>
  );
}

function ChartCard({
  title,
  accent,
  children,
}: {
  title: string;
  accent?: "navy" | "green" | "orange" | "sky";
  children: React.ReactNode;
}) {
  const stripeClass = accent ? ` card-stripe-${accent}` : "";
  return (
    <div className={`bg-white p-6${stripeClass}`}>
      <h3 className="text-sm font-bold uppercase text-gray-500 mb-4 tracking-widest">{title}</h3>
      {children}
    </div>
  );
}

function AtencionCard({
  title,
  count,
  empty,
  hint,
  accent,
  children,
}: {
  title: string;
  count: number;
  empty: string;
  hint?: string;
  accent: "navy" | "green" | "orange" | "sky";
  children: React.ReactNode;
}) {
  return (
    <div className={`bg-white p-5 card-stripe-${accent} flex flex-col`}>
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-sm font-bold uppercase text-gray-500 tracking-widest">{title}</h3>
        <span className="text-2xl font-bold text-gray-900 leading-none">{count}</span>
      </div>
      {hint && <p className="text-xs text-gray-400 -mt-2 mb-3">{hint}</p>}
      {count === 0 ? (
        <p className="text-xs text-gray-400 py-2">{empty}</p>
      ) : (
        <ul className="divide-y divide-gray-100 flex-1">{children}</ul>
      )}
    </div>
  );
}

function AtencionRow({
  href,
  primary,
  secondary,
  meta,
  metaTone,
}: {
  href: string;
  primary: React.ReactNode;
  secondary?: React.ReactNode;
  meta: string;
  metaTone?: "danger" | "muted";
}) {
  return (
    <li className="py-2">
      <Link href={href} className="block group">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm text-gray-900 truncate group-hover:underline">{primary}</p>
            {secondary && (
              <p className="text-xs text-gray-500 truncate mt-0.5">{secondary}</p>
            )}
          </div>
          <span
            className={
              metaTone === "danger"
                ? "text-xs text-status-danger font-medium shrink-0"
                : "text-xs text-gray-400 shrink-0"
            }
          >
            {meta}
          </span>
        </div>
      </Link>
    </li>
  );
}

function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <th className={`px-6 py-2 font-medium ${className ?? ""}`}>{children}</th>;
}
function Td({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <td className={`px-6 py-2.5 ${className ?? ""}`}>{children}</td>;
}
