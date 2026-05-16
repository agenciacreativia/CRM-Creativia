import Link from "next/link";
import { listOportunidades } from "@/lib/db/oportunidades";
import { loadPickerData } from "@/lib/db/picker-data";
import { getSessionUser } from "@/lib/auth";
import { SearchInput, FilterSelect } from "@/components/list-toolbar";
import { OportunidadFilters } from "./filters";
import { Badge } from "@/components/ui/badge";

type SearchParams = Promise<{
  q?: string;
  estado?: string;
  asignado?: string;
  pipeline?: string;
  cierre_desde?: string;
  cierre_hasta?: string;
  valor_min?: string;
  valor_max?: string;
  mine?: string;
}>;

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
  const user = await getSessionUser();

  const asignado = params.mine === "1" && user ? user.id : params.asignado;
  const valorMin = params.valor_min ? Number(params.valor_min) : undefined;
  const valorMax = params.valor_max ? Number(params.valor_max) : undefined;

  const [rows, picker] = await Promise.all([
    listOportunidades({
      q: params.q,
      estado: params.estado,
      pipeline_id: params.pipeline,
      asignado_id: asignado,
      cierre_desde: params.cierre_desde,
      cierre_hasta: params.cierre_hasta,
      valor_min: Number.isFinite(valorMin as number) ? valorMin : undefined,
      valor_max: Number.isFinite(valorMax as number) ? valorMax : undefined,
    }),
    loadPickerData(),
  ]);

  const totalValor = rows
    .filter((r) => r.estado === "activo")
    .reduce((s, r) => s + (r.valor ?? 0), 0);
  const monedaPrincipal = rows[0]?.moneda ?? "USD";

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Oportunidades</h1>
          <p className="text-xs text-gray-500 mt-1">
            {rows.length} resultados · {formatCurrency(totalValor, monedaPrincipal)} activos
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
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

      <div className="flex items-center gap-3 flex-wrap">
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
        <OportunidadFilters
          usuarios={picker.usuarios}
          pipelines={picker.pipelines}
          currentUserId={user?.id ?? null}
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
                  No hay oportunidades con esos filtros.
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

function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <th className={`px-4 py-2 font-medium ${className ?? ""}`}>{children}</th>;
}
function Td({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-2.5 ${className ?? ""}`}>{children}</td>;
}
