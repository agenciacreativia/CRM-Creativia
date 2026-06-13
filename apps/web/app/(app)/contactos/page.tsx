import Link from "next/link";
import { Plus, User } from "lucide-react";
import { listContactos } from "@/lib/db/contactos";
import { FilterBuilder } from "@/components/filters/filter-builder";
import { QuickSearch } from "@/components/filters/quick-search";
import { ListOrder } from "@/components/list-order";
import { getListFilterConfig, fieldsByModule } from "@/lib/filters/server";
import { listVistas } from "@/lib/db/vistas";
import { decodeFilterSpec, specHasConditions } from "@/lib/filters/types";
import { rowMatches } from "@/lib/filters/evaluate";
import { sortRows } from "@/lib/filters/sort";
import { getMyPermisos } from "@/lib/db/roles";
import { can } from "@/lib/permissions";
import { BulkRowCheckbox, BulkSelectAllCheckbox } from "@/components/bulk/selection-store";
import { BulkActionsInline } from "@/components/bulk/bulk-actions-inline";
import { ColumnPicker } from "@/components/tabla/column-picker";
import { CONTACTO_COLUMNS, resolveContactoCols } from "./tabla/columns";
import { getEditableFields } from "@/lib/bulk/editable-fields";

type SearchParams = Promise<{ filtros?: string; orden?: string; q?: string; cols?: string }>;

function quickMatch(r: { nombre: string; email?: string | null; cargo?: string | null; empresa_nombre?: string | null }, q: string) {
  const n = q.toLowerCase();
  return (
    r.nombre.toLowerCase().includes(n) ||
    (r.email ?? "").toLowerCase().includes(n) ||
    (r.cargo ?? "").toLowerCase().includes(n) ||
    (r.empresa_nombre ?? "").toLowerCase().includes(n)
  );
}

export default async function ContactosPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const spec = decodeFilterSpec(params.filtros);
  const hasAdvanced = specHasConditions(spec);
  const q = params.q?.trim() ?? "";

  const [rowsRaw, filterModules, perms, vistas] = await Promise.all([
    listContactos({ limit: hasAdvanced || q ? 2000 : 200 }),
    getListFilterConfig("contacto"),
    getMyPermisos(),
    listVistas("contactos"),
  ]);
  const filterFields = filterModules.find((m) => m.key === "contacto")!.fields;
  const fbm = fieldsByModule(filterModules);
  const puedeCrear = can(perms.permisos, "contactos", "crear", perms.es_admin);
  const puedeEditarMasivo = can(perms.permisos, "contactos", "editar", perms.es_admin);
  const puedeEliminar = can(perms.permisos, "contactos", "eliminar", perms.es_admin);
  const editFields = puedeEditarMasivo ? await getEditableFields("contactos").catch(() => []) : [];

  let filtered = hasAdvanced && spec ? rowsRaw.filter((r) => rowMatches(r, spec, fbm, "contacto")) : rowsRaw;
  if (q) filtered = filtered.filter((r) => quickMatch(r, q));
  const rows = sortRows(filtered, params.orden, filterFields);

  const visibleCols = resolveContactoCols(params.cols);
  const cols = CONTACTO_COLUMNS.filter((c) => visibleCols.includes(c.key));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <QuickSearch placeholder="Buscar contacto…" />
          {puedeCrear && (
            <Link
              href="/contactos/nuevo"
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md bg-brand-navy px-3 text-sm font-semibold text-white hover:bg-brand-navy-deep"
            >
              <Plus className="h-4 w-4" /> Nuevo contacto
            </Link>
          )}
          {puedeEditarMasivo && (
            <BulkActionsInline
              modulo="contactos"
              scope="contactos"
              editFields={editFields}
              cols={visibleCols}
              allIds={rows.map((r) => r.id)}
              canEliminar={puedeEliminar}
            />
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="whitespace-nowrap text-xs text-gray-500">{rows.length} resultados</p>
          <ListOrder fields={filterFields} />
          <ColumnPicker columns={CONTACTO_COLUMNS.map((c) => ({ key: c.key, label: c.label, fixed: c.fixed }))} visibleCols={visibleCols} />
          <FilterBuilder modules={filterModules} entidad="contactos" vistas={vistas} />
        </div>
      </div>

      <div className="hidden md:block bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
            <tr>
              {puedeEditarMasivo && (
                <Th className="w-8"><BulkSelectAllCheckbox scope="contactos" ids={rows.map((r) => r.id)} /></Th>
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
                    ? <>No hay contactos que coincidan con <strong>{q}</strong>.</>
                    : <>No hay contactos todavía. <Link href="/admin/datos/importar" className="text-brand-primary hover:underline">Importar →</Link></>}
                </td>
              </tr>
            )}
            {rows.map((c) => (
              <tr key={c.id} className={`border-t border-gray-100 transition-colors hover:bg-gray-50`}>
                {puedeEditarMasivo && (
                  <Td className="text-center"><BulkRowCheckbox id={c.id} scope="contactos" /></Td>
                )}
                {cols.map((col) => (
                  <Td key={col.key} className={col.align === "right" ? "text-right" : ""}>{col.render(c)}</Td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MOBILE: cards */}
      <div className="md:hidden space-y-2">
        {rows.length === 0 && (
          <div className="rounded-lg border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
            {q
              ? <>No hay contactos que coincidan con <strong>{q}</strong>.</>
              : <>No hay contactos todavía. <Link href="/admin/datos/importar" className="text-brand-primary hover:underline">Importar →</Link></>}
          </div>
        )}
        {rows.map((c) => (
          <div key={c.id} className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 active:bg-gray-50">
            {puedeEditarMasivo && (
              <div className="shrink-0">
                <BulkRowCheckbox id={c.id} scope="contactos" />
              </div>
            )}
            <Link href={`/contactos/${c.id}`} className="flex flex-1 min-w-0 flex-col gap-1">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-semibold text-gray-900">{c.nombre}</span>
                <span className="shrink-0 text-xs text-gray-500">{c.oportunidades_count} ops</span>
              </div>
              <p className="truncate text-xs text-gray-500">
                {c.cargo ? `${c.cargo} · ` : ""}{c.empresa_nombre}
              </p>
              <p className="truncate text-xs text-gray-500">{c.email}</p>
              {c.asignado_nombre && (
                <p className="inline-flex items-center gap-1 text-xs text-gray-400"><User className="h-3 w-3" /> {c.asignado_nombre}</p>
              )}
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
