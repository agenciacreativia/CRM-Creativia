import { redirect } from "next/navigation";
import { getMyPermisos } from "@/lib/db/roles";
import { can } from "@/lib/permissions";
import { loadPickerData } from "@/lib/db/picker-data";
import { PageHeader } from "@/components/ui/page-header";
import { EmpresaCreateForm } from "./empresa-create-form";

export default async function NuevaEmpresaPage() {
  const perms = await getMyPermisos();
  if (!can(perms.permisos, "empresas", "crear", perms.es_admin)) redirect("/empresas");

  const picker = await loadPickerData();

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader title="Nueva empresa" backHref="/empresas" backLabel="Empresas" />
      <section className="bg-white border border-gray-200 rounded-lg p-6">
        <EmpresaCreateForm usuarios={picker.usuarios} />
      </section>
    </div>
  );
}
