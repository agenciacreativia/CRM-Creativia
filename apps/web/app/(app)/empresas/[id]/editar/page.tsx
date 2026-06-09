import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getEmpresa } from "@/lib/db/empresas";
import { loadPickerData } from "@/lib/db/picker-data";
import { PageHeader } from "@/components/ui/page-header";
import { EmpresaForm } from "./empresa-form";

type Params = Promise<{ id: string }>;

export default async function EditEmpresaPage({ params }: { params: Params }) {
  const user = await getSessionUser();
  if (user?.rol !== "admin") redirect("/empresas");

  const { id } = await params;
  const [empresa, picker] = await Promise.all([getEmpresa(id), loadPickerData()]);
  if (!empresa) notFound();

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title="Editar empresa"
        subtitle={empresa.nombre}
        backHref={`/empresas/${id}`}
        backLabel={empresa.nombre}
      />

      <section className="bg-white border border-gray-200 rounded-lg p-6">
        <EmpresaForm empresa={empresa} usuarios={picker.usuarios} />
      </section>
    </div>
  );
}
