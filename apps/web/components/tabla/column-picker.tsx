"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Columns3, X } from "lucide-react";

export type PickerColumn = { key: string; label: string; fixed?: boolean };

/**
 * Selector de columnas visibles, genérico para cualquier módulo. Persiste la
 * selección en el param `?cols=` (se guarda junto al filtro en las vistas).
 * La columna `fixed` (Nombre) no se puede ocultar y va siempre primera.
 */
export function ColumnPicker({
  columns,
  visibleCols,
}: {
  columns: PickerColumn[];
  visibleCols: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  const fixedKey = columns.find((c) => c.fixed)?.key;

  function setCols(next: string[]) {
    const params = new URLSearchParams(searchParams.toString());
    const withFixed = fixedKey && !next.includes(fixedKey) ? [fixedKey, ...next] : next;
    params.set("cols", withFixed.join(","));
    router.replace(`${pathname}?${params.toString()}`);
  }

  function toggle(key: string) {
    const set = new Set(visibleCols);
    if (set.has(key)) set.delete(key);
    else set.add(key);
    // Mantener el orden del catálogo.
    setCols(columns.filter((c) => set.has(c.key)).map((c) => c.key));
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-9 items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-700 transition-colors hover:bg-gray-100"
      >
        <Columns3 className="h-4 w-4" />
        <span className="hidden sm:inline">Columnas</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute right-0 z-50 mt-2 w-56 rounded-lg border border-gray-200 bg-white p-2 shadow-xl">
            <div className="mb-1 flex items-center justify-between px-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Columnas visibles</span>
              <button type="button" onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-700"><X className="h-3.5 w-3.5" /></button>
            </div>
            <div className="max-h-72 space-y-0.5 overflow-y-auto">
              {columns.map((c) => (
                <label key={c.key} className={`flex items-center gap-2 rounded px-2 py-1.5 text-sm ${c.fixed ? "text-gray-400" : "cursor-pointer text-gray-700 hover:bg-gray-50"}`}>
                  <input
                    type="checkbox"
                    checked={visibleCols.includes(c.key)}
                    disabled={c.fixed}
                    onChange={() => toggle(c.key)}
                    className="rounded"
                  />
                  {c.label}
                  {c.fixed && <span className="ml-auto text-[11px] uppercase text-gray-300">fija</span>}
                </label>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
