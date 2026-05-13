import type { HistorialEntry } from "@/lib/db/historial";

export function HistorialSection({ historial }: { historial: HistorialEntry[] }) {
  if (historial.length === 0) return null;

  return (
    <section className="bg-white border border-gray-200 rounded-lg p-6">
      <h2 className="text-sm font-bold uppercase text-gray-500 mb-4">
        Historial de etapas <span className="text-gray-400">({historial.length})</span>
      </h2>
      <ol className="relative border-l border-gray-200 ml-2 space-y-4">
        {historial.map((h) => (
          <li key={h.id} className="pl-4">
            <span className="absolute -left-1.5 w-3 h-3 bg-brand-primary rounded-full mt-1.5" />
            <p className="text-sm text-gray-800">
              {h.etapa_anterior_nombre ? (
                <>
                  De <strong>{h.etapa_anterior_nombre}</strong> a <strong>{h.etapa_nueva_nombre}</strong>
                </>
              ) : (
                <>
                  Entró en <strong>{h.etapa_nueva_nombre}</strong>
                </>
              )}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {h.cambiado_por_nombre ?? "—"} · {formatDateTime(h.cambiado_en)}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("es", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
