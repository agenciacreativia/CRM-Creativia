"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const TABLES = [
  { key: "empresa", label: "Empresas" },
  { key: "contacto", label: "Contactos" },
  { key: "oportunidad", label: "Oportunidades" },
  { key: "actividad", label: "Actividades" },
  { key: "nota", label: "Notas" },
  { key: "sede", label: "Sedes" },
  { key: "pipeline", label: "Pipelines" },
  { key: "etapa_pipeline", label: "Etapas" },
  { key: "motivo_perdida", label: "Motivos pérdida" },
  { key: "campo_personalizado", label: "Campos personalizados" },
];

const INCLUDE_OPTIONS = [
  { key: "empresas", label: "Empresas" },
  { key: "contactos", label: "Contactos" },
  { key: "oportunidades", label: "Oportunidades + historial" },
  { key: "actividades", label: "Actividades" },
  { key: "notas", label: "Notas" },
  { key: "sedes", label: "Sedes" },
  { key: "pipelines", label: "Pipelines + etapas" },
  { key: "motivos", label: "Motivos de pérdida" },
  { key: "campos", label: "Campos personalizados" },
];

export function ExportPanel() {
  const router = useRouter();
  const [working, setWorking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [include, setInclude] = useState<Record<string, boolean>>(
    Object.fromEntries(INCLUDE_OPTIONS.map((o) => [o.key, true])),
  );

  async function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function downloadJson() {
    setWorking("json");
    setError(null);
    try {
      const res = await fetch("/api/admin/export/json", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ include }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Falló la exportación");
      const blob = await res.blob();
      const cd = res.headers.get("content-disposition") ?? "";
      const filename = /filename="([^"]+)"/.exec(cd)?.[1] ?? `backup-${Date.now()}.json`;
      await downloadBlob(blob, filename);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setWorking(null);
    }
  }

  async function downloadCsv(table: string) {
    setWorking(`csv-${table}`);
    setError(null);
    try {
      const res = await fetch(`/api/admin/export/csv?table=${table}`);
      if (!res.ok) throw new Error((await res.json()).error ?? "Falló la exportación");
      const blob = await res.blob();
      const cd = res.headers.get("content-disposition") ?? "";
      const filename = /filename="([^"]+)"/.exec(cd)?.[1] ?? `${table}.csv`;
      await downloadBlob(blob, filename);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setWorking(null);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-status-danger">{error}</div>
      )}

      <section className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-sm font-bold uppercase text-gray-500 mb-3">Backup JSON</h2>
        <p className="text-sm text-gray-600 mb-3">
          Snapshot completo del tenant. Incluye todas las relaciones. Ideal para backups regulares y migración.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
          {INCLUDE_OPTIONS.map((o) => (
            <label key={o.key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={include[o.key] ?? true}
                onChange={(e) => setInclude({ ...include, [o.key]: e.target.checked })}
                className="rounded"
              />
              {o.label}
            </label>
          ))}
        </div>
        <Button onClick={downloadJson} disabled={working !== null}>
          {working === "json" ? "Generando..." : "Descargar JSON"}
        </Button>
      </section>

      <section className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-sm font-bold uppercase text-gray-500 mb-3">Exportar a CSV (por tabla)</h2>
        <p className="text-sm text-gray-600 mb-4">
          Descargá una sola entidad para abrir en Excel/Sheets. Útil para reportes ad-hoc.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
          {TABLES.map((t) => (
            <Button
              key={t.key}
              variant="secondary"
              size="sm"
              disabled={working !== null}
              onClick={() => downloadCsv(t.key)}
            >
              {working === `csv-${t.key}` ? "..." : `${t.label} .csv`}
            </Button>
          ))}
        </div>
      </section>
    </div>
  );
}
