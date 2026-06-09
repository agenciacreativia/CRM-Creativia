import { redirect } from "next/navigation";
import { getMyPermisos } from "@/lib/db/roles";
import { can } from "@/lib/permissions";
import { loadPickerData } from "@/lib/db/picker-data";
import { PageHeader } from "@/components/ui/page-header";
import { ContactoCreateForm } from "./contacto-create-form";

export default async function NuevoContactoPage() {
  const perms = await getMyPermisos();
  if (!can(perms.permisos, "contactos", "crear", perms.es_admin)) redirect("/contactos");

  const picker = await loadPickerData();

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader title="Nuevo contacto" backHref="/contactos" backLabel="Contactos" />
      <section className="bg-white border border-gray-200 rounded-lg p-6">
        <ContactoCreateForm empresas={picker.empresas} usuarios={picker.usuarios} />
      </section>
    </div>
  );
}
