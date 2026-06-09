import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getContacto } from "@/lib/db/contactos";
import { loadPickerData } from "@/lib/db/picker-data";
import { PageHeader } from "@/components/ui/page-header";
import { ContactoForm } from "./contacto-form";

type Params = Promise<{ id: string }>;

export default async function EditContactoPage({ params }: { params: Params }) {
  const user = await getSessionUser();
  if (user?.rol !== "admin") redirect("/contactos");

  const { id } = await params;
  const [contacto, picker] = await Promise.all([getContacto(id), loadPickerData()]);
  if (!contacto) notFound();

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title="Editar contacto"
        subtitle={contacto.nombre}
        backHref={`/contactos/${id}`}
        backLabel={contacto.nombre}
      />

      <section className="bg-white border border-gray-200 rounded-lg p-6">
        <ContactoForm
          contacto={contacto}
          empresas={picker.empresas}
          usuarios={picker.usuarios}
        />
      </section>
    </div>
  );
}
