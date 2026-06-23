"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Check, AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { setAsesoresPipelineAction } from "./asesores-actions";

export type AsesorCargaUI = { usuario_id: string; nombre: string; email: string; peso: number };
export type UsuarioLite = { id: string; nombre: string; email: string; rol: string };

export function AsesoresRR({
  pipelineId,
  cargasIniciales,
  usuarios,
}: {
  pipelineId: string;
  cargasIniciales: AsesorCargaUI[];
  usuarios: UsuarioLite[];
}) {
  const router = useRouter();
  const [cargas, setCargas] = useState<AsesorCargaUI[]>(cargasIniciales);
  const [agregarId, setAgregarId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const total = cargas.reduce((s, c) => s + (Number(c.peso) || 0), 0);
  const enabled = total === 100 || cargas.length === 0;

  const disponibles = usuarios.filter(
    (u) => u.rol !== "admin_plataforma" && !cargas.some((c) => c.usuario_id === u.id),
  );

  function agregar() {
    if (!agregarId) return;
    const u = usuarios.find((x) => x.id === agregarId);
    if (!u) return;
    // El nuevo asesor entra con peso 0 — el admin lo ajusta a mano.
    setCargas((arr) => [...arr, { usuario_id: u.id, nombre: u.nombre, email: u.email, peso: 0 }]);
    setAgregarId("");
    setOk(false);
  }

  function quitar(id: string) {
    setCargas((arr) => arr.filter((c) => c.usuario_id !== id));
    setOk(false);
  }

  function setPeso(id: string, v: string) {
    const n = Math.max(0, Math.min(100, Number(v) || 0));
    setCargas((arr) => arr.map((c) => (c.usuario_id === id ? { ...c, peso: n } : c)));
    setOk(false);
  }

  /** Reparte el restante en partes iguales. Útil al agregar/quitar asesores. */
  function distribuirIgual() {
    if (cargas.length === 0) return;
    const base = Math.floor(100 / cargas.length);
    const sobra = 100 - base * cargas.length;
    setCargas((arr) => arr.map((c, i) => ({ ...c, peso: base + (i < sobra ? 1 : 0) })));
    setOk(false);
  }

  async function guardar() {
    setError(null); setOk(false); setSaving(true);
    const res = await setAsesoresPipelineAction(
      pipelineId,
      cargas.map(({ usuario_id, peso }) => ({ usuario_id, peso })),
    );
    setSaving(false);
    if (res.ok) {
      setOk(true);
      router.refresh();
    } else {
      setError(res.error);
    }
  }

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5">
      <header className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase text-gray-500">
            <Users className="h-4 w-4" /> Distribución de leads (round-robin)
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            Asignación automática de leads nuevos (sin asesor en el payload del webhook).
            La suma de pesos debe ser exactamente 100.
          </p>
        </div>
      </header>

      {/* Lista de asesores con carga */}
      <div className="space-y-2">
        {cargas.length === 0 ? (
          <p className="rounded border border-dashed border-gray-200 p-4 text-center text-sm text-gray-400">
            Sin asesores configurados. Los leads van a quedar sin asignar.
          </p>
        ) : (
          cargas.map((c) => (
            <div key={c.usuario_id} className="flex items-center gap-3 rounded border border-gray-200 p-2.5">
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-gray-900">{c.nombre}</p>
                <p className="truncate text-xs text-gray-500">{c.email}</p>
              </div>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={c.peso}
                  onChange={(e) => setPeso(c.usuario_id, e.target.value)}
                  className="w-20 text-right"
                />
                <span className="text-sm text-gray-400">%</span>
              </div>
              <button
                type="button"
                onClick={() => quitar(c.usuario_id)}
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-status-danger"
                title="Quitar asesor"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Agregar asesor */}
      {disponibles.length > 0 && (
        <div className="mt-3 flex items-center gap-2">
          <Select value={agregarId} onChange={(e) => setAgregarId(e.target.value)} className="flex-1">
            <option value="">+ Agregar asesor…</option>
            {disponibles.map((u) => (
              <option key={u.id} value={u.id}>{u.nombre} — {u.email}</option>
            ))}
          </Select>
          <Button type="button" size="sm" onClick={agregar} disabled={!agregarId}>Agregar</Button>
        </div>
      )}

      {/* Total + acciones */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-3">
        <div className="flex items-center gap-3 text-sm">
          <span className="text-gray-500">Total:</span>
          <span
            className={`font-bold ${
              cargas.length === 0
                ? "text-gray-400"
                : total === 100
                  ? "text-status-ok"
                  : "text-amber-600"
            }`}
          >
            {total}% {cargas.length > 0 && total !== 100 && <AlertTriangle className="inline h-3.5 w-3.5" />}
          </span>
          {cargas.length > 1 && (
            <button
              type="button"
              onClick={distribuirIgual}
              className="text-xs text-brand-primary hover:underline"
            >
              Repartir igual
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {ok && <span className="flex items-center gap-1 text-xs text-status-ok"><Check className="h-3.5 w-3.5" /> Guardado</span>}
          {error && <span className="text-xs text-status-danger">{error}</span>}
          <Button type="button" onClick={guardar} disabled={!enabled || saving}>
            {saving ? "Guardando…" : "Guardar"}
          </Button>
        </div>
      </div>
    </section>
  );
}
