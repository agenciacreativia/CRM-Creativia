import { redirect } from "next/navigation";
import { isPlatformAdmin, listPlanes } from "@/lib/db/planes";
import { listAgencias } from "@/lib/db/agencias";
import { PageHeader } from "@/components/ui/page-header";
import { AgenciasManager } from "./agencias-manager";

export default async function AgenciasPage() {
  if (!(await isPlatformAdmin())) redirect("/ajustes");

  const [agencias, planes] = await Promise.all([listAgencias(), listPlanes()]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Agencias"
        subtitle="Creá el CRM de cada cliente, asignale un plan y gestioná su prueba gratuita y estado."
        backHref="/ajustes"
        backLabel="Ajustes"
      />

      <AgenciasManager
        initial={agencias}
        planes={planes.filter((p) => p.activo).map((p) => ({ id: p.id, nombre: p.nombre }))}
      />
    </div>
  );
}
