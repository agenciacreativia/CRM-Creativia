import { Clock } from "lucide-react";
import { getListaEsperaResumen } from "@/lib/db/planes";

/**
 * Shows a notice when the tenant has records held in the waiting list
 * (created over its plan cap). Hidden when there are none.
 */
export async function ListaEsperaBanner() {
  const resumen = await getListaEsperaResumen();
  if (!resumen || resumen.total === 0) return null;

  const detalle = resumen.items.map((i) => `${i.count} ${i.label.toLowerCase()}`).join(" · ");

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
      <Clock className="h-5 w-5 shrink-0 text-amber-600" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-amber-900">
          Tenés {resumen.total} registro{resumen.total === 1 ? "" : "s"} en lista de espera
        </p>
        <p className="text-xs text-amber-700">
          {detalle} · superaron el tope de tu plan. Mejorá tu plan para liberarlos automáticamente.
        </p>
      </div>
    </div>
  );
}
