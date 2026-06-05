"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPinned, Plus, Pencil, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import type { Territorio } from "@/lib/db/territorios";
import { guardarTerritorioAction, eliminarTerritorioAction, asignarTerritorioAction } from "./actions";

function money(v: number, m: string) {
  return new Intl.NumberFormat("es", { style: "currency", currency: m || "USD", maximumFractionDigits: 0 }).format(v);
}

export function TerritoriosManager({
  initial,
  asesores,
}: {
  initial: Territorio[];
  asesores: { id: string; nombre: string; territorio_id: string | null }[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<Territorio | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function onDelete(t: Territorio) {
    if (!confirm(`¿Eliminar el territorio "${t.nombre}"?`)) return;
    const res = await eliminarTerritorioAction(t.id);
    if (!res.ok) setError(res.error ?? "Error"); else router.refresh();
  }
  async function reasignar(usuarioId: string, territorioId: string | null) {
    setBusy(usuarioId);
    const res = await asignarTerritorioAction(usuarioId, territorioId);
    setBusy(null);
    if (!res.ok) setError(res.error ?? "Error"); else router.refresh();
  }

  if (creating || editing) {
    return (
      <Form
        editing={editing}
        onDone={() => { setCreating(false); setEditing(null); router.refresh(); }}
        onCancel={() => { setCreating(false); setEditing(null); }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-status-danger">{error}</div>}

      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">Zonas comerciales con meta. Asigná vendedores externos a cada zona y seguí el cumplimiento.</p>
        <Button type="button" size="sm" onClick={() => setCreating(true)} className="inline-flex items-center gap-1.5">
          <Plus className="h-4 w-4" /> Nuevo territorio
        </Button>
      </div>

      {/* Lista de territorios + KPI */}
      {initial.length === 0 ? (
        <p className="rounded-lg border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">Sin territorios. Creá zonas (ej: Norte, Sur, Bogotá…).</p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {initial.map((t) => (
            <li key={t.id} className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <MapPinned className={`h-4 w-4 ${t.activo ? "text-brand-primary" : "text-gray-300"}`} />
                    <h3 className="truncate font-semibold text-gray-900">{t.nombre}</h3>
                    {!t.activo && <Badge variant="default">inactiva</Badge>}
                  </div>
                  {t.descripcion && <p className="mt-0.5 text-xs text-gray-500">{t.descripcion}</p>}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setEditing(t)} className="text-gray-400 hover:text-brand-primary"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => onDelete(t)} className="text-gray-400 hover:text-status-danger"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <Kpi label="Meta" value={money(t.meta, t.moneda)} />
                <Kpi label="Ventas mes" value={money(t.ventas, t.moneda)} />
                <Kpi
                  label="Cumpl."
                  value={t.cumplimiento_pct != null ? `${t.cumplimiento_pct}%` : "—"}
                  tone={t.cumplimiento_pct == null ? "default" : t.cumplimiento_pct >= 100 ? "ok" : t.cumplimiento_pct >= 70 ? "warn" : "off"}
                />
              </div>

              <p className="mt-3 text-xs text-gray-500">
                Asesores: {t.asesores.length === 0 ? <span className="text-gray-400">sin asignar</span> : t.asesores.map((a) => a.nombre).join(", ")}
              </p>
            </li>
          ))}
        </ul>
      )}

      {/* Asignación de asesores */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-bold uppercase text-gray-500">Asignar asesores a territorios</h3>
        <ul className="divide-y divide-gray-100">
          {asesores.map((u) => (
            <li key={u.id} className="flex items-center justify-between gap-3 py-2">
              <span className="text-sm text-gray-800">{u.nombre}</span>
              <Select
                value={u.territorio_id ?? ""}
                onChange={(e) => reasignar(u.id, e.target.value || null)}
                disabled={busy === u.id}
                className="w-44"
              >
                <option value="">— Sin territorio —</option>
                {initial.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
              </Select>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Form({ editing, onDone, onCancel }: { editing: Territorio | null; onDone: () => void; onCancel: () => void }) {
  const [nombre, setNombre] = useState(editing?.nombre ?? "");
  const [descripcion, setDescripcion] = useState(editing?.descripcion ?? "");
  const [meta, setMeta] = useState(editing?.meta != null ? String(editing.meta) : "0");
  const [moneda, setMoneda] = useState(editing?.moneda ?? "USD");
  const [activo, setActivo] = useState(editing?.activo ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    setSaving(true);
    const res = await guardarTerritorioAction(editing?.id ?? null, {
      nombre, descripcion: descripcion || null, meta: Number(meta) || 0, moneda, activo,
    });
    setSaving(false);
    if (!res.ok) return setError(res.error ?? "Error");
    onDone();
  }

  return (
    <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-5">
      {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-status-danger">{error}</div>}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Field label="Nombre"><Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Bogotá Norte" /></Field>
        <Field label="Descripción (opcional)"><Input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} /></Field>
        <Field label="Meta mensual">
          <div className="flex gap-2">
            <Input type="number" min="0" value={meta} onChange={(e) => setMeta(e.target.value)} />
            <Select value={moneda} onChange={(e) => setMoneda(e.target.value)} className="w-24">
              {["USD","ARS","COP","MXN","EUR"].map((m) => <option key={m} value={m}>{m}</option>)}
            </Select>
          </div>
        </Field>
        <label className="flex items-end gap-2 pb-2 text-sm text-gray-700">
          <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} className="h-4 w-4" /> Activa
        </label>
      </div>
      <div className="flex items-center gap-2 border-t border-gray-100 pt-4">
        <Button type="button" onClick={save} disabled={saving}>{saving ? "Guardando…" : editing ? "Guardar cambios" : "Crear territorio"}</Button>
        <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
      </div>
    </div>
  );
}

function Kpi({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "ok" | "warn" | "off" }) {
  const cls = tone === "ok" ? "text-green-700" : tone === "warn" ? "text-amber-700" : tone === "off" ? "text-status-danger" : "text-gray-900";
  return (
    <div className="rounded-md border border-gray-100 bg-gray-50 px-2 py-1.5">
      <p className="text-[10px] uppercase text-gray-400">{label}</p>
      <p className={`text-sm font-semibold ${cls}`}>{value}</p>
    </div>
  );
}
