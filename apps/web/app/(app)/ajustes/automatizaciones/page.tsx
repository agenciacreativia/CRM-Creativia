import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { listReglas, listEtapasParaReglas } from "@/lib/db/automatizaciones";
import { listUsuarios } from "@/lib/db/usuarios";
import { listEtiquetas } from "@/lib/db/etiquetas";
import { AutomatizacionesManager } from "./automatizaciones-manager";

export default async function AutomatizacionesPage() {
  const me = await getSessionUser();
  if (me?.rol !== "admin") redirect("/dashboard");

  const [reglas, etapas, usuarios, etiquetas] = await Promise.all([
    listReglas(),
    listEtapasParaReglas(),
    listUsuarios(),
    listEtiquetas(),
  ]);

  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <Link href="/ajustes" className="text-sm text-brand-primary hover:underline">← Ajustes</Link>
        <h1 className="mt-1 text-2xl font-bold">Automatizaciones</h1>
        <p className="text-sm text-gray-500">
          Reglas que se ejecutan solas cuando pasan cosas en tus oportunidades (crear, cambiar de etapa, ganar, perder).
        </p>
      </div>

      <AutomatizacionesManager
        initial={reglas}
        etapas={etapas}
        usuarios={usuarios.map((u) => ({ id: u.id, nombre: u.nombre }))}
        etiquetas={etiquetas.map((e) => ({ id: e.id, nombre: e.nombre }))}
      />
    </div>
  );
}
