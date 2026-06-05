"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Merge, Crown } from "lucide-react";

type Item = { id: string; nombre: string; sub: string; extra: string };

export function DupList({
  grupos,
  tipo,
  onMerge,
}: {
  grupos: { clave: string; items: Item[] }[];
  tipo: "contacto" | "empresa";
  onMerge: (primaryId: string, dupId: string) => Promise<{ ok: boolean; error?: string }>;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  if (grupos.length === 0) {
    return <p className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-500">Sin duplicados de {tipo === "contacto" ? "contactos" : "empresas"}. 🎉</p>;
  }

  async function merge(primaryId: string, dupId: string, primaryName: string) {
    if (!confirm(`Fusionar en "${primaryName}". Se reasignan sus relaciones y se elimina el duplicado. ¿Continuar?`)) return;
    setError(null);
    setBusy(dupId);
    const res = await onMerge(primaryId, dupId);
    setBusy(null);
    if (!res.ok) setError(res.error ?? "Error");
    else router.refresh();
  }

  return (
    <div className="space-y-3">
      {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-status-danger">{error}</div>}
      {grupos.map((g) => (
        <div key={g.clave} className="rounded-lg border border-amber-200 bg-amber-50/40 p-3">
          <p className="mb-2 text-xs font-semibold uppercase text-amber-700">Coinciden por «{g.clave}»</p>
          <ul className="space-y-1.5">
            {g.items.map((it, i) => (
              <li key={it.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-white px-3 py-2">
                <div className="min-w-0">
                  <span className="font-medium text-gray-900">{it.nombre}</span>
                  {i === 0 && (
                    <span className="ml-2 inline-flex items-center gap-1 rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-700">
                      <Crown className="h-3 w-3" /> principal
                    </span>
                  )}
                  <span className="block text-xs text-gray-500">{it.sub} · {it.extra}</span>
                </div>
                {i > 0 && (
                  <button
                    onClick={() => merge(g.items[0].id, it.id, g.items[0].nombre)}
                    disabled={busy === it.id}
                    className="inline-flex items-center gap-1 rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <Merge className="h-3.5 w-3.5" /> {busy === it.id ? "Fusionando…" : "Fusionar en principal"}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
