"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";

/**
 * Botón de exportación para las barras de selección masiva. Exporta los
 * registros seleccionados (que pueden ser "todos" o los filtrados, según lo
 * que el usuario haya tildado) a CSV o Excel vía /api/export/[modulo].
 */
export function ExportButton({ modulo, ids, cols }: { modulo: string; ids: string[]; cols?: string[] }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function exportar(formato: "csv" | "xlsx") {
    setOpen(false);
    setBusy(true);
    try {
      const res = await fetch(`/api/export/${modulo}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, formato, cols }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "No se pudo exportar.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${modulo}-${new Date().toISOString().slice(0, 10)}.${formato}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      alert("No se pudo exportar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={busy || ids.length === 0}
        className="inline-flex items-center gap-1 rounded border border-gray-300 bg-white px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
        Exportar
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute bottom-full left-0 z-50 mb-1 w-36 overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg">
            <button type="button" onClick={() => exportar("csv")} className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50">
              CSV (.csv)
            </button>
            <button type="button" onClick={() => exportar("xlsx")} className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50">
              Excel (.xlsx)
            </button>
          </div>
        </>
      )}
    </div>
  );
}
