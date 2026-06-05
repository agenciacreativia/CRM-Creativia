import { redirect } from "next/navigation";
import Link from "next/link";
import { isPlatformAdmin, listPlanes } from "@/lib/db/planes";
import { listAgencias } from "@/lib/db/agencias";
import { AgenciasManager } from "./agencias-manager";

export default async function AgenciasPage() {
  if (!(await isPlatformAdmin())) redirect("/ajustes");

  const [agencias, planes] = await Promise.all([listAgencias(), listPlanes()]);

  return (
    <div className="space-y-4">
      <div>
        <Link href="/ajustes" className="text-sm text-brand-primary hover:underline">
          ← Ajustes
        </Link>
        <h1 className="mt-1 text-2xl font-bold">Agencias</h1>
        <p className="text-sm text-gray-500">
          Creá el CRM de cada cliente, asignale un plan y gestioná su prueba gratuita y estado.
        </p>
      </div>

      <AgenciasManager
        initial={agencias}
        planes={planes.filter((p) => p.activo).map((p) => ({ id: p.id, nombre: p.nombre }))}
      />
    </div>
  );
}
