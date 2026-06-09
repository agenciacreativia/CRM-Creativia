import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { listCampos } from "@/lib/db/campos";
import { PageHeader } from "@/components/ui/page-header";
import { CamposManager } from "./campos-manager";

type SearchParams = Promise<{ entidad?: string }>;

export default async function CamposPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await getSessionUser();
  if (user?.rol !== "admin") redirect("/dashboard");

  const params = await searchParams;
  const entidad = (params.entidad ?? "empresa") as "empresa" | "contacto" | "oportunidad";
  const campos = await listCampos(entidad);

  return (
    <div className="space-y-6 ">
      <PageHeader
        title="Campos personalizados"
        subtitle="Definí campos adicionales para tus empresas, contactos y oportunidades."
      />

      <CamposManager initial={campos} entidad={entidad} />
    </div>
  );
}
