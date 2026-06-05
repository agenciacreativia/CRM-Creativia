"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Tag, Plus, X, Check } from "lucide-react";
import { ETIQUETA_COLORS, etiquetaClasses, etiquetaDot } from "@/lib/etiqueta-colors";
import type { Etiqueta } from "@/lib/db/etiquetas";
import { setEtiquetasAction, crearEtiquetaAction } from "./actions";

export function TagPicker({
  entidad,
  entityId,
  all,
  asignadas,
  canEdit = true,
  revalidate,
}: {
  entidad: "oportunidad" | "contacto" | "empresa";
  entityId: string;
  all: Etiqueta[];
  asignadas: Etiqueta[];
  canEdit?: boolean;
  revalidate?: string;
}) {
  const router = useRouter();
  const [tags, setTags] = useState<Etiqueta[]>(all);
  const [selected, setSelected] = useState<string[]>(asignadas.map((e) => e.id));
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  async function persist(ids: string[]) {
    setSelected(ids);
    await setEtiquetasAction(entidad, entityId, ids, revalidate);
    router.refresh();
  }

  function toggle(id: string) {
    persist(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  }

  async function crear() {
    const nombre = query.trim();
    if (!nombre) return;
    const res = await crearEtiquetaAction(nombre, ETIQUETA_COLORS[tags.length % ETIQUETA_COLORS.length]);
    if (res.ok && res.etiqueta) {
      setTags((t) => [...t, res.etiqueta!]);
      setQuery("");
      persist([...selected, res.etiqueta.id]);
    }
  }

  const asignadasActuales = tags.filter((t) => selected.includes(t.id));
  const q = query.trim().toLowerCase();
  const filtered = q ? tags.filter((t) => t.nombre.toLowerCase().includes(q)) : tags;
  const exacto = tags.some((t) => t.nombre.toLowerCase() === q);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {asignadasActuales.map((t) => (
        <span
          key={t.id}
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${etiquetaClasses(t.color)}`}
        >
          {t.nombre}
          {canEdit && (
            <button onClick={() => toggle(t.id)} className="opacity-60 hover:opacity-100" title="Quitar">
              <X className="h-3 w-3" />
            </button>
          )}
        </span>
      ))}

      {canEdit && (
        <div className="relative" ref={ref}>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-gray-300 px-2 py-0.5 text-xs text-gray-500 hover:border-gray-400 hover:text-gray-700"
          >
            <Tag className="h-3 w-3" /> Etiqueta
          </button>

          {open && (
            <div className="surface-white absolute left-0 z-30 mt-1 w-60 rounded-lg border border-gray-200 bg-white shadow-lg">
              <div className="border-b border-gray-100 p-2">
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar o crear…"
                  className="w-full rounded border border-gray-200 px-2 py-1 text-sm focus:outline-none"
                />
              </div>
              <ul className="max-h-56 overflow-y-auto py-1">
                {filtered.map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => toggle(t.id)}
                      className="flex w-full items-center justify-between px-3 py-1.5 text-left text-sm hover:bg-gray-50"
                    >
                      <span className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${etiquetaDot(t.color)}`} />
                        {t.nombre}
                      </span>
                      {selected.includes(t.id) && <Check className="h-4 w-4 text-brand-primary" />}
                    </button>
                  </li>
                ))}
                {q && !exacto && (
                  <li>
                    <button
                      type="button"
                      onClick={crear}
                      className="flex w-full items-center gap-1.5 px-3 py-1.5 text-left text-sm text-brand-primary hover:bg-gray-50"
                    >
                      <Plus className="h-3.5 w-3.5" /> Crear “{query.trim()}”
                    </button>
                  </li>
                )}
                {filtered.length === 0 && !q && (
                  <li className="px-3 py-2 text-center text-xs text-gray-400">Sin etiquetas aún</li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
