"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import type { ItinerarioDia } from "@/lib/cotizacion/types";

/**
 * Editor mínimo de itinerario para el formulario de producto.
 *
 * - Se serializa a un hidden `<input name="itinerario">` con el JSON del array
 *   para que el server action lo reciba en el mismo submit del form.
 * - Usa `_uid` por día como React key (estable, igual que cotización) para no
 *   perder foco al tipear (mismo bug que ya arreglamos en cotización).
 */
type Props = {
  name?: string;
  initial?: ItinerarioDia[];
};

let counter = 0;
const newUid = () => `pi-${++counter}`;

function ensureUid(d: ItinerarioDia): ItinerarioDia & { _uid: string } {
  return { ...d, _uid: d._uid ?? newUid() };
}

export function ItinerarioMiniEditor({ name = "itinerario", initial = [] }: Props) {
  const [dias, setDias] = useState<Array<ItinerarioDia & { _uid: string }>>(() =>
    initial.map(ensureUid),
  );

  const serializado = useMemo(() => JSON.stringify(dias), [dias]);

  function addDia() {
    setDias((prev) => [
      ...prev,
      { _uid: newUid(), dia: (prev[prev.length - 1]?.dia ?? 0) + 1, titulo: "", descripcion: "", ciudad: "" },
    ]);
  }
  function patchDia(uid: string, patch: Partial<ItinerarioDia>) {
    setDias((prev) => prev.map((d) => (d._uid === uid ? { ...d, ...patch } : d)));
  }
  function removeDia(uid: string) {
    setDias((prev) => prev.filter((d) => d._uid !== uid));
  }
  function moveDia(uid: string, dir: -1 | 1) {
    setDias((prev) => {
      const idx = prev.findIndex((d) => d._uid === uid);
      if (idx < 0) return prev;
      const target = idx + dir;
      if (target < 0 || target >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[target]] = [copy[target], copy[idx]];
      return copy;
    });
  }

  return (
    <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold uppercase text-gray-500">Itinerario</h3>
          <p className="text-xs text-gray-500">Plan día a día. Se hereda a la cotización cuando se agrega este producto a una oportunidad.</p>
        </div>
        <button
          type="button"
          onClick={addDia}
          className="inline-flex items-center gap-1.5 rounded-md bg-brand-navy px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-navy-deep"
        >
          <Plus className="h-3.5 w-3.5" /> Agregar día
        </button>
      </div>

      {dias.length === 0 ? (
        <p className="rounded-md border border-dashed border-gray-300 bg-white py-6 text-center text-xs text-gray-500">
          Sin días cargados. Agregá el primero para definir el plan turístico.
        </p>
      ) : (
        <ul className="space-y-2">
          {dias.map((d, idx) => (
            <li key={d._uid} className="rounded-md border border-gray-200 bg-white p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-brand-navy/10 px-2 py-0.5 text-xs font-bold text-brand-primary">Día {d.dia}</span>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={d.dia}
                    onChange={(ev) => patchDia(d._uid, { dia: Math.max(1, Math.min(99, Number(ev.target.value) || 1)) })}
                    className="w-14 rounded border border-gray-300 px-1 py-0.5 text-xs"
                    aria-label="Número de día"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveDia(d._uid, -1)}
                    disabled={idx === 0}
                    className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30"
                    aria-label="Mover arriba"
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveDia(d._uid, 1)}
                    disabled={idx === dias.length - 1}
                    className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30"
                    aria-label="Mover abajo"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeDia(d._uid)}
                    className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-status-danger"
                    aria-label="Eliminar día"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                <input
                  type="text"
                  value={d.titulo ?? ""}
                  onChange={(ev) => patchDia(d._uid, { titulo: ev.target.value })}
                  placeholder="Título (ej. Llegada a Cartagena)"
                  className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                />
                <input
                  type="text"
                  value={d.ciudad ?? ""}
                  onChange={(ev) => patchDia(d._uid, { ciudad: ev.target.value })}
                  placeholder="Ciudad / ubicación"
                  className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                />
              </div>
              <textarea
                value={d.descripcion ?? ""}
                onChange={(ev) => patchDia(d._uid, { descripcion: ev.target.value })}
                placeholder="Descripción del día (actividades, comidas, traslados…)"
                rows={2}
                className="mt-2 w-full rounded border border-gray-300 px-2 py-1 text-sm"
              />
            </li>
          ))}
        </ul>
      )}

      <input type="hidden" name={name} value={serializado} />
    </div>
  );
}
