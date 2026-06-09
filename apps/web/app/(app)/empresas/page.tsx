import Link from "next/link";
import { Plus } from "lucide-react";
import { listEmpresas } from "@/lib/db/empresas";
import { FilterBuilder } from "@/components/filters/filter-builder";
import { QuickSearch } from "@/components/filters/quick-search";
import { ListOrder } from "@/components/list-order";
import { getFilterFields } from "@/lib/filters/server";
import { decodeFilterSpec, specHasConditions } from "@/lib/filters/types";
import { rowMatches } from "@/lib/filters/evaluate";
import { sortRows } from "@/lib/filters/sort";
import { Badge } from "@/components/ui/badge";
import { getMyPermisos } from "@/lib/db/roles";
import { can } from "@/lib/permissions";
import { listUsuarios } from "@/lib/db/usuarios";
import { BulkEmpresasBar, BulkRowCheckbox } from "@/components/bulk/bulk-empresas-bar";

type SearchParams = Promise<{ filtros?: string; orden?: string; q?: string }>;

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
  const [rowsRaw, filterFields, perms, usuarios] = await Promise.all([
    listEmpresas({ limit: fetchLimit }),
    getFilterFields("empresa"),
    getMyPermisos(),
    listUsuarios({ activo: "activos" }),
  ]);
  const puedeEditarMasivo = can(perms.permisos, "empresas", "editar", perms.es_admin);
  const truncated = (hasAdvanced || q) && rowsRaw.length >= fetchLimit;
  const puedeCrear = can(perms.permisos, "empresas", "crear", perms.es_admin);

  let filtered = hasAdvanced && spec ? rowsRaw.filter((r) => rowMatches(r, spec, filterFields)) : rowsRaw;
  if (q) filtered = filtered.filter((r) => quickMatch(r, q));
  const rows = sortRows(filtered, params.orden, filterFields);

  return (
    <div className="space-y-4">
      {/* Toolbar superior. En mobile arma 2 filas: búsqueda + crear arriba,
          filtros/orden debajo. En md+ todo en una línea. */}
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3">
        <div className="flex items-center justify-between gap-2 sm:justify-start sm:gap-3">
          <QuickSearch placeholder="Buscar empresa…" />
          {puedeCrear && (
            <Link
              href="/empresas/nueva"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-brand-navy px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-navy-deep sm:hidden"
            >
              <Plus className="h-3.5 w-3.5" /> Nueva
            </Link>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 sm:gap-3">
          <p className="text-xs text-gray-500 whitespace-nowrap">{rows.length} resultados</p>
          <div className="flex items-center gap-2">
            <ListOrder fields={filterFields} />
            <FilterBuilder fields={filterFields} />
            {puedeCrear && (
              <Link
                href="/empresas/nueva"
                className="hidden sm:inline-flex items-center gap-1.5 rounded-md bg-brand-navy px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-navy-deep"
              >
                <Plus className="h-3.5 w-3.5" /> Nueva empresa
              </Link>
            )}
          </div>
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

      {puedeEditarMasivo && (
        <BulkEmpresasBar usuarios={usuarios.map((u) => ({ id: u.id, nombre: u.nombre }))} />
      )}

      {/* === DESKTOP/TABLET ≥md: tabla === */}
      <div className="hidden md:block bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-[11px] uppercase tracking-wider text-gray-500">
            <tr>
              {puedeEditarMasivo && <Th className="w-8" aria-label="Selección" />}
              <Th className="font-bold">Nombre</Th>
              <Th className="font-bold">Estado</Th>
              <Th className="font-bold">Ciudad</Th>
              <Th className="font-bold">Asignado</Th>
              <Th className="font-bold text-right">Contactos</Th>
              <Th className="font-bold text-right">Oportunidades</Th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={puedeEditarMasivo ? 7 : 6} className="text-center text-gray-500 py-8">
                  {q
                    ? <>No hay empresas que coincidan con <strong>{q}</strong>.</>
                    : <>No hay empresas todavía. Importá tu base desde <Link href="/admin/datos/importar" className="text-brand-primary hover:underline">Datos → Importar</Link> o creá una nueva.</>}
                </td>
              </tr>
            )}
            {rows.map((e, idx) => (
              <tr key={e.id} className={`border-t border-gray-100 transition-colors hover:bg-gray-50 ${idx % 2 ? "bg-blue-50/30" : ""}`}>
                {puedeEditarMasivo && (
                  <Td className="text-center"><BulkRowCheckbox id={e.id} scope="empresas" /></Td>
                )}
                <Td>
                  <Link href={`/empresas/${e.id}`} className="text-brand-primary hover:underline font-medium">
                    {e.nombre}
                  </Link>
                </Td>
                <Td>
                  <Badge variant={ESTADO_BADGE[e.estado_empresa] ?? "default"}>{e.estado_empresa}</Badge>
                </Td>
                <Td>{e.ciudad ?? "—"}</Td>
                <Td className="text-gray-600">{e.asignado_nombre ?? <span className="text-gray-400">no asignado</span>}</Td>
                <Td className="text-right">{e.contactos_count}</Td>
                <Td className="text-right">{e.oportunidades_count}</Td>
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
                {e.ciudad && <span>📍 {e.ciudad}</span>}
                {e.asignado_nombre && <span>👤 {e.asignado_nombre}</span>}
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
