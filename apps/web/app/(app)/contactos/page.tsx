import Link from "next/link";
import { listContactos } from "@/lib/db/contactos";
import { SearchInput } from "@/components/list-toolbar";

type SearchParams = Promise<{ q?: string }>;

export default async function ContactosPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const rows = await listContactos({ q: params.q });

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Contactos</h1>
        <p className="text-sm text-gray-500">{rows.length} resultados</p>
      </header>

      <SearchInput placeholder="Buscar por nombre, email, cargo..." />

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <Th>Nombre</Th>
              <Th>Cargo</Th>
              <Th>Empresa</Th>
              <Th>Email</Th>
              <Th>Asignado</Th>
              <Th className="text-right">Oportunidades</Th>
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
            {rows.map((c) => (
              <tr key={c.id} className="border-t border-gray-100 hover:bg-gray-50">
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
                <Td className="text-gray-600">{c.asignado_nombre ?? <span className="text-gray-400">no asignado</span>}</Td>
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
