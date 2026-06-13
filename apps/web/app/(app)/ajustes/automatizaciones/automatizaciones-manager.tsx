"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Zap, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import {
  EVENTOS,
  TIPOS_ACCION,
  ACTIVIDAD_TIPOS,
  type AccionAutomatizacion,
  type EventoAutomatizacion,
} from "@/lib/automatizaciones-types";
import type { Regla } from "@/lib/db/automatizaciones";
import { guardarReglaAction, eliminarReglaAction } from "./actions";

type Etapa = { id: string; nombre: string; pipeline_nombre: string };
type Opt = { id: string; nombre: string };

export function AutomatizacionesManager({
  initial,
  etapas,
  usuarios,
  etiquetas,
}: {
  initial: Regla[];
  etapas: Etapa[];
  usuarios: Opt[];
  etiquetas: Opt[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<Regla | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const eventoLabel = (k: string) => EVENTOS.find((e) => e.key === k)?.label ?? k;

  async function onDelete(r: Regla) {
    if (!confirm(`¿Eliminar la regla "${r.nombre}"?`)) return;
    const res = await eliminarReglaAction(r.id);
    if (!res.ok) setError(res.error ?? "Error");
    else router.refresh();
  }

  if (creating || editing) {
    return (
      <ReglaForm
        editing={editing}
        etapas={etapas}
        usuarios={usuarios}
        etiquetas={etiquetas}
        onDone={() => { setCreating(false); setEditing(null); router.refresh(); }}
        onCancel={() => { setCreating(false); setEditing(null); }}
      />
    );
  }

  return (
    <div className="space-y-3">
      {error && <div role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-sm text-status-danger">{error}</div>}
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">Automatizá tareas, asignaciones y etiquetas según lo que pasa en tus oportunidades.</p>
        <Button type="button" size="sm" onClick={() => setCreating(true)} className="inline-flex items-center gap-1.5">
          <Plus className="h-4 w-4" /> Nueva regla
        </Button>
      </div>

      {initial.length === 0 ? (
        <p className="rounded-lg border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
          Sin reglas todavía. Creá la primera (ej: “Al ganar → crear actividad de bienvenida”).
        </p>
      ) : (
        <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
          {initial.map((r) => (
            <li key={r.id} className="flex items-start justify-between gap-3 p-3.5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Zap className={`h-4 w-4 shrink-0 ${r.activo ? "text-brand-primary" : "text-gray-300"}`} />
                  <span className="font-medium text-gray-900">{r.nombre}</span>
                  {!r.activo && <Badge variant="default">inactiva</Badge>}
                </div>
                <p className="mt-0.5 text-xs text-gray-500">{eventoLabel(r.evento)} · {r.acciones.length} acción(es)</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button onClick={() => setEditing(r)} className="text-gray-400 hover:text-brand-primary" title="Editar"><Pencil className="h-4 w-4" /></button>
                <button onClick={() => onDelete(r)} className="text-gray-400 hover:text-status-danger" title="Eliminar"><Trash2 className="h-4 w-4" /></button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ReglaForm({
  editing,
  etapas,
  usuarios,
  etiquetas,
  onDone,
  onCancel,
}: {
  editing: Regla | null;
  etapas: Etapa[];
  usuarios: Opt[];
  etiquetas: Opt[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const [nombre, setNombre] = useState(editing?.nombre ?? "");
  const [evento, setEvento] = useState<EventoAutomatizacion>(editing?.evento ?? "oportunidad_creada");
  const [etapaId, setEtapaId] = useState<string>(editing?.etapa_id ?? "");
  const [activo, setActivo] = useState(editing?.activo ?? true);
  const [acciones, setAcciones] = useState<AccionAutomatizacion[]>(editing?.acciones ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const necesitaEtapa = EVENTOS.find((e) => e.key === evento)?.necesitaEtapa;

  function addAccion() {
    setAcciones((a) => [...a, { tipo: "crear_actividad", actividad_tipo: "llamada", dias: 1, descripcion: "" }]);
  }
  function updateAccion(i: number, accion: AccionAutomatizacion) {
    setAcciones((a) => a.map((x, idx) => (idx === i ? accion : x)));
  }
  function removeAccion(i: number) {
    setAcciones((a) => a.filter((_, idx) => idx !== i));
  }

  async function save() {
    setError(null);
    if (!nombre.trim()) return setError("Poné un nombre a la regla.");
    if (acciones.length === 0) return setError("Agregá al menos una acción.");
    setSaving(true);
    const res = await guardarReglaAction(editing?.id ?? null, {
      nombre,
      evento,
      etapa_id: necesitaEtapa && etapaId ? etapaId : null,
      acciones,
      activo,
    });
    setSaving(false);
    if (!res.ok) return setError(res.error ?? "Error");
    onDone();
  }

  return (
    <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-5">
      {error && <div role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-sm text-status-danger">{error}</div>}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Nombre de la regla">
          <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Seguimiento al crear" />
        </Field>
        <Field label="Cuándo (evento)">
          <Select value={evento} onChange={(e) => setEvento(e.target.value as EventoAutomatizacion)}>
            {EVENTOS.map((ev) => <option key={ev.key} value={ev.key}>{ev.label}</option>)}
          </Select>
        </Field>
        {necesitaEtapa && (
          <Field label="Etapa (opcional: cualquiera si vacío)">
            <Select value={etapaId} onChange={(e) => setEtapaId(e.target.value)}>
              <option value="">Cualquier etapa</option>
              {etapas.map((et) => <option key={et.id} value={et.id}>{et.pipeline_nombre} · {et.nombre}</option>)}
            </Select>
          </Field>
        )}
      </div>

      {/* Acciones */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase text-gray-500">Acciones</p>
        {acciones.map((accion, i) => (
          <div key={i} className="flex flex-wrap items-end gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
            <div className="w-48">
              <label className="mb-1 block text-xs text-gray-500">Acción</label>
              <Select
                value={accion.tipo}
                onChange={(e) => {
                  const tipo = e.target.value as AccionAutomatizacion["tipo"];
                  if (tipo === "crear_actividad") updateAccion(i, { tipo, actividad_tipo: "llamada", dias: 1, descripcion: "" });
                  else if (tipo === "asignar") updateAccion(i, { tipo, usuario_id: usuarios[0]?.id ?? "" });
                  else updateAccion(i, { tipo, etiqueta_id: etiquetas[0]?.id ?? "" });
                }}
              >
                {TIPOS_ACCION.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
              </Select>
            </div>

            {accion.tipo === "crear_actividad" && (
              <>
                <div className="w-32">
                  <label className="mb-1 block text-xs text-gray-500">Tipo</label>
                  <Select value={accion.actividad_tipo} onChange={(e) => updateAccion(i, { ...accion, actividad_tipo: e.target.value as "llamada" })}>
                    {ACTIVIDAD_TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </Select>
                </div>
                <div className="w-24">
                  <label className="mb-1 block text-xs text-gray-500">En (días)</label>
                  <Input type="number" min="0" value={accion.dias} onChange={(e) => updateAccion(i, { ...accion, dias: Number(e.target.value) })} />
                </div>
                <div className="min-w-40 flex-1">
                  <label className="mb-1 block text-xs text-gray-500">Descripción</label>
                  <Input value={accion.descripcion} onChange={(e) => updateAccion(i, { ...accion, descripcion: e.target.value })} placeholder="Ej: Llamar para confirmar" />
                </div>
              </>
            )}
            {accion.tipo === "asignar" && (
              <div className="min-w-48 flex-1">
                <label className="mb-1 block text-xs text-gray-500">Asignar a</label>
                <Select value={accion.usuario_id} onChange={(e) => updateAccion(i, { ...accion, usuario_id: e.target.value })}>
                  {usuarios.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                </Select>
              </div>
            )}
            {accion.tipo === "etiquetar" && (
              <div className="min-w-48 flex-1">
                <label className="mb-1 block text-xs text-gray-500">Etiqueta</label>
                <Select value={accion.etiqueta_id} onChange={(e) => updateAccion(i, { ...accion, etiqueta_id: e.target.value })}>
                  {etiquetas.length === 0 && <option value="">— Creá etiquetas primero —</option>}
                  {etiquetas.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                </Select>
              </div>
            )}

            <button onClick={() => removeAccion(i)} className="mb-1.5 text-gray-400 hover:text-status-danger" title="Quitar"><X className="h-4 w-4" /></button>
          </div>
        ))}
        <Button type="button" size="sm" variant="ghost" onClick={addAccion} className="inline-flex items-center gap-1.5">
          <Plus className="h-4 w-4" /> Agregar acción
        </Button>
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} className="h-4 w-4" />
        Regla activa
      </label>

      <div className="flex items-center gap-2 border-t border-gray-100 pt-4">
        <Button type="button" onClick={save} disabled={saving}>{saving ? "Guardando…" : editing ? "Guardar cambios" : "Crear regla"}</Button>
        <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
      </div>
    </div>
  );
}
