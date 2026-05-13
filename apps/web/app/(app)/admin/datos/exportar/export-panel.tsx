"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

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

const ALL_TRUE = Object.fromEntries(INCLUDE_OPTIONS.map((o) => [o.key, true]));
const ALL_FALSE = Object.fromEntries(INCLUDE_OPTIONS.map((o) => [o.key, false]));

export function ExportPanel() {
  const router = useRouter();
  const [working, setWorking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [include, setInclude] = useState<Record<string, boolean>>({ ...ALL_TRUE });
  const [tableFormat, setTableFormat] = useState<"csv" | "xlsx">("xlsx");

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

  function filenameFrom(res: Response, fallback: string) {
    const cd = res.headers.get("content-disposition") ?? "";
    return /filename="([^"]+)"/.exec(cd)?.[1] ?? fallback;
  }

  async function downloadBundle(format: "json" | "xlsx") {
    setWorking(`bundle-${format}`);
    setError(null);
    try {
      const res = await fetch(`/api/admin/export/${format === "json" ? "json" : "excel"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ include }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Falló la exportación");
      const blob = await res.blob();
      await downloadBlob(
        blob,
        filenameFrom(res, `backup-${Date.now()}.${format === "json" ? "json" : "xlsx"}`),
      );
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setWorking(null);
    }
  }

  async function downloadTable(table: string) {
    setWorking(`${tableFormat}-${table}`);
    setError(null);
    try {
      const res = await fetch(`/api/admin/export/csv?table=${table}&format=${tableFormat}`);
      if (!res.ok) throw new Error((await res.json()).error ?? "Falló la exportación");
      const blob = await res.blob();
      await downloadBlob(blob, filenameFrom(res, `${table}.${tableFormat}`));
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setWorking(null);
    }
  }

  const allSelected = INCLUDE_OPTIONS.every((o) => include[o.key]);
  const noneSelected = INCLUDE_OPTIONS.every((o) => !include[o.key]);

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-status-danger">{error}</div>
      )}

      <section className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold uppercase text-gray-500">Backup completo</h2>
          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => setInclude({ ...ALL_TRUE })}
              disabled={allSelected}
              className="text-brand-primary hover:underline disabled:text-gray-400 disabled:no-underline"
            >
              Seleccionar todo
            </button>
            <span className="text-gray-300">·</span>
            <button
              type="button"
              onClick={() => setInclude({ ...ALL_FALSE })}
              disabled={noneSelected}
              className="text-brand-primary hover:underline disabled:text-gray-400 disabled:no-underline"
            >
              Limpiar
            </button>
          </div>
        </div>
        <p className="text-sm text-gray-600 mb-3">
          Snapshot del tenant con todas las relaciones. Elegí qué secciones incluir.
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
        <div className="flex items-center gap-2 flex-wrap">
          <Button onClick={() => downloadBundle("xlsx")} disabled={working !== null || noneSelected}>
            {working === "bundle-xlsx" ? "Generando..." : "📊 Descargar Excel (.xlsx)"}
          </Button>
          <Button
            variant="secondary"
            onClick={() => downloadBundle("json")}
            disabled={working !== null || noneSelected}
          >
            {working === "bundle-json" ? "Generando..." : "{ } Descargar JSON"}
          </Button>
        </div>
      </section>

      <section className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="text-sm font-bold uppercase text-gray-500">Exportar tabla individual</h2>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">Formato:</label>
            <Select
              value={tableFormat}
              onChange={(e) => setTableFormat(e.target.value as "csv" | "xlsx")}
              className="w-auto text-xs py-1"
            >
              <option value="xlsx">Excel (.xlsx)</option>
              <option value="csv">CSV</option>
            </Select>
          </div>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Descargá una sola entidad para análisis ad-hoc. El formato Excel preserva tipos; el CSV es universalmente portable.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
          {TABLES.map((t) => (
            <Button
              key={t.key}
              variant="secondary"
              size="sm"
              disabled={working !== null}
              onClick={() => downloadTable(t.key)}
            >
              {working === `${tableFormat}-${t.key}` ? "..." : `${t.label} .${tableFormat}`}
            </Button>
          ))}
        </div>
      </section>
    </div>
  );
}
