import Link from "next/link";
import { listEmpresas } from "@/lib/db/empresas";
import { FilterBuilder } from "@/components/filters/filter-builder";
import { ListOrder } from "@/components/list-order";
import { getFilterFields } from "@/lib/filters/server";
import { decodeFilterSpec, specHasConditions } from "@/lib/filters/types";
import { rowMatches } from "@/lib/filters/evaluate";
import { sortRows } from "@/lib/filters/sort";
import { Badge } from "@/components/ui/badge";

type SearchParams = Promise<{ filtros?: string; orden?: string }>;

const ESTADO_BADGE: Record<string, "info" | "success" | "default"> = {
  prospecto: "info",
  cliente: "success",
  inactivo: "default",
};

export default async function EmpresasPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const spec = decodeFilterSpec(params.filtros);
  const hasAdvanced = specHasConditions(spec);

  // Limite de filas a traer del backend. Cuando hay filtros avanzados subimos el tope
  // para evaluarlos en memoria, pero seguimos siendo finitos: detectamos si tocamos el
  // tope para avisar al usuario que los resultados pueden estar incompletos.
  const fetchLimit = hasAdvanced ? 2000 : 200;
  const [rowsRaw, filterFields] = await Promise.all([
    listEmpresas({ limit: fetchLimit }),
    getFilterFields("empresa"),
  ]);
  const truncated = hasAdvanced && rowsRaw.length >= fetchLimit;

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

      {truncated && (
        <div
          role="alert"
          className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800"
        >
          Mostrando los primeros {fetchLimit} registros. Aplicá filtros más específicos para
          asegurar resultados completos.
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-[11px] uppercase tracking-wider text-gray-500">
            <tr>
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
                <td colSpan={6} className="text-center text-gray-500 py-8">
                  No hay empresas todavía. Importá tu base desde{" "}
                  <Link href="/admin/datos/importar" className="text-brand-primary hover:underline">
                    Datos → Importar
                  </Link>
                  .
                </td>
              </tr>
            )}
            {rows.map((e, idx) => (
              <tr key={e.id} className={`border-t border-gray-100 transition-colors hover:bg-gray-50 ${idx % 2 ? "bg-blue-50/30" : ""}`}>
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
    </div>
  );
}

function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <th className={`px-4 py-2 font-medium ${className ?? ""}`}>{children}</th>;
}
function Td({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-2.5 ${className ?? ""}`}>{children}</td>;
}
