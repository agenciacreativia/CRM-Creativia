import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { getMyPermisos } from "@/lib/db/roles";
import { can } from "@/lib/permissions";
import { loadPickerData } from "@/lib/db/picker-data";
import { PageHeader } from "@/components/ui/page-header";
import { CreateWrapper } from "./create-wrapper";

export default async function NuevaOportunidadPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const { permisos, es_admin } = await getMyPermisos();
  if (!can(permisos, "oportunidades", "crear", es_admin)) {
    redirect("/oportunidades?reason=no_permission");
  }

  const picker = await loadPickerData();

  if (picker.empresas.length === 0) {
    return (
      <div className="space-y-4 max-w-2xl">
        <PageHeader
          title="Nueva oportunidad"
          backHref="/oportunidades"
          backLabel="Oportunidades"
        />
        <div className="bg-yellow-50 border border-yellow-200 rounded p-4 text-sm">
          Para crear una oportunidad necesitás al menos una empresa con un contacto.{" "}
          <Link href="/admin/datos/importar" className="text-brand-primary hover:underline">
            Importar →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="Nueva oportunidad"
        backHref="/oportunidades"
        backLabel="Oportunidades"
      />

      <section className="bg-white border border-gray-200 rounded-lg p-6">
        <CreateWrapper
          picker={picker}
          defaultAssignedId={user.rol === "asesor" ? user.id : null}
        />
      </section>
    </div>
  );
}
