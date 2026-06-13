import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import Link from "next/link";
import { listCampanias, getAllCampaniaMetrics } from "@/lib/db/campanias";
import { listListasEnvio } from "@/lib/db/listas-envio";
import { CampaniasManager } from "./campanias-manager";
import { ListasEnvioPanel } from "./listas-panel";
import { Mail, Users } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";

export default async function CampaniasPage() {
  const me = await getSessionUser();
  if (me?.rol !== "admin") redirect("/dashboard");
  const [initial, listas, metricas] = await Promise.all([listCampanias(), listListasEnvio(), getAllCampaniaMetrics()]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Campañas de correo"
        subtitle="Listas de envío, plantillas HTML y envíos masivos con tracking de apertura/clic."
      />

      <section className="rounded-lg border border-gray-200 bg-white">
        <header className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
          <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-500">
            <Users className="h-3.5 w-3.5" /> Listas de envío
            <span className="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-700">{listas.length}</span>
          </h2>
          <Link href="/campanias/listas/nueva" className="text-xs font-semibold text-brand-primary hover:underline">+ Nueva lista</Link>
        </header>
        <ListasEnvioPanel listas={listas} />
      </section>

      <section className="rounded-lg border border-gray-200 bg-white">
        <header className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
          <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-500">
            <Mail className="h-3.5 w-3.5" /> Envíos
          </h2>
        </header>
        <div className="p-5">
          <CampaniasManager initial={initial} metricas={metricas} />
        </div>
      </section>
    </div>
  );
}
