import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { listTerritorios, listAsesoresParaTerritorios } from "@/lib/db/territorios";
import { PageHeader } from "@/components/ui/page-header";
import { TerritoriosManager } from "./territorios-manager";

export default async function TerritoriosPage() {
  const me = await getSessionUser();
  if (me?.rol !== "admin") redirect("/dashboard");
  const [territorios, asesores] = await Promise.all([listTerritorios(), listAsesoresParaTerritorios()]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Plan territorial"
        subtitle="Zonas comerciales con meta + asignación de asesores. Las ventas del mes se acumulan por zona."
        backHref="/ajustes"
        backLabel="Ajustes"
      />
      <TerritoriosManager initial={territorios} asesores={asesores} />
    </div>
  );
}
