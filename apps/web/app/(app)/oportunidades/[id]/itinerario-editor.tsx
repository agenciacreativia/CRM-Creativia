"use client";

import { Plus, Trash2, Coffee, UtensilsCrossed, Moon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { ItinerarioDia } from "@/lib/cotizacion/types";

type Comida = "desayuno" | "almuerzo" | "cena";
const COMIDAS: { key: Comida; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "desayuno", label: "Desayuno", icon: Coffee },
  { key: "almuerzo", label: "Almuerzo", icon: UtensilsCrossed },
  { key: "cena", label: "Cena", icon: Moon },
];

function newUid(): string {
  return `it-${Math.random().toString(36).slice(2, 10)}-${Date.now()}`;
}

/** Garantiza que cada día tenga un _uid persistente — los ítems que ya tienen uno
 *  se respetan; los recién creados (p.ej. desde la BD vieja) reciben uno nuevo. */
function ensureUid(arr: ItinerarioDia[]): ItinerarioDia[] {
  return arr.map((d) => (d._uid ? d : { ...d, _uid: newUid() }));
}

export function ItinerarioEditor({
  itinerario,
  onChange,
}: {
  itinerario: ItinerarioDia[];
  onChange: (next: ItinerarioDia[]) => void;
}) {
  // Trabajamos siempre sobre la lista con _uid garantizado.
  const items = itinerario.every((d) => d._uid) ? itinerario : ensureUid(itinerario);
  function addDay() {
    const next: ItinerarioDia = {
      _uid: newUid(),
      dia: items.length + 1,
      titulo: "",
      ciudad: null,
      descripcion: null,
      incluye_comidas: [] as Comida[],
    };
    onChange([...items, next]);
  }
  function update(i: number, patch: Partial<ItinerarioDia>) {
    // Preservamos _uid del día editado (no se incluye en el patch).
    onChange(items.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));
  }
  function remove(i: number) {
    onChange(items.filter((_, idx) => idx !== i).map((d, idx) => ({ ...d, dia: idx + 1 })));
  }
  function move(i: number, delta: number) {
    const j = i + delta;
    if (j < 0 || j >= items.length) return;
    const arr = [...items];
    [arr[i], arr[j]] = [arr[j], arr[i]];
    onChange(arr.map((d, idx) => ({ ...d, dia: idx + 1 })));
  }
  function toggleComida(i: number, k: Comida) {
    const set = new Set(items[i].incluye_comidas ?? []);
    if (set.has(k)) set.delete(k); else set.add(k);
    update(i, { incluye_comidas: [...set] as Comida[] });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">Itinerario día por día (se imprime con la cotización).</p>
        <Button type="button" size="sm" variant="ghost" onClick={addDay} className="inline-flex items-center gap-1.5">
          <Plus className="h-4 w-4" /> Agregar día
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="rounded border border-dashed border-gray-200 p-4 text-center text-xs text-gray-400">Sin itinerario aún.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((d, i) => (
            // key estable: _uid persistente por item para no perder foco al editar.
            <li key={d._uid ?? `it-${i}`} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <div className="flex items-start gap-2">
                <div className="mt-1 flex flex-col items-center gap-0.5">
                  <button type="button" onClick={() => move(i, -1)} aria-label={`Subir día ${d.dia}`} className="text-gray-300 hover:text-gray-600" title="Subir">▲</button>
                  <span className="rounded-full bg-brand-primary px-2 py-0.5 text-xs font-bold text-white">{d.dia}</span>
                  <button type="button" onClick={() => move(i, 1)} aria-label={`Bajar día ${d.dia}`} className="text-gray-300 hover:text-gray-600" title="Bajar">▼</button>
                </div>
                <div className="flex-1 space-y-1.5">
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                    <Input value={d.titulo} onChange={(e) => update(i, { titulo: e.target.value })} placeholder="Título del día (ej: Llegada a París)" className="md:col-span-2" />
                    <Input value={d.ciudad ?? ""} onChange={(e) => update(i, { ciudad: e.target.value || null })} placeholder="Ciudad" />
                  </div>
                  <Textarea
                    rows={2}
                    value={d.descripcion ?? ""}
                    onChange={(e) => update(i, { descripcion: e.target.value || null })}
                    placeholder="Detalle del día (paseos, hoteles, traslados…)"
                  />
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-gray-500">Comidas:</span>
                    {COMIDAS.map(({ key, label, icon: Icon }) => {
                      const on = (d.incluye_comidas ?? []).includes(key);
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => toggleComida(i, key)}
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition ${on ? "border-brand-primary bg-blue-50 text-brand-primary" : "border-gray-300 bg-white text-gray-500 hover:bg-gray-50"}`}
                        >
                          <Icon className="h-3 w-3" /> {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <button type="button" onClick={() => remove(i)} className="text-gray-400 hover:text-status-danger" title="Eliminar día">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

