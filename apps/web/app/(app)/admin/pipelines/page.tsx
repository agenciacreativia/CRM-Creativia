import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { listPipelines } from "@/lib/db/pipelines";
import { NewPipelineForm } from "./new-pipeline-form";

export default async function PipelinesPage() {
  const user = await getSessionUser();
  if (user?.rol !== "admin") redirect("/dashboard");

  const pipelines = await listPipelines();

  return (
    <div className="space-y-6 max-w-5xl">
      <header>
        <h1 className="text-2xl font-bold">Pipelines</h1>
        <p className="text-sm text-gray-500 mt-1">
          Personalizá tus embudos de venta. Cada pipeline tiene sus propias etapas.
        </p>
      </header>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <Th>Nombre</Th>
              <Th>Descripción</Th>
              <Th className="text-right">Etapas</Th>
              <Th className="text-right">Oportunidades</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {pipelines.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center text-gray-500 py-6">
                  No hay pipelines todavía. Creá uno con el formulario de abajo.
                </td>
              </tr>
            )}
            {pipelines.map((p) => (
              <tr key={p.id} className="border-t border-gray-100 hover:bg-gray-50">
                <Td>
                  <Link href={`/admin/pipelines/${p.id}`} className="text-brand-primary hover:underline font-medium">
                    {p.nombre}
                  </Link>
                  {p.es_default && (
                    <span className="ml-2 text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">default</span>
                  )}
                </Td>
                <Td className="text-gray-600">{p.descripcion ?? "—"}</Td>
                <Td className="text-right">{p.etapas_count}</Td>
                <Td className="text-right">{p.oportunidades_count}</Td>
                <Td className="text-right">
                  <Link
                    href={`/admin/pipelines/${p.id}`}
                    className="text-sm text-brand-primary hover:underline"
                  >
                    Editar →
                  </Link>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-sm font-bold uppercase text-gray-500 mb-4">Nuevo pipeline</h2>
        <NewPipelineForm />
      </section>
    </div>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-4 py-2 font-medium ${className ?? ""}`}>{children}</th>;
}
function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-2.5 ${className ?? ""}`}>{children}</td>;
}
