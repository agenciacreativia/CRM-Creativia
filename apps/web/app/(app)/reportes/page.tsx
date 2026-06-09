import { loadDashboard } from "@/lib/db/dashboard";
import { listAtribucionPorEstrategia } from "@/lib/db/atribucion";
import { getCampaniasPerf } from "@/lib/db/campanias-perf";
import { listProductos } from "@/lib/db/productos";
import { listUsuarios } from "@/lib/db/usuarios";
import { listPipelines } from "@/lib/db/pipelines";
import { ReportesFiltersBar } from "./filters-bar";
import { ExportCsvButton } from "./export-button";
import { BarsAsesores, PieMotivos, LineForecast, BarsEmbudo } from "./charts";
import { PageHeader } from "@/components/ui/page-header";

type SearchParams = Promise<{ pipeline?: string; producto?: string; asesor?: string; desde?: string; hasta?: string }>;

function money(v: number, m: string) {
  return new Intl.NumberFormat("es", { style: "currency", currency: m, maximumFractionDigits: 0 }).format(v);
}

export default async function ReportesPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  // Filtros compartidos entre todos los cuadros del dashboard:
  // pipeline, asesor, desde, hasta van a loadDashboard / atribucion / campanias-perf.
  // producto todavía no se aplica (es una dimensión sin tabla puente con oportunidad_id directa).
  const sharedFilters = {
    pipeline: params.pipeline || undefined,
    asesor: params.asesor || undefined,
    desde: params.desde || undefined,
    hasta: params.hasta || undefined,
  };
  const [d, atribucion, pipelines, productos, usuarios, campanias] = await Promise.all([
    loadDashboard(sharedFilters),
    listAtribucionPorEstrategia(sharedFilters),
    listPipelines(),
    listProductos({ soloActivos: true }),
    listUsuarios({ activo: "activos" }),
    getCampaniasPerf(sharedFilters),
  ]);
  const moneda = d.kpis.moneda_pipeline;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reportes"
        subtitle={`Métricas de ventas y actividad${d.scope === "me" ? " (tus oportunidades)" : " del equipo"}. Exportá cada tabla a CSV.`}
      />

      <ReportesFiltersBar
        pipelines={pipelines.map((p) => ({ id: p.id, nombre: p.nombre }))}
        productos={productos.map((p) => ({ id: p.id, nombre: p.nombre }))}
        asesores={usuarios.map((u) => ({ id: u.id, nombre: u.nombre }))}
        activos={params}
      />
      {params.producto && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">
          ⚠️ El filtro por producto se aplica solo a la tabla de campañas UTM. Para filtrar por producto en KPIs/embudo se necesita el join oportunidad_producto en cada query — próxima iteración.
        </div>
      )}
      {(params.pipeline || params.asesor || params.desde || params.hasta) && (
        <div className="rounded-md border border-green-200 bg-green-50 px-4 py-2 text-xs text-green-800">
          ✓ Filtros aplicados: KPIs, embudo (pipeline elegido), atribución, asesores, forecast y campañas.
        </div>
      )}

      {/* KPIs rápidos */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Valor en embudo" value={money(d.kpis.valor_pipeline, moneda)} />
        <Kpi label="Oportunidades activas" value={String(d.kpis.oportunidades_activas)} />
        <Kpi label="Tasa de cierre" value={d.kpis.win_rate != null ? `${d.kpis.win_rate}%` : "—"} />
        <Kpi label="Velocidad de cierre" value={d.forecast.velocidad_dias != null ? `${d.forecast.velocidad_dias} días` : "—"} />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {d.asesores.length > 0 && (
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="mb-2 text-sm font-bold uppercase text-gray-500">Asesores — Ganadas vs Perdidas</h2>
            <BarsAsesores data={d.asesores.map((a) => ({ nombre: a.nombre, ganadas: a.ganadas, perdidas: a.perdidas }))} />
          </div>
        )}
        {d.embudo.length > 0 && (
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="mb-2 text-sm font-bold uppercase text-gray-500">Embudo — Alcance por etapa</h2>
            <BarsEmbudo data={d.embudo.map((e) => ({ nombre: e.nombre, alcanzaron: e.alcanzaron }))} />
          </div>
        )}
        {d.forecast.por_mes.length > 0 && (
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="mb-2 text-sm font-bold uppercase text-gray-500">Pronóstico de cierre</h2>
            <LineForecast data={d.forecast.por_mes.map((m) => ({ mes: m.mes, valor: m.valor }))} />
          </div>
        )}
        {d.charts.motivos_perdida.length > 0 && (
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="mb-2 text-sm font-bold uppercase text-gray-500">Motivos de pérdida</h2>
            <PieMotivos data={d.charts.motivos_perdida} />
          </div>
        )}
      </div>

      {/* Desempeño por asesor */}
      {d.asesores.length > 0 && (
        <Section
          title="Desempeño por asesor"
          exportName="desempeno-asesores.csv"
          rows={d.asesores.map((a) => ({
            Asesor: a.nombre,
            Asignadas: a.oportunidades_asignadas,
            Ganadas: a.ganadas,
            Perdidas: a.perdidas,
            "Tasa cierre %": a.win_rate ?? "",
            "Actividades hechas": a.actividades_completadas,
          }))}
          head={["Asesor", "Asignadas", "Ganadas", "Perdidas", "Tasa cierre", "Actividades"]}
          body={d.asesores.map((a) => [
            a.nombre,
            String(a.oportunidades_asignadas),
            String(a.ganadas),
            String(a.perdidas),
            a.win_rate != null ? `${a.win_rate}%` : "—",
            String(a.actividades_completadas),
          ])}
        />
      )}

      {/* Embudo de conversión */}
      {d.embudo.length > 0 && (
        <Section
          title={`Embudo de conversión${d.embudo_pipeline_nombre ? ` · ${d.embudo_pipeline_nombre}` : ""}`}
          exportName="embudo.csv"
          rows={d.embudo.map((e) => ({
            Etapa: e.nombre,
            Alcanzaron: e.alcanzaron,
            "Conversión %": e.conversion_pct ?? "",
          }))}
          head={["Etapa", "Alcanzaron", "Conversión vs. anterior"]}
          body={d.embudo.map((e) => [e.nombre, String(e.alcanzaron), e.conversion_pct != null ? `${e.conversion_pct}%` : "—"])}
        />
      )}

      {/* Forecast por mes */}
      {d.forecast.por_mes.length > 0 && (
        <Section
          title="Pronóstico de cierre (próximos meses)"
          exportName="forecast.csv"
          rows={d.forecast.por_mes.map((m) => ({ Mes: m.mes, Valor: m.valor }))}
          head={["Mes", "Valor esperado"]}
          body={d.forecast.por_mes.map((m) => [m.mes, money(m.valor, moneda)])}
        />
      )}

      {/* Motivos de pérdida */}
      {d.charts.motivos_perdida.length > 0 && (
        <Section
          title="Motivos de pérdida"
          exportName="motivos-perdida.csv"
          rows={d.charts.motivos_perdida.map((m) => ({ Motivo: m.name, Cantidad: m.value }))}
          head={["Motivo", "Cantidad"]}
          body={d.charts.motivos_perdida.map((m) => [m.name, String(m.value)])}
        />
      )}

      {atribucion.length > 0 && (
        <Section
          title="Atribución por estrategia comercial"
          exportName="atribucion-estrategia.csv"
          rows={atribucion.map((r) => ({
            Estrategia: r.label, Oportunidades: r.cuenta, Ganadas: r.ganadas, Perdidas: r.perdidas,
            "Tasa cierre %": r.tasa_cierre ?? "", Valor: r.valor,
          }))}
          head={["Estrategia", "Oportunidades", "Ganadas", "Perdidas", "Tasa cierre", "Valor"]}
          body={atribucion.map((r) => [
            r.label, String(r.cuenta), String(r.ganadas), String(r.perdidas),
            r.tasa_cierre != null ? `${r.tasa_cierre}%` : "—", money(r.valor, moneda),
          ])}
        />
      )}

      {campanias.length > 0 && (
        <Section
          title="Desempeño de campañas (UTM)"
          exportName="desempeno-campanias.csv"
          rows={campanias.map((c) => ({
            Source: c.source, Medium: c.medium, Campaign: c.campaign,
            Oportunidades: c.oportunidades, Ganadas: c.ganadas,
            "Tasa %": c.tasa ?? "", Valor: c.valor,
          }))}
          head={["Source", "Medium", "Campaign", "Oportunidades", "Ganadas", "Tasa cierre", "Valor"]}
          body={campanias.map((c) => [
            c.source, c.medium, c.campaign,
            String(c.oportunidades), String(c.ganadas),
            c.tasa != null ? `${c.tasa}%` : "—", money(c.valor, moneda),
          ])}
        />
      )}
      <p className="text-xs text-gray-400">UTM: cargá <code>utm_source</code>, <code>utm_medium</code>, <code>utm_campaign</code>, <code>utm_content</code> y <code>utm_term</code> en cada oportunidad para alimentar este reporte (campos predictivos con autocompletado disponibles en la edición de la oportunidad).</p>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  // Si el valor es "—" mostramos tooltip explicando por qué falta el dato
  const esVacio = value === "—";
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p
        className={`mt-1 text-xl font-bold ${esVacio ? "cursor-help text-gray-400" : "text-gray-900"}`}
        title={esVacio ? "Sin datos suficientes para calcular este valor" : undefined}
      >
        {value}
      </p>
    </div>
  );
}

function Section({
  title,
  exportName,
  rows,
  head,
  body,
}: {
  title: string;
  exportName: string;
  rows: Record<string, string | number | null>[];
  head: string[];
  body: string[][];
}) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
        <h2 className="text-sm font-bold uppercase text-gray-500">{title}</h2>
        <ExportCsvButton filename={exportName} rows={rows} />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              {head.map((h, i) => (
                <th key={h} className={`px-5 py-2 font-medium ${i === 0 ? "" : "text-right"}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {body.map((row, ri) => (
              <tr key={ri} className="border-t border-gray-100">
                {row.map((cell, ci) => {
                  // Tooltip explicativo cuando el valor es "—" (sin datos suficientes para calcularlo)
                  const esVacio = cell === "—";
                  return (
                    <td
                      key={ci}
                      className={`px-5 py-2.5 ${ci === 0 ? "font-medium text-gray-900" : "text-right text-gray-700"}`}
                      title={esVacio ? "Sin datos suficientes para calcular este valor" : undefined}
                    >
                      {esVacio ? <span className="cursor-help text-gray-400">{cell}</span> : cell}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
