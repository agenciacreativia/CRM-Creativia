import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { tenantTieneHerramienta } from "@/lib/db/planes";
import { ImportForm } from "./import-form";

export default async function ImportPage() {
  const user = await getSessionUser();
  if (user?.rol !== "admin") redirect("/dashboard");
  if (!(await tenantTieneHerramienta("importar_datos"))) redirect("/admin/datos");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Importar datos</h1>
        <p className="text-sm text-gray-500 mt-1">
          Subí tus archivos Excel (empresas, contactos, oportunidades) para migrar tu base actual al CRM.
        </p>
      </header>

      <ImportForm />
    </div>
  );
}
