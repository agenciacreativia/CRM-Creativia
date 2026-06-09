import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { listSecuencias } from "@/lib/db/secuencias";
import { PageHeader } from "@/components/ui/page-header";
import { SecuenciasManager } from "./secuencias-manager";

export default async function SecuenciasPage() {
  const me = await getSessionUser();
  if (me?.rol !== "admin") redirect("/dashboard");

  const secuencias = await listSecuencias();

  return (
    <div className="max-w-3xl space-y-4">
      <PageHeader
        title="Secuencias de seguimiento"
        subtitle="Cadencias reutilizables. Desde una oportunidad las inscribís y se crean todas las actividades fechadas."
        backHref="/ajustes"
        backLabel="Ajustes"
      />
      <SecuenciasManager initial={secuencias} />
    </div>
  );
}
