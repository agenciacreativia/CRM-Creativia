import Link from "next/link";
import { Plus, MapPin, User } from "lucide-react";
import { listEmpresas } from "@/lib/db/empresas";
import { FilterBuilder } from "@/components/filters/filter-builder";
import { QuickSearch } from "@/components/filters/quick-search";
import { ListOrder } from "@/components/list-order";
import { getListFilterConfig, fieldsByModule } from "@/lib/filters/server";
import { listVistas } from "@/lib/db/vistas";
import { decodeFilterSpec, specHasConditions } from "@/lib/filters/types";
import { rowMatches } from "@/lib/filters/evaluate";
import { sortRows } from "@/lib/filters/sort";
import { Badge } from "@/components/ui/badge";
import { getMyPermisos } from "@/lib/db/roles";
import { can } from "@/lib/permissions";
import { BulkRowCheckbox, BulkSelectAllCheckbox } from "@/components/bulk/selection-store";
import { BulkActionsInline } from "@/components/bulk/bulk-actions-inline";
import { ColumnPicker } from "@/components/tabla/column-picker";
import { EMPRESA_COLUMNS, resolveEmpresaCols } from "./tabla/columns";
import { getEditableFields } from "@/lib/bulk/editable-fields";

type SearchParams = Promise<{ filtros?: string; orden?: string; q?: string; cols?: string }>;

const ESTADO_BADGE: Record<string, "info" | "success" | "default"> = {
  prospecto: "info",
  cliente: "success",
  inactivo: "default",
};

function quickMatch(r: { nombre: string; ciudad?: string | null; asignado_nombre?: string | null }, q: string) {
  const n = q.toLowerCase();
  return (
    r.nombre.toLowerCase().includes(n) ||
    (r.ciudad ?? "").toLowerCase().includes(n) ||
    (r.asignado_nombre ?? "").toLowerCase().includes(n)
  );
}

