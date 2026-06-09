"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Bookmark, BookmarkPlus, X, Columns3 } from "lucide-react";
import type { Vista, EntidadVista } from "@/lib/db/vistas";
import { crearVistaAction, eliminarVistaAction } from "./actions";

type ColumnaOpt = { key: string; label: string };

/**
 * Vistas guardadas con popup de columnas. El usuario puede:
 * - Aplicar una vista (filtros + columnas opcionales).
 * - Guardar la query actual como vista nueva, nombrarla, y opcionalmente
 *   marcar el checkbox "Guardar también la selección de columnas" para
 *   persistir qué columnas mostrar/ocultar.
 * - Eliminar vistas propias.
 */
export function SavedViews({
  entidad,
  vistas,
  columnasDisponibles,
  columnasSeleccionadas,
  onColumnasChange,
}: {
  entidad: EntidadVista;
  vistas: Vista[];
  columnasDisponibles?: ColumnaOpt[];
  columnasSeleccionadas?: string[];
  onColumnasChange?: (cols: string[]) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<Vista[]>(vistas);
  const [popupOpen, setPopupOpen] = useState(false);
  const [nombre, setNombre] = useState("");
  const [aplicaColumnas, setAplicaColumnas] = useState(false);
  const [colsLocal, setColsLocal] = useState<string[]>(columnasSeleccionadas ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentQuery = searchParams.toString();
  const activeId = items.find((v) => v.query === currentQuery)?.id ?? null;
  const tieneColumnas = !!(columnasDisponibles && columnasDisponibles.length > 0);

  async function guardar() {
    if (!nombre.trim()) {
      setError("Poné un nombre");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await crearVistaAction(entidad, nombre.trim(), currentQuery, {
        columnas: aplicaColumnas ? colsLocal : null,
        aplica_columnas: aplicaColumnas,
      });
      if (res.ok && res.vista) {
        setItems((l) => [...l, res.vista!]);
        setPopupOpen(false);
        setNombre("");
        setAplicaColumnas(false);
      } else {
        setError(res.error ?? "No se pudo guardar");
      }
    } finally {
      setSaving(false);
    }
  }

  async function eliminar(id: string) {
    setItems((l) => l.filter((v) => v.id !== id));
    await eliminarVistaAction(id);
  }

  function aplicar(v: Vista) {
    router.push(v.query ? `${pathname}?${v.query}` : pathname);
    if (v.aplica_columnas && Array.isArray(v.columnas) && onColumnasChange) {
      onColumnasChange(v.columnas);
    }
  }

  function toggleCol(key: string) {
    setColsLocal((arr) => (arr.includes(key) ? arr.filter((x) => x !== key) : [...arr, key]));
  }

  return (
    <div className="relative flex flex-wrap items-center gap-1.5">
      {items.map((v) => (
        <span
          key={v.id}
          className={`group inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs ${
            v.id === activeId ? "border-brand-primary bg-blue-50 text-brand-primary" : "border-gray-200 bg-white text-gray-600"
          }`}
        >
          <button type="button" onClick={() => aplicar(v)} className="inline-flex items-center gap-1" title={v.aplica_columnas ? "Aplica filtros + columnas guardadas" : "Aplica filtros"}>
            <Bookmark className="h-3 w-3" /> {v.nombre}
            {v.aplica_columnas && <Columns3 className="h-3 w-3 opacity-70" aria-label="con columnas" />}
          </button>
          <button type="button" onClick={() => eliminar(v.id)} aria-label={`Eliminar vista ${v.nombre}`} className="opacity-0 group-hover:opacity-60 hover:!opacity-100" title="Eliminar vista">
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={() => {
          if (!currentQuery && !tieneColumnas) return;
          setColsLocal(columnasSeleccionadas ?? []);
          setPopupOpen(true);
        }}
        disabled={saving || (!currentQuery && !tieneColumnas)}
        aria-label="Guardar vista"
        className="inline-flex items-center gap-1 rounded-full border border-dashed border-gray-300 px-2.5 py-1 text-xs text-gray-500 hover:border-gray-400 hover:text-gray-700 disabled:opacity-40"
        title={currentQuery ? "Guardar filtros (y columnas) como vista" : "Aplicá filtros o seleccioná columnas para guardar"}
      >
        <BookmarkPlus className="h-3.5 w-3.5" /> Guardar vista
      </button>

      {popupOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setPopupOpen(false)} aria-hidden />
          <div
            role="dialog"
            aria-label="Guardar vista"
            className="absolute left-0 top-full z-50 mt-1 w-80 rounded-md border border-gray-200 bg-white p-3 shadow-lg"
          >
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Guardar vista</h3>
              <button type="button" onClick={() => setPopupOpen(false)} aria-label="Cerrar" className="text-gray-400 hover:text-gray-700">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {error && <div className="mb-2 rounded border border-red-200 bg-red-50 p-2 text-xs text-status-danger">{error}</div>}

            <label className="mb-1 block text-[11px] font-medium text-gray-600" htmlFor="vista-nombre">
              Nombre
            </label>
            <input
              id="vista-nombre"
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              autoFocus
              placeholder="Mis activas alto valor"
              className="mb-3 w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            />

            {tieneColumnas && (
              <>
                <label className="mb-2 inline-flex items-center gap-1.5 text-xs text-gray-700">
                  <input
                    type="checkbox"
                    checked={aplicaColumnas}
                    onChange={(e) => setAplicaColumnas(e.target.checked)}
                    className="h-3.5 w-3.5"
                  />
                  Guardar también la selección de columnas
                </label>
                {aplicaColumnas && columnasDisponibles && (
                  <div className="mb-3 max-h-44 overflow-y-auto rounded border border-gray-100 bg-gray-50 p-2">
                    {columnasDisponibles.map((c) => (
                      <label key={c.key} className="flex items-center gap-1.5 py-0.5 text-xs text-gray-700">
                        <input
                          type="checkbox"
                          checked={colsLocal.includes(c.key)}
                          onChange={() => toggleCol(c.key)}
                          className="h-3 w-3"
                        />
                        {c.label}
                      </label>
                    ))}
                  </div>
                )}
              </>
            )}

            <div className="flex items-center justify-end gap-2">
              <button type="button" onClick={() => setPopupOpen(false)} className="rounded-md px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100">
                Cancelar
              </button>
              <button
                type="button"
                onClick={guardar}
                disabled={saving || !nombre.trim()}
                className="rounded-md bg-brand-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
