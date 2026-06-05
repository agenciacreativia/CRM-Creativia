import Link from "next/link";
import { Smile, Meh, Frown } from "lucide-react";
import { getResumenNps, listNps } from "@/lib/db/nps";
import { Badge } from "@/components/ui/badge";

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" });
}

export default async function NpsPage() {
  const [resumen, items] = await Promise.all([getResumenNps(), listNps()]);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold">NPS (post-viaje)</h1>
        <p className="text-sm text-gray-500">Encuestas enviadas y respuestas. Promotores 9-10, pasivos 7-8, detractores 0-6.</p>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Kpi label="Enviados" value={String(resumen.total)} />
        <Kpi label="Respondidos" value={String(resumen.respondidas)} />
        <Kpi label="Promotores" value={String(resumen.promotores)} icon={<Smile className="h-4 w-4 text-green-600" />} />
        <Kpi label="Pasivos" value={String(resumen.pasivos)} icon={<Meh className="h-4 w-4 text-amber-500" />} />
        <Kpi label="Detractores" value={String(resumen.detractores)} icon={<Frown className="h-4 w-4 text-status-danger" />} />
      </div>

      <div className="rounded-lg border border-brand-primary/30 bg-brand-primary/5 p-4 text-center">
        <p className="text-xs uppercase text-gray-500">Score NPS</p>
        <p className="text-3xl font-bold text-brand-primary">{resumen.score ?? "—"}</p>
        <p className="text-xs text-gray-500">% Promotores − % Detractores</p>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2 font-medium">Viajero / Oportunidad</th>
              <th className="px-4 py-2 font-medium">Puntaje</th>
              <th className="px-4 py-2 font-medium">Comentario</th>
              <th className="px-4 py-2 font-medium">Enviado</th>
              <th className="px-4 py-2 font-medium">Respondido</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr><td colSpan={5} className="py-8 text-center text-gray-500">Sin envíos todavía. Desde una oportunidad ganada vas a poder enviar NPS.</td></tr>
            )}
            {items.map((r) => (
              <tr key={r.id} className="border-t border-gray-100">
                <td className="px-4 py-2.5">
                  <p className="font-medium text-gray-900">{r.contacto_nombre ?? "—"}</p>
                  {r.oportunidad_nombre && <p className="text-xs text-gray-500">{r.oportunidad_nombre}</p>}
                </td>
                <td className="px-4 py-2.5">
                  {r.puntaje != null ? (
                    <Badge variant={r.puntaje >= 9 ? "success" : r.puntaje >= 7 ? "warn" : "danger"}>{r.puntaje}/10</Badge>
                  ) : (
                    <Badge variant="default">pendiente</Badge>
                  )}
                </td>
                <td className="px-4 py-2.5 text-xs text-gray-600">{r.comentario ?? "—"}</td>
                <td className="px-4 py-2.5 text-xs text-gray-500">{fmt(r.enviado_en)}</td>
                <td className="px-4 py-2.5 text-xs text-gray-500">{r.respondido_en ? fmt(r.respondido_en) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-400">Tip: para enviar una encuesta abrí una oportunidad ganada y usá «Enviar NPS» (próximo paso).</p>
      <Link href="/dashboard" className="text-xs text-brand-primary hover:underline">← Volver al panel</Link>
    </div>
  );
}

function Kpi({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      <p className="flex items-center gap-1 text-xs text-gray-500">{icon} {label}</p>
      <p className="mt-1 text-xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
