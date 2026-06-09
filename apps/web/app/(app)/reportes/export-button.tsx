"use client";

import { Download } from "lucide-react";

type Row = Record<string, string | number | null>;

export function ExportCsvButton({ filename, rows }: { filename: string; rows: Row[] }) {
  function exportCsv() {
    if (rows.length === 0) return;
    const headers = Object.keys(rows[0]);
    const esc = (v: string | number | null) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [
      headers.join(","),
      ...rows.map((r) => headers.map((h) => esc(r[h])).join(",")),
    ].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={exportCsv}
      aria-label="Exportar datos a CSV"
      disabled={rows.length === 0}
      className="inline-flex items-center gap-1.5 text-sm text-brand-primary hover:underline disabled:opacity-40"
    >
      <Download className="h-4 w-4" /> Exportar CSV
    </button>
  );
}
