import Link from "next/link";
import { Briefcase } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { OppRel } from "@/lib/db/relaciones";

const ESTADO_BADGE: Record<string, "info" | "success" | "warn" | "danger" | "default"> = {
  activo: "info",
  ganado: "success",
  perdido: "danger",
  eliminado: "default",
};

function money(v: number | null, m: string) {
  return v == null ? "—" : new Intl.NumberFormat("es", { style: "currency", currency: m, maximumFractionDigits: 0 }).format(v);
}

export function OportunidadesList({ items, title = "Oportunidades" }: { items: OppRel[]; title?: string }) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white">
      <header className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
        <h2 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-gray-500">
          <Briefcase className="h-3.5 w-3.5" /> {title}
          <span className="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-700">{items.length}</span>
        </h2>
      </header>
      {items.length === 0 ? (
        <p className="px-5 py-6 text-center text-sm text-gray-400">Sin oportunidades.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {items.map((o) => (
            <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 hover:bg-gray-50">
              <div className="min-w-0">
                <Link href={`/oportunidades/${o.id}`} className="text-sm font-semibold text-brand-navy hover:underline">
                  {o.nombre}
                </Link>
                <p className="text-xs text-gray-500">
                  {o.etapa_nombre ?? "—"}{o.asignado_nombre ? ` · ${o.asignado_nombre}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={ESTADO_BADGE[o.estado] ?? "default"}>{o.estado}</Badge>
                <span className="text-sm font-bold text-gray-900">{money(o.valor, o.moneda)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
