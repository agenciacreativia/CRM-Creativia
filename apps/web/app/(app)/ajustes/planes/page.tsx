import { redirect } from "next/navigation";
import Link from "next/link";
import { isPlatformAdmin, listPlanes } from "@/lib/db/planes";
import { PlanesManager } from "./planes-manager";

export default async function PlanesPage() {
  if (!(await isPlatformAdmin())) redirect("/ajustes");

  const planes = await listPlanes();

  return (
    <div className="max-w-6xl space-y-4">
      <div>
        <Link href="/ajustes" className="text-sm text-brand-primary hover:underline">
          ← Ajustes
        </Link>
        <h1 className="mt-1 text-2xl font-bold">Planes y licencias</h1>
        <p className="text-sm text-gray-500">
          Definí los planes que ofrecés a los CRM de tus clientes: módulos, acciones y herramientas de cada uno.
        </p>
      </div>

      <PlanesManager initial={planes} />
    </div>
  );
}
