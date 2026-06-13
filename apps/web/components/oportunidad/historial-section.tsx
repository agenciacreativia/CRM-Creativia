"use client";

import { useState } from "react";
import { ChevronDown, History } from "lucide-react";

export type HistorialItem = {
  id: string;
  texto: React.ReactNode;
  autor: string | null;
  fecha: string;
};

/**
 * Low-key collapsible change history: closed by default, shows the 3 most
 * recent when opened, with a "Ver más" to reveal the rest.
 */
export function HistorialSection({
  entries,
  title = "Historial de cambios",
}: {
  entries: HistorialItem[];
  title?: string;
}) {
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);

  if (entries.length === 0) return null;

  const visible = showAll ? entries : entries.slice(0, 3);

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500 hover:text-gray-700"
      >
        <span className="flex items-center gap-2">
          <History className="h-3.5 w-3.5" />
          {title} <span className="text-gray-400">({entries.length})</span>
        </span>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="px-4 pb-4">
          <ol className="ml-1 space-y-2.5 border-l border-gray-200 pl-3">
            {visible.map((e) => (
              <li key={e.id} className="relative">
                <span className="absolute -left-[15px] top-1.5 h-2 w-2 rounded-full bg-gray-300" />
                <p className="text-sm text-gray-700">{e.texto}</p>
                <p className="text-xs text-gray-400">
                  {e.autor ?? "—"} · {formatDateTime(e.fecha)}
                </p>
              </li>
            ))}
          </ol>
          {entries.length > 3 && (
            <button
              type="button"
              onClick={() => setShowAll((s) => !s)}
              className="mt-3 text-xs font-medium text-brand-primary hover:underline"
            >
              {showAll ? "Ver menos" : `Ver más (${entries.length - 3})`}
            </button>
          )}
        </div>
      )}
    </div>
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
