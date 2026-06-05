"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, ListOrdered, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { PASO_TIPOS, type PasoSecuencia } from "@/lib/secuencias-types";
import type { Secuencia } from "@/lib/db/secuencias";
import { guardarSecuenciaAction, eliminarSecuenciaAction } from "./actions";

export function SecuenciasManager({ initial }: { initial: Secuencia[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Secuencia | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDelete(s: Secuencia) {
    if (!confirm(`¿Eliminar la secuencia "${s.nombre}"?`)) return;
    const res = await eliminarSecuenciaAction(s.id);
    if (!res.ok) setError(res.error ?? "Error");
    else router.refresh();
  }

  if (creating || editing) {
    return (
      <SecuenciaForm
        editing={editing}
        onDone={() => { setCreating(false); setEditing(null); router.refresh(); }}
        onCancel={() => { setCreating(false); setEditing(null); }}
      />
    );
  }

  return (
    <div className="space-y-3">
      {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-status-danger">{error}</div>}
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">Plantillas de seguimiento. Al inscribir una oportunidad se generan las actividades fechadas.</p>
        <Button type="button" size="sm" onClick={() => setCreating(true)} className="inline-flex items-center gap-1.5">
          <Plus className="h-4 w-4" /> Nueva secuencia
        </Button>
      </div>

      {initial.length === 0 ? (
        <p className="rounded-lg border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
          Sin secuencias. Creá una (ej: “Nutrición: correo día 0, llamada día 2, reunión día 5”).
        </p>
      ) : (
        <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
          {initial.map((s) => (
            <li key={s.id} className="flex items-start justify-between gap-3 p-3.5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <ListOrdered className={`h-4 w-4 shrink-0 ${s.activo ? "text-brand-primary" : "text-gray-300"}`} />
                  <span className="font-medium text-gray-900">{s.nombre}</span>
                  {!s.activo && <Badge variant="default">inactiva</Badge>}
                  <span className="text-xs text-gray-400">{s.pasos.length} pasos</span>
                </div>
                {s.descripcion && <p className="mt-0.5 text-xs text-gray-500">{s.descripcion}</p>}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button onClick={() => setEditing(s)} className="text-gray-400 hover:text-brand-primary" title="Editar"><Pencil className="h-4 w-4" /></button>
                <button onClick={() => onDelete(s)} className="text-gray-400 hover:text-status-danger" title="Eliminar"><Trash2 className="h-4 w-4" /></button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SecuenciaForm({ editing, onDone, onCancel }: { editing: Secuencia | null; onDone: () => void; onCancel: () => void }) {
  const [nombre, setNombre] = useState(editing?.nombre ?? "");
  const [descripcion, setDescripcion] = useState(editing?.descripcion ?? "");
  const [activo, setActivo] = useState(editing?.activo ?? true);
  const [pasos, setPasos] = useState<PasoSecuencia[]>(editing?.pasos ?? [{ actividad_tipo: "email", dias: 0, descripcion: "" }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(i: number, paso: PasoSecuencia) { setPasos((p) => p.map((x, idx) => (idx === i ? paso : x))); }
  function remove(i: number) { setPasos((p) => p.filter((_, idx) => idx !== i)); }
  function add() { setPasos((p) => [...p, { actividad_tipo: "llamada", dias: (p[p.length - 1]?.dias ?? 0) + 2, descripcion: "" }]); }

  async function save() {
    setError(null);
    if (!nombre.trim()) return setError("Poné un nombre.");
    if (pasos.length === 0) return setError("Agregá al menos un paso.");
    setSaving(true);
    const res = await guardarSecuenciaAction(editing?.id ?? null, { nombre, descripcion: descripcion || null, pasos, activo });
    setSaving(false);
    if (!res.ok) return setError(res.error ?? "Error");
    onDone();
  }

  return (
    <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-5">
      {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-status-danger">{error}</div>}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Nombre"><Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Nutrición de lead" /></Field>
        <Field label="Descripción (opcional)"><Input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} /></Field>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase text-gray-500">Pasos</p>
        {pasos.map((paso, i) => (
          <div key={i} className="flex flex-wrap items-end gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
            <span className="mb-1.5 text-xs font-semibold text-gray-400">#{i + 1}</span>
            <div className="w-32">
              <label className="mb-1 block text-xs text-gray-500">Tipo</label>
              <Select value={paso.actividad_tipo} onChange={(e) => update(i, { ...paso, actividad_tipo: e.target.value as "llamada" })}>
                {PASO_TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
              </Select>
            </div>
            <div className="w-24">
              <label className="mb-1 block text-xs text-gray-500">Día</label>
              <Input type="number" min="0" value={paso.dias} onChange={(e) => update(i, { ...paso, dias: Number(e.target.value) })} />
            </div>
            <div className="min-w-40 flex-1">
              <label className="mb-1 block text-xs text-gray-500">Descripción</label>
              <Input value={paso.descripcion} onChange={(e) => update(i, { ...paso, descripcion: e.target.value })} placeholder="Ej: Enviar propuesta" />
            </div>
            <button onClick={() => remove(i)} className="mb-1.5 text-gray-400 hover:text-status-danger"><X className="h-4 w-4" /></button>
          </div>
        ))}
        <Button type="button" size="sm" variant="ghost" onClick={add} className="inline-flex items-center gap-1.5">
          <Plus className="h-4 w-4" /> Agregar paso
        </Button>
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} className="h-4 w-4" /> Secuencia activa
      </label>

      <div className="flex items-center gap-2 border-t border-gray-100 pt-4">
        <Button type="button" onClick={save} disabled={saving}>{saving ? "Guardando…" : editing ? "Guardar cambios" : "Crear secuencia"}</Button>
        <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
      </div>
    </div>
  );
}
