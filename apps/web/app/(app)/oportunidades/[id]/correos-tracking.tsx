import { Mail, Eye, MousePointer } from "lucide-react";
import type { CorreoEnviado } from "@/lib/db/correo-tracking";

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("es", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function CorreosTracking({ correos }: { correos: CorreoEnviado[] }) {
  if (correos.length === 0) return null;
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase text-gray-500">
        <Mail className="h-4 w-4" /> Correos enviados
        <span className="text-xs text-gray-400">{correos.length}</span>
      </h2>
      <ul className="divide-y divide-gray-100">
        {correos.map((c) => (
          <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-gray-900">{c.asunto ?? "(sin asunto)"}</p>
              <p className="truncate text-xs text-gray-500">a {c.destinatario} · {fmt(c.enviado_en)}</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className={`inline-flex items-center gap-1 ${c.aperturas > 0 ? "text-green-700" : "text-gray-400"}`} title={c.abierto_en ? `abierto ${fmt(c.abierto_en)}` : "sin abrir"}>
                <Eye className="h-3.5 w-3.5" /> {c.aperturas}
              </span>
              <span className={`inline-flex items-center gap-1 ${c.clicks > 0 ? "text-brand-primary" : "text-gray-400"}`} title={c.click_en ? `click ${fmt(c.click_en)}` : "sin click"}>
                <MousePointer className="h-3.5 w-3.5" /> {c.clicks}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
