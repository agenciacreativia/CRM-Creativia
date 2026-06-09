import { redirect } from "next/navigation";
import { isPlatformAdmin, listPlanes } from "@/lib/db/planes";
import { PageHeader } from "@/components/ui/page-header";
import { PlanesManager } from "./planes-manager";

export default async function PlanesPage() {
  if (!(await isPlatformAdmin())) redirect("/ajustes");

  const planes = await listPlanes();

  return (
    <div className="max-w-6xl space-y-4">
      <PageHeader
        title="Planes y licencias"
        subtitle="Definí los planes que ofrecés a los CRM de tus clientes: módulos, acciones y herramientas de cada uno."
        backHref="/ajustes"
        backLabel="Ajustes"
      />

      <PlanesManager initial={planes} />
    </div>
  );
}
