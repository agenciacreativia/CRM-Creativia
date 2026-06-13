"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Loader2, Check, AlertTriangle } from "lucide-react";
import type { FilterField } from "@/lib/filters/types";
import { bulkActualizarAction } from "./bulk-update-actions";
import type { ModuloBulk } from "@/lib/bulk/editable-fields";

/**
 * Panel lateral (slide-over izquierdo) de actualización masiva. Muestra TODOS
 * los campos editables del módulo (nativos + personalizados) con sus opciones.
 * El usuario tilda "Actualizar" en cada campo que quiera tocar, setea el valor
 * y aplica a todos los registros seleccionados.
 */
export function BulkEditPanel({
  modulo,
  ids,
  fields,
  onClose,
  onApplied,
}: {
  modulo: ModuloBulk;
  ids: string[];
  fields: FilterField[];
  onClose: () => void;
  onApplied?: () => void;
}) {
  const router = useRouter();
  // Un campo se incluye en la actualización en cuanto el usuario lo "toca"
  // (cambia su valor). Así no hace falta un checkbox por campo: editás lo que
  // querés cambiar y se aplica solo eso.
  const [tocados, setTocados] = useState<Set<string>>(new Set());
  const [valores, setValores] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  function setValor(key: string, value: string) {
    setValores((v) => ({ ...v, [key]: value }));
    setTocados((s) => new Set(s).add(key));
  }

  // Cerrar con Escape (regla de accesibilidad: ruta de escape en sheets/modales).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function aplicar() {
    setError(null);
    setOkMsg(null);
    const cambios = [...tocados].map((field) => ({ field, value: valores[field] ?? "" }));
    if (cambios.length === 0) {
      setError("Modificá al menos un campo para actualizar.");
      return;
    }
    setBusy(true);
    const res = await bulkActualizarAction(modulo, ids, cambios);
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? "No se pudo actualizar.");
      return;
    }
    setOkMsg(`${res.afectados ?? ids.length} registro(s) actualizado(s).`);
    router.refresh();
    onApplied?.();
  }

  return (
    <>
      {/* Panel acoplado a la derecha, SIN backdrop bloqueante: el usuario puede
          seguir tildando filas mientras edita. Arranca bajo el topbar (top-14)
          para no taparlo. Entra con slide-in. En mobile ocupa todo el ancho. */}
      <div className="animate-panel-in fixed bottom-0 right-0 top-14 z-50 flex w-full max-w-md flex-col border-l border-gray-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Actualización masiva</h2>
            <p className="text-xs text-gray-500">{ids.length} registro(s) seleccionado(s)</p>
          </div>
          <button type="button" onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700" aria-label="Cerrar">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
          {fields.map((f) => {
            const tocado = tocados.has(f.key);
            return (
              <div key={f.key} className={`rounded-lg border px-3 py-2 ${tocado ? "border-brand-primary/40 bg-blue-50/40" : "border-gray-200"}`}>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-800">{f.label}</span>
                  {f.custom && <span className="ml-auto text-[11px] uppercase tracking-wide text-gray-400">personalizado</span>}
                </div>
                <div className="mt-2">
                  <FieldInput field={f} value={valores[f.key] ?? ""} onChange={(v) => setValor(f.key, v)} />
                </div>
              </div>
            );
          })}
          {fields.length === 0 && <p className="px-2 py-6 text-center text-sm text-gray-500">No hay campos editables.</p>}
        </div>

        <div className="border-t border-gray-200 px-4 py-3">
          {error && (
            <p role="alert" className="mb-2 flex items-center gap-1 text-xs text-status-danger">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {error}
            </p>
          )}
          {okMsg && <p className="mb-2 inline-flex items-center gap-1 text-xs text-status-success"><Check className="h-3.5 w-3.5" /> {okMsg}</p>}
          <div className="flex items-center justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">
              Cerrar
            </button>
            <button
              type="button"
              onClick={aplicar}
              disabled={busy || tocados.size === 0}
              className="inline-flex items-center gap-1.5 rounded-md bg-brand-navy px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-navy-deep disabled:opacity-50"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Aplicar a {ids.length}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function FieldInput({ field, value, onChange }: { field: FilterField; value: string; onChange: (v: string) => void }) {
  const cls = "w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm focus:border-brand-navy focus:outline-none";

  if (field.type === "booleano") {
    return (
      <select value={value} onChange={(e) => onChange(e.target.value)} className={cls}>
        <option value="">—</option>
        <option value="true">Sí</option>
        <option value="false">No</option>
      </select>
    );
  }
  if (field.type === "seleccion") {
    return (
      <select value={value} onChange={(e) => onChange(e.target.value)} className={cls}>
        <option value="">{field.key === "asignado_id" ? "(sin asignar)" : "—"}</option>
        {(field.options ?? []).map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    );
  }
  if (field.type === "numero") {
    return <input type="number" value={value} onChange={(e) => onChange(e.target.value)} className={cls} placeholder="Valor numérico" />;
  }
  if (field.type === "fecha") {
    return <input type="date" value={value} onChange={(e) => onChange(e.target.value)} className={cls} />;
  }
  return <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className={cls} placeholder="Nuevo valor" />;
}
