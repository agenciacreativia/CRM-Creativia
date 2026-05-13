import Link from "next/link";
import { listEmpresas } from "@/lib/db/empresas";
import { SearchInput, FilterSelect } from "@/components/list-toolbar";
import { Badge } from "@/components/ui/badge";

type SearchParams = Promise<{ q?: string; estado?: string }>;

const ESTADO_BADGE: Record<string, "info" | "success" | "default"> = {
  prospecto: "info",
  cliente: "success",
  inactivo: "default",
};

export default async function EmpresasPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const rows = await listEmpresas({ q: params.q, estado: params.estado });

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Empresas</h1>
        <p className="text-sm text-gray-500">{rows.length} resultados</p>
      </header>

      <div className="flex items-center gap-3">
        <SearchInput placeholder="Buscar por nombre, email, ciudad..." />
        <FilterSelect
          name="estado"
          options={[
            { value: "todos", label: "Todos los estados" },
            { value: "prospecto", label: "Prospecto" },
            { value: "cliente", label: "Cliente" },
            { value: "inactivo", label: "Inactivo" },
          ]}
        />
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <Th>Nombre</Th>
              <Th>Estado</Th>
              <Th>Ciudad</Th>
              <Th>Email</Th>
              <Th className="text-right">Contactos</Th>
              <Th className="text-right">Oportunidades</Th>
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
            {rows.map((e) => (
              <tr key={e.id} className="border-t border-gray-100 hover:bg-gray-50">
                <Td>
                  <Link href={`/empresas/${e.id}`} className="text-brand-primary hover:underline font-medium">
                    {e.nombre}
                  </Link>
                </Td>
                <Td>
                  <Badge variant={ESTADO_BADGE[e.estado_empresa] ?? "default"}>{e.estado_empresa}</Badge>
                </Td>
                <Td>{e.ciudad ?? "—"}</Td>
                <Td className="text-gray-600">{e.email ?? "—"}</Td>
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

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-4 py-2 font-medium ${className ?? ""}`}>{children}</th>;
}
function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-2.5 ${className ?? ""}`}>{children}</td>;
}
