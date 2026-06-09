import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { tenantTieneHerramienta } from "@/lib/db/planes";
import { PageHeader } from "@/components/ui/page-header";
import { ImportForm } from "./import-form";

export default async function ImportPage() {
  const user = await getSessionUser();
  if (user?.rol !== "admin") redirect("/dashboard");
  if (!(await tenantTieneHerramienta("importar_datos"))) redirect("/admin/datos");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Importar datos"
        subtitle="Subí tus archivos Excel (empresas, contactos, oportunidades) para migrar tu base actual al CRM."
      />

      <ImportForm />
    </div>
  );
}
