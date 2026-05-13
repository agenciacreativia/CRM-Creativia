import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { getContacto } from "@/lib/db/contactos";
import { loadPickerData } from "@/lib/db/picker-data";
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
      <Link href={`/contactos/${id}`} className="text-sm text-brand-primary hover:underline">
        ← {contacto.nombre}
      </Link>

      <header>
        <h1 className="text-2xl font-bold">Editar contacto</h1>
        <p className="text-sm text-gray-500 mt-1">{contacto.nombre}</p>
      </header>

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
