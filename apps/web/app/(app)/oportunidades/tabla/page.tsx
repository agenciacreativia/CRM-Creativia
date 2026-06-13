import Link from "next/link";
import { listOportunidades } from "@/lib/db/oportunidades";
import { getSessionUser } from "@/lib/auth";
import { listEtiquetas, etiquetasPorEntidad } from "@/lib/db/etiquetas";
import { listVistas } from "@/lib/db/vistas";
import { getMyPermisos } from "@/lib/db/roles";
import { can } from "@/lib/permissions";
import { FilterBuilder } from "@/components/filters/filter-builder";
import { ListOrder } from "@/components/list-order";
import { ViewToggle } from "@/components/oportunidades/view-toggle";
import { getListFilterConfig, fieldsByModule } from "@/lib/filters/server";
import { decodeFilterSpec, specHasConditions } from "@/lib/filters/types";
import { rowMatches } from "@/lib/filters/evaluate";
import { sortRows } from "@/lib/filters/sort";
import { OportunidadesTable } from "./oportunidades-table";
import { ColumnPicker } from "./column-picker";
import { resolveVisibleCols } from "./columns";
import { getEditableFields } from "@/lib/bulk/editable-fields";
import { BulkActionsInline } from "@/components/bulk/bulk-actions-inline";

type SearchParams = Promise<{
  estado?: string;
  asignado?: string;
  pipeline?: string;
  cierre_desde?: string;
  cierre_hasta?: string;
  valor_min?: string;
  valor_max?: string;
  mine?: string;
  filtros?: string;
  orden?: string;
  cols?: string;
}>;

function formatCurrency(value: number | null, moneda: string): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("es", { style: "currency", currency: moneda }).format(value);
}

export default async function OportunidadesPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const user = await getSessionUser();

  const asignado = params.mine === "1" && user ? user.id : params.asignado;
  const valorMin = params.valor_min ? Number(params.valor_min) : undefined;
  const valorMax = params.valor_max ? Number(params.valor_max) : undefined;

  const spec = decodeFilterSpec(params.filtros);
  const hasAdvanced = specHasConditions(spec);

  const [rowsRaw, filterModules] = await Promise.all([
    listOportunidades({
      estado: params.estado,
      pipeline_id: params.pipeline,
      asignado_id: asignado,
      cierre_desde: params.cierre_desde,
      cierre_hasta: params.cierre_hasta,
      valor_min: Number.isFinite(valorMin as number) ? valorMin : undefined,
      valor_max: Number.isFinite(valorMax as number) ? valorMax : undefined,
      limit: hasAdvanced ? 2000 : 200,
    }),
    getListFilterConfig("oportunidad"),
  ]);
  // Campos del módulo ancla (oportunidad) para ordenar/ListOrder; el mapa por
  // módulo alimenta al motor para evaluar condiciones cross-módulo.
  const filterFields = filterModules.find((m) => m.key === "oportunidad")!.fields;
  const fbm = fieldsByModule(filterModules);
  const visibleCols = resolveVisibleCols(params.cols);

  const filtered =
    hasAdvanced && spec ? rowsRaw.filter((r) => rowMatches(r, spec, fbm, "oportunidad")) : rowsRaw;
  const rows = sortRows(filtered, params.orden, filterFields);

  const totalValor = rows
    .filter((r) => r.estado === "activo")
    .reduce((s, r) => s + (r.valor ?? 0), 0);
  const monedaPrincipal = rows[0]?.moneda ?? "USD";

  const [etiquetas, etiquetasMap, vistas, perms] = await Promise.all([
    listEtiquetas(),
    etiquetasPorEntidad("oportunidad", rows.map((r) => r.id)),
    listVistas("oportunidades"),
    getMyPermisos(),
  ]);
  const canEditar = can(perms.permisos, "oportunidades", "editar", perms.es_admin);
  const canEliminar = can(perms.permisos, "oportunidades", "eliminar", perms.es_admin);
  const editFields = canEditar ? await getEditableFields("oportunidades").catch(() => []) : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <ViewToggle active="tabla" />
          <Link
            href="/oportunidades/nueva"
            className="inline-flex items-center justify-center rounded-md bg-brand-navy px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-navy-deep"
          >
            + Nueva
          </Link>
          <BulkActionsInline
            modulo="oportunidades"
            scope="oportunidades"
            editFields={editFields}
            cols={visibleCols}
            allIds={rows.map((r) => r.id)}
            canEliminar={canEliminar}
            etiquetas={etiquetas}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-xs text-gray-500 whitespace-nowrap">
            {rows.length} resultados · {formatCurrency(totalValor, monedaPrincipal)} activos
          </p>
          <ListOrder fields={filterFields} />
          <ColumnPicker visibleCols={visibleCols} />
          <FilterBuilder modules={filterModules} entidad="oportunidades" vistas={vistas} />
        </div>
      </div>

      <OportunidadesTable
        rows={rows}
        etiquetasMap={etiquetasMap}
        visibleCols={visibleCols}
      />
    </div>
  );
}
