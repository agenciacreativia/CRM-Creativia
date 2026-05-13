import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { listCampos } from "@/lib/db/campos";
import { CamposManager } from "./campos-manager";

type SearchParams = Promise<{ entidad?: string }>;

export default async function CamposPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await getSessionUser();
  if (user?.rol !== "admin") redirect("/dashboard");

  const params = await searchParams;
  const entidad = (params.entidad ?? "empresa") as "empresa" | "contacto" | "oportunidad";
  const campos = await listCampos(entidad);

  return (
    <div className="space-y-6 max-w-4xl">
      <header>
        <h1 className="text-2xl font-bold">Campos personalizados</h1>
        <p className="text-sm text-gray-500 mt-1">
          Definí campos adicionales para tus empresas, contactos y oportunidades.
        </p>
      </header>

      <CamposManager initial={campos} entidad={entidad} />
    </div>
  );
}
