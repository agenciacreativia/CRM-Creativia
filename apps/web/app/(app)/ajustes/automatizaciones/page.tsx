import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { listReglas, listEtapasParaReglas } from "@/lib/db/automatizaciones";
import { listUsuarios } from "@/lib/db/usuarios";
import { listEtiquetas } from "@/lib/db/etiquetas";
import { PageHeader } from "@/components/ui/page-header";
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
      <PageHeader
        title="Automatizaciones"
        subtitle="Reglas que se ejecutan solas cuando pasan cosas en tus oportunidades (crear, cambiar de etapa, ganar, perder)."
        backHref="/ajustes"
        backLabel="Ajustes"
      />

      <AutomatizacionesManager
        initial={reglas}
        etapas={etapas}
        usuarios={usuarios.map((u) => ({ id: u.id, nombre: u.nombre }))}
        etiquetas={etiquetas.map((e) => ({ id: e.id, nombre: e.nombre }))}
      />
    </div>
  );
}