export default async function EmpresasPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const spec = decodeFilterSpec(params.filtros);
  const hasAdvanced = specHasConditions(spec);
  const q = params.q?.trim() ?? "";

  // Limite de filas a traer del backend. Cuando hay filtros avanzados subimos el tope
  // para evaluarlos en memoria, pero seguimos siendo finitos: detectamos si tocamos el
  // tope para avisar al usuario que los resultados pueden estar incompletos.
  const fetchLimit = hasAdvanced || q ? 2000 : 200;
  const [rowsRaw, filterModules, perms, vistas] = await Promise.all([
    listEmpresas({ limit: fetchLimit }),
    getListFilterConfig("empresa"),
    getMyPermisos(),
    listVistas("empresas"),
  ]);
  const filterFields = filterModules.find((m) => m.key === "empresa")!.fields;
  const fbm = fieldsByModule(filterModules);
  const puedeEditarMasivo = can(perms.permisos, "empresas", "editar", perms.es_admin);
  const editFields = puedeEditarMasivo ? await getEditableFields("empresas").catch(() => []) : [];
  const truncated = (hasAdvanced || q) && rowsRaw.length >= fetchLimit;
  const puedeCrear = can(perms.permisos, "empresas", "crear", perms.es_admin);

  let filtered = hasAdvanced && spec ? rowsRaw.filter((r) => rowMatches(r, spec, fbm, "empresa")) : rowsRaw;
  if (q) filtered = filtered.filter((r) => quickMatch(r, q));
  const rows = sortRows(filtered, params.orden, filterFields);

  const visibleCols = resolveEmpresaCols(params.cols);
  const cols = EMPRESA_COLUMNS.filter((c) => visibleCols.includes(c.key));

  return (
    <div className="space-y-4">
      {/* Toolbar estándar: izquierda = buscar + crear; derecha = contador +
          orden + columnas + filtros. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <QuickSearch placeholder="Buscar empresa…" />
          {puedeCrear && (
            <Link
              href="/empresas/nueva"
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md bg-brand-navy px-3 text-sm font-semibold text-white hover:bg-brand-navy-deep"
            >
              <Plus className="h-4 w-4" /> Nueva empresa
            </Link>
          )}
          {puedeEditarMasivo && (
            <BulkActionsInline
              modulo="empresas"
              scope="empresas"
              editFields={editFields}
              cols={visibleCols}
              allIds={rows.map((r) => r.id)}
            />
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="whitespace-nowrap text-xs text-gray-500">{rows.length} resultados</p>
          <ListOrder fields={filterFields} />
          <ColumnPicker columns={EMPRESA_COLUMNS.map((c) => ({ key: c.key, label: c.label, fixed: c.fixed }))} visibleCols={visibleCols} />
          <FilterBuilder modules={filterModules} entidad="empresas" vistas={vistas} />
        </div>
      </div>

      {truncated && (
        <div
          role="alert"
          className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800"
        >
          Mostrando los primeros {fetchLimit} registros. Aplicá filtros más específicos para
          asegurar resultados completos.
        </div>
      )}

      {/* === DESKTOP/TABLET ≥md: tabla === */}
      <div className="hidden md:block bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
            <tr>
              {puedeEditarMasivo && (
                <Th className="w-8"><BulkSelectAllCheckbox scope="empresas" ids={rows.map((r) => r.id)} /></Th>
              )}
              {cols.map((c) => (
                <Th key={c.key} className={`font-bold ${c.align === "right" ? "text-right" : ""}`}>{c.label}</Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={cols.length + (puedeEditarMasivo ? 1 : 0)} className="text-center text-gray-500 py-8">
                  {q
                    ? <>No hay empresas que coincidan con <strong>{q}</strong>.</>
                    : <>No hay empresas todavía. Importá tu base desde <Link href="/admin/datos/importar" className="text-brand-primary hover:underline">Datos → Importar</Link> o creá una nueva.</>}
                </td>
              </tr>
            )}
            {rows.map((e) => (
              <tr key={e.id} className={`border-t border-gray-100 transition-colors hover:bg-gray-50`}>
                {puedeEditarMasivo && (
                  <Td className="text-center"><BulkRowCheckbox id={e.id} scope="empresas" /></Td>
                )}
                {cols.map((c) => (
                  <Td key={c.key} className={c.align === "right" ? "text-right" : ""}>{c.render(e)}</Td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* === MOBILE <md: cards apiladas === */}
      <div className="md:hidden space-y-2">
        {rows.length === 0 && (
          <div className="rounded-lg border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
            {q
              ? <>No hay empresas que coincidan con <strong>{q}</strong>.</>
              : <>No hay empresas todavía. Importá desde <Link href="/admin/datos/importar" className="text-brand-primary hover:underline">Datos → Importar</Link> o creá una nueva.</>}
          </div>
        )}
        {rows.map((e) => (
          <div key={e.id} className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 active:bg-gray-50">
            {puedeEditarMasivo && (
              <div className="shrink-0">
                <BulkRowCheckbox id={e.id} scope="empresas" />
              </div>
            )}
            <Link href={`/empresas/${e.id}`} className="flex flex-1 min-w-0 flex-col gap-1">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-semibold text-gray-900">{e.nombre}</span>
                <Badge variant={ESTADO_BADGE[e.estado_empresa] ?? "default"}>{e.estado_empresa}</Badge>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500">
                {e.ciudad && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {e.ciudad}</span>}
                {e.asignado_nombre && <span className="inline-flex items-center gap-1"><User className="h-3 w-3" /> {e.asignado_nombre}</span>}
                <span>{e.contactos_count} contactos · {e.oportunidades_count} ops</span>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <th className={`px-4 py-2 font-medium ${className ?? ""}`}>{children}</th>;
}
function Td({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-2.5 ${className ?? ""}`}>{children}</td>;
}
