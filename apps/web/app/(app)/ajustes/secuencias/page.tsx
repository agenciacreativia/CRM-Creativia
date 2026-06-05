import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { listSecuencias } from "@/lib/db/secuencias";
import { SecuenciasManager } from "./secuencias-manager";

export default async function SecuenciasPage() {
  const me = await getSessionUser();
  if (me?.rol !== "admin") redirect("/dashboard");

  const secuencias = await listSecuencias();

  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <Link href="/ajustes" className="text-sm text-brand-primary hover:underline">← Ajustes</Link>
        <h1 className="mt-1 text-2xl font-bold">Secuencias de seguimiento</h1>
        <p className="text-sm text-gray-500">
          Cadencias reutilizables. Desde una oportunidad las inscribís y se crean todas las actividades fechadas.
        </p>
      </div>
      <SecuenciasManager initial={secuencias} />
    </div>
  );
}
