"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Tag, Trash2, Loader2, AlertTriangle } from "lucide-react";
import type { FilterField } from "@/lib/filters/types";
import type { Etiqueta } from "@/lib/db/etiquetas";
import type { ModuloBulk } from "@/lib/bulk/editable-fields";
import { ExportButton } from "@/components/export/export-button";
import { BulkEditPanel } from "./bulk-edit-panel";
import { useBulkSelection, clearBulk, selectAllBulk } from "./selection-store";
import { bulkEliminarAction, bulkEtiquetaAction } from "@/app/(app)/oportunidades/tabla/bulk-actions";
import { bulkEliminarContactosAction } from "./bulk-contactos-actions";
import { bulkEliminarProductosAction } from "./bulk-productos-actions";

const DELETE_ACTION: Partial<Record<ModuloBulk, (ids: string[]) => Promise<{ ok: boolean; error?: string }>>> = {
  contactos: bulkEliminarContactosAction,
  oportunidades: bulkEliminarAction,
  productos: bulkEliminarProductosAction,
};

/**
 * Toolbar de acciones masivas que vive junto al botón "+ Nuevo". Aparece solo
 * cuando hay registros seleccionados. Las acciones que NO son edición de campos
 * (exportar, etiqueta, eliminar, seleccionar todos, limpiar) van aquí; la
 * edición de campos se hace en el panel lateral derecho que este mismo
 * componente monta automáticamente al seleccionar.
 */
export function BulkActionsInline({
  modulo,
  scope,
  editFields,
  cols,
  allIds = [],
  canEliminar = false,
  etiquetas = [],
}: {
  modulo: ModuloBulk;
  scope: string;
  editFields: FilterField[];
  cols?: string[];
  allIds?: string[];
  canEliminar?: boolean;
  etiquetas?: Etiqueta[];
}) {
  const router = useRouter();
  const ids = useBulkSelection(scope);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (ids.length === 0) return null;

  const deleteAction = DELETE_ACTION[modulo];
  const todosSeleccionados = allIds.length > 0 && ids.length >= allIds.length;

  async function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    setBusy(true);
    const res = await fn();
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? "Error");
      return;
    }
    clearBulk(scope);
    router.refresh();
  }

  return (
    <>
      {editFields.length > 0 && (
        <BulkEditPanel
          modulo={modulo}
          ids={ids}
          fields={editFields}
          onClose={() => clearBulk(scope)}
          onApplied={() => clearBulk(scope)}
        />
      )}

      <div className="flex flex-wrap items-center gap-2 rounded-md border border-brand-primary/30 bg-blue-50 px-2.5 py-1.5">
        <span className="text-sm font-medium text-brand-primary whitespace-nowrap">{ids.length} sel.</span>

        {allIds.length > 0 && !todosSeleccionados && (
          <button
            type="button"
            onClick={() => selectAllBulk(scope, allIds)}
            className="text-xs font-medium text-brand-primary hover:underline"
          >
            Todos ({allIds.length})
          </button>
        )}

        {modulo === "oportunidades" && etiquetas.length > 0 && (
          <div className="flex items-center gap-1">
            <Tag className="h-3.5 w-3.5 text-gray-500" />
            <select
              defaultValue=""
              disabled={busy}
              onChange={(e) => { if (e.target.value) run(() => bulkEtiquetaAction(ids, e.target.value)); e.target.value = ""; }}
              className="rounded border border-gray-300 bg-white px-2 py-1 text-xs"
              aria-label="Agregar etiqueta"
            >
              <option value="">Etiqueta…</option>
              {etiquetas.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
            </select>
          </div>
        )}

        <ExportButton modulo={modulo} ids={ids} cols={cols} />

        {canEliminar && deleteAction && (
          <button
            type="button"
            disabled={busy}
            onClick={() => { if (confirm(`¿Eliminar ${ids.length} registro(s)? No se podrá deshacer.`)) run(() => deleteAction(ids)); }}
            className="inline-flex items-center gap-1 rounded border border-red-200 bg-white px-2.5 py-1 text-xs text-status-danger hover:bg-red-50 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />} Eliminar
          </button>
        )}

        <button
          type="button"
          onClick={() => clearBulk(scope)}
          className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-white hover:text-gray-700"
        >
          Limpiar
        </button>

        {error && (
          <span role="alert" className="inline-flex max-w-[16rem] items-center gap-1 truncate text-xs text-status-danger" title={error}>
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {error}
          </span>
        )}
      </div>
    </>
  );
}
