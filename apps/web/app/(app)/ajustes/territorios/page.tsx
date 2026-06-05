import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { listTerritorios, listAsesoresParaTerritorios } from "@/lib/db/territorios";
import { TerritoriosManager } from "./territorios-manager";

export default async function TerritoriosPage() {
  const me = await getSessionUser();
  if (me?.rol !== "admin") redirect("/dashboard");
  const [territorios, asesores] = await Promise.all([listTerritorios(), listAsesoresParaTerritorios()]);

  return (
    <div className="space-y-4">
      <div>
        <Link href="/ajustes" className="text-sm text-brand-primary hover:underline">← Ajustes</Link>
        <h1 className="mt-1 text-2xl font-bold">Plan territorial</h1>
        <p className="text-sm text-gray-500">Zonas comerciales con meta + asignación de asesores. Las ventas del mes se acumulan por zona.</p>
      </div>
      <TerritoriosManager initial={territorios} asesores={asesores} />
    </div>
  );
}
