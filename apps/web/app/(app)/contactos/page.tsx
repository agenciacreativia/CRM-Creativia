import Link from "next/link";
import { Plus } from "lucide-react";
import { listContactos } from "@/lib/db/contactos";
import { FilterBuilder } from "@/components/filters/filter-builder";
import { QuickSearch } from "@/components/filters/quick-search";
import { ListOrder } from "@/components/list-order";
import { getFilterFields } from "@/lib/filters/server";
import { decodeFilterSpec, specHasConditions } from "@/lib/filters/types";
import { rowMatches } from "@/lib/filters/evaluate";
import { sortRows } from "@/lib/filters/sort";
import { getMyPermisos } from "@/lib/db/roles";
import { can } from "@/lib/permissions";

type SearchParams = Promise<{ filtros?: string; orden?: string; q?: string }>;

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

  const [rowsRaw, filterFields, perms] = await Promise.all([
    listContactos({ limit: hasAdvanced || q ? 2000 : 200 }),
    getFilterFields("contacto"),
    getMyPermisos(),
  ]);
  const puedeCrear = can(perms.permisos, "contactos", "crear", perms.es_admin);

  let filtered = hasAdvanced && spec ? rowsRaw.filter((r) => rowMatches(r, spec, filterFields)) : rowsRaw;
  if (q) filtered = filtered.filter((r) => quickMatch(r, q));
  const rows = sortRows(filtered, params.orden, filterFields);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <QuickSearch placeholder="Buscar contacto…" />
          <p className="text-xs text-gray-500 whitespace-nowrap">{rows.length} resultados</p>
        </div>
        <div className="flex items-center gap-3">
          <ListOrder fields={filterFields} />
          <FilterBuilder fields={filterFields} />
          {puedeCrear && (
            <Link
              href="/contactos/nuevo"
              className="inline-flex items-center gap-1.5 rounded-md bg-brand-navy px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-navy-deep"
            >
              <Plus className="h-3.5 w-3.5" /> Nuevo contacto
            </Link>
          )}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-[11px] uppercase tracking-wider text-gray-500">
            <tr>
              <Th className="font-bold">Nombre</Th>
              <Th className="font-bold">Cargo</Th>
              <Th className="font-bold">Empresa</Th>
              <Th className="font-bold">Email</Th>
              <Th className="font-bold">Asignado</Th>
              <Th className="font-bold text-right">Oportunidades</Th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-gray-500 py-8">
                  {q
                    ? <>No hay contactos que coincidan con <strong>{q}</strong>.</>
                    : <>No hay contactos todavía. <Link href="/admin/datos/importar" className="text-brand-primary hover:underline">Importar →</Link></>}
                </td>
              </tr>
            )}
            {rows.map((c, idx) => (
              <tr key={c.id} className={`border-t border-gray-100 transition-colors hover:bg-gray-50 ${idx % 2 ? "bg-blue-50/30" : ""}`}>
                <Td>
                  <Link href={`/contactos/${c.id}`} className="text-brand-primary hover:underline font-medium">
                    {c.nombre}
                  </Link>
                </Td>
                <Td className="text-gray-600">{c.cargo ?? "—"}</Td>
                <Td>
                  <Link href={`/empresas/${c.empresa_id}`} className="text-gray-700 hover:underline">
                    {c.empresa_nombre}
                  </Link>
                </Td>
                <Td className="text-gray-600">{c.email}</Td>
                <Td className="text-gray-600">{c.asignado_nombre ?? <span className="text-gray-400" aria-label="Sin asignar">no asignado</span>}</Td>
                <Td className="text-right">{c.oportunidades_count}</Td>
              </tr>
            ))}
          </tbody>
        </table>
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
