import Link from "next/link";
import { listContactos } from "@/lib/db/contactos";
import { FilterBuilder } from "@/components/filters/filter-builder";
import { ListOrder } from "@/components/list-order";
import { getFilterFields } from "@/lib/filters/server";
import { decodeFilterSpec, specHasConditions } from "@/lib/filters/types";
import { rowMatches } from "@/lib/filters/evaluate";
import { sortRows } from "@/lib/filters/sort";

type SearchParams = Promise<{ filtros?: string; orden?: string }>;

export default async function ContactosPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const spec = decodeFilterSpec(params.filtros);
  const hasAdvanced = specHasConditions(spec);

  const [rowsRaw, filterFields] = await Promise.all([
    listContactos({ limit: hasAdvanced ? 2000 : 200 }),
    getFilterFields("contacto"),
  ]);

  const filtered =
    hasAdvanced && spec ? rowsRaw.filter((r) => rowMatches(r, spec, filterFields)) : rowsRaw;
  const rows = sortRows(filtered, params.orden, filterFields);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <p className="text-xs text-gray-500 whitespace-nowrap">{rows.length} resultados</p>
        <ListOrder fields={filterFields} />
        <FilterBuilder fields={filterFields} />
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
                  No hay contactos todavía.{" "}
                  <Link href="/admin/datos/importar" className="text-brand-primary hover:underline">
                    Importar →
                  </Link>
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
