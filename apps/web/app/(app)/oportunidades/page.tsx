import Link from "next/link";
import { listOportunidades } from "@/lib/db/oportunidades";
import { SearchInput, FilterSelect } from "@/components/list-toolbar";
import { Badge } from "@/components/ui/badge";

type SearchParams = Promise<{ q?: string; estado?: string }>;

const ESTADO_BADGE: Record<string, "info" | "success" | "warn" | "danger" | "default"> = {
  activo: "info",
  ganado: "success",
  perdido: "danger",
  eliminado: "default",
};

function formatCurrency(value: number | null, moneda: string): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("es", { style: "currency", currency: moneda }).format(value);
}

export default async function OportunidadesPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const rows = await listOportunidades({ q: params.q, estado: params.estado });

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Oportunidades</h1>
          <p className="text-xs text-gray-500 mt-1">{rows.length} resultados</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/oportunidades/kanban"
            className="px-3 py-2 text-sm rounded-md text-gray-700 hover:bg-gray-100 border border-gray-200"
          >
            Vista Kanban
          </Link>
          <Link
            href="/oportunidades/nueva"
            className="inline-flex items-center justify-center rounded-md font-medium px-4 py-2 text-sm bg-brand-primary text-white hover:bg-blue-700 transition-colors"
          >
            + Nueva
          </Link>
        </div>
      </header>

      <div className="flex items-center gap-3">
        <SearchInput placeholder="Buscar por nombre..." />
        <FilterSelect
          name="estado"
          options={[
            { value: "todos", label: "Todos" },
            { value: "activo", label: "Activas" },
            { value: "ganado", label: "Ganadas" },
            { value: "perdido", label: "Perdidas" },
            { value: "eliminado", label: "Eliminadas" },
          ]}
        />
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <Th>Nombre</Th>
              <Th>Empresa</Th>
              <Th>Pipeline / Etapa</Th>
              <Th>Estado</Th>
              <Th className="text-right">Valor</Th>
              <Th>Asignado</Th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-gray-500 py-8">
                  No hay oportunidades todavía.{" "}
                  <Link href="/admin/datos/importar" className="text-brand-primary hover:underline">
                    Importar →
                  </Link>
                </td>
              </tr>
            )}
            {rows.map((o) => (
              <tr key={o.id} className="border-t border-gray-100 hover:bg-gray-50">
                <Td>
                  <Link href={`/oportunidades/${o.id}`} className="font-medium text-brand-primary hover:underline">
                    {o.nombre}
                  </Link>
                </Td>
                <Td>
                  <Link href={`/empresas/${o.empresa_id}`} className="text-brand-primary hover:underline">
                    {o.empresa_nombre}
                  </Link>
                </Td>
                <Td className="text-gray-600">
                  <span className="text-xs">{o.pipeline_nombre} · </span>
                  <span>{o.etapa_nombre}</span>
                </Td>
                <Td>
                  <Badge variant={ESTADO_BADGE[o.estado] ?? "default"}>{o.estado}</Badge>
                </Td>
                <Td className="text-right text-gray-700">{formatCurrency(o.valor, o.moneda)}</Td>
                <Td className="text-gray-600">{o.asignado_nombre ?? <span className="text-gray-400">no asignado</span>}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-4 py-2 font-medium ${className ?? ""}`}>{children}</th>;
}
function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-2.5 ${className ?? ""}`}>{children}</td>;
}
