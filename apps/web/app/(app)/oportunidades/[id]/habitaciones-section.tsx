"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BedDouble, Plus, Trash2, AlertTriangle, Check } from "lucide-react";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  HABITACION_CAP,
  HABITACION_LABEL,
  TIPOS_HABITACION,
  validarHabitaciones,
  type HabLite,
  type PaxLite,
  type TipoHabitacion,
} from "@/lib/habitaciones-types";
import { crearHabitacionAction, eliminarHabitacionAction, asignarPasajeroAction } from "./habitaciones-actions";

const TIPO_PAX: Record<string, string> = { adulto: "A", nino: "N", bebe: "B" };

export function HabitacionesSection({
  oportunidadId,
  habitaciones,
  pasajeros,
  canEdit,
}: {
  oportunidadId: string;
  habitaciones: HabLite[];
  pasajeros: PaxLite[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pax, setPax] = useState<PaxLite[]>(pasajeros);
  // Re-sync cuando el server re-renderiza con nuevos pasajeros (post router.refresh).
  useEffect(() => { setPax(pasajeros); }, [pasajeros]);
  const [nuevoTipo, setNuevoTipo] = useState<TipoHabitacion>("doble");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const validacion = validarHabitaciones(habitaciones, pax);

  async function agregar() {
    setError(null); setBusy(true);
    const res = await crearHabitacionAction(oportunidadId, nuevoTipo);
    setBusy(false);
    if (!res.ok) setError(res.error ?? "Error"); else router.refresh();
  }
  async function quitar(id: string) {
    setError(null);
    const res = await eliminarHabitacionAction(id, oportunidadId);
    if (!res.ok) setError(res.error ?? "Error"); else router.refresh();
  }
  async function asignar(pasajeroId: string, habitacionId: string | null) {
    setPax((arr) => arr.map((p) => (p.id === pasajeroId ? { ...p, habitacion_id: habitacionId } : p)));
    const res = await asignarPasajeroAction(pasajeroId, habitacionId, oportunidadId);
    if (!res.ok) { setError(res.error ?? "Error"); router.refresh(); }
  }

  if (pasajeros.length === 0) {
    return (
      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase text-gray-500"><BedDouble className="h-4 w-4" /> Habitaciones</h2>
        <p className="mt-2 text-sm text-gray-500">Primero cargá los pasajeros; después los distribuís en habitaciones.</p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase text-gray-500"><BedDouble className="h-4 w-4" /> Habitaciones</h2>
        {canEdit && (
          <div className="flex items-center gap-2">
            <Select
              aria-label="Tipo de habitación a agregar"
              title="Tipo de habitación a agregar"
              value={nuevoTipo}
              onChange={(e) => setNuevoTipo(e.target.value as TipoHabitacion)}
              className="w-32"
            >
              {TIPOS_HABITACION.map((t) => <option key={t} value={t}>{HABITACION_LABEL[t]} ({HABITACION_CAP[t]})</option>)}
            </Select>
            <Button type="button" size="sm" onClick={agregar} disabled={busy} className="inline-flex items-center gap-1.5">
              <Plus className="h-4 w-4" /> Habitación
            </Button>
          </div>
        )}
      </div>

      {error && <div role="alert" className="mb-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-status-danger">{error}</div>}

      {/* Validación */}
      {validacion.ok ? (
        <div className="mb-3 flex items-center gap-2 rounded border border-green-200 bg-green-50 p-2.5 text-sm text-green-800">
          <Check className="h-4 w-4" /> Distribución válida ({habitaciones.length} habitación(es) · {pax.length} pasajeros).
        </div>
      ) : (
        <div className="mb-3 rounded border border-amber-200 bg-amber-50 p-2.5 text-sm text-amber-800">
          <p className="mb-1 flex items-center gap-1.5 font-medium"><AlertTriangle className="h-4 w-4" /> Revisá la distribución:</p>
          <ul className="ml-5 list-disc space-y-0.5">
            {validacion.errores.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </div>
      )}

      {/* Habitaciones con ocupantes */}
      {habitaciones.length > 0 && (
        <div className="mb-4 grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
          {habitaciones.map((h) => {
            const ocupantes = pax.filter((p) => p.habitacion_id === h.id);
            const cap = HABITACION_CAP[h.tipo];
            const over = ocupantes.length > cap;
            const sinAdulto = ocupantes.length > 0 && !ocupantes.some((p) => p.tipo === "adulto");
            return (
              <div key={h.id} className={`rounded-lg border p-3 ${over || sinAdulto ? "border-amber-300 bg-amber-50/40" : "border-gray-200"}`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">Hab {h.orden} · {HABITACION_LABEL[h.tipo]}</span>
                  <span className="flex items-center gap-2">
                    <span className={`text-xs ${over ? "font-semibold text-amber-700" : "text-gray-400"}`}>{ocupantes.length}/{cap}</span>
                    {canEdit && <button onClick={() => quitar(h.id)} className="text-gray-400 hover:text-status-danger"><Trash2 className="h-3.5 w-3.5" /></button>}
                  </span>
                </div>
                {ocupantes.length === 0 ? (
                  <p className="mt-1 text-xs text-gray-400">vacía</p>
                ) : (
                  <ul className="mt-1 space-y-0.5">
                    {ocupantes.map((p) => (
                      <li key={p.id} className="text-xs text-gray-600">• {p.nombre} <span className="text-gray-400">({TIPO_PAX[p.tipo]})</span></li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Asignación por pasajero */}
      <div className="overflow-hidden rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-3 py-2 font-medium">Pasajero</th>
              <th className="px-3 py-2 font-medium">Tipo</th>
              <th className="px-3 py-2 font-medium w-44">Habitación</th>
            </tr>
          </thead>
          <tbody>
            {pax.map((p) => (
              <tr key={p.id} className="border-t border-gray-100">
                <td className="px-3 py-2 font-medium text-gray-900">{p.nombre}</td>
                <td className="px-3 py-2 text-gray-600">{p.tipo === "adulto" ? "Adulto" : p.tipo === "nino" ? "Niño" : "Bebé"}</td>
                <td className="px-3 py-2">
                  <Select
                    aria-label={`Habitación asignada a ${p.nombre}`}
                    title={`Habitación asignada a ${p.nombre}`}
                    value={p.habitacion_id ?? ""}
                    onChange={(e) => asignar(p.id, e.target.value || null)}
                    disabled={!canEdit || habitaciones.length === 0}
                  >
                    <option value="">— Sin asignar —</option>
                    {habitaciones.map((h) => <option key={h.id} value={h.id}>Hab {h.orden} · {HABITACION_LABEL[h.tipo]}</option>)}
                  </Select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
