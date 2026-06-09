"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Check, Package2, Power } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import {
  PLAN_MODULES,
  PLAN_ACTIONS,
  HERRAMIENTAS,
  HERRAMIENTA_GRUPOS,
  LIMITES,
  emptyModulos,
  contarModulos,
  contarHerramientas,
  type PlanModulos,
  type PlanHerramientas,
  type PlanLimites,
  type ModuleKey,
  type ModulePerms,
  type HerramientaKey,
} from "@/lib/plans";
import type { Plan } from "@/lib/db/planes";
import { createPlanAction, updatePlanAction, deletePlanAction, togglePlanAction } from "./actions";

const MONEDAS = ["USD", "ARS", "EUR", "MXN", "COP", "CLP", "PEN", "BRL"];
const PERIODOS: { value: Plan["periodicidad"]; label: string }[] = [
  { value: "mensual", label: "/mes" },
  { value: "anual", label: "/año" },
  { value: "unico", label: "pago único" },
];

function fmtPrecio(v: number, m: string) {
  return new Intl.NumberFormat("es", { style: "currency", currency: m, maximumFractionDigits: 0 }).format(v);
}

export function PlanesManager({ initial }: { initial: Plan[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Plan | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDelete(p: Plan) {
    setError(null);
    if (!confirm(`¿Eliminar el plan "${p.nombre}"?`)) return;
    const res = await deletePlanAction(p.id);
    if (!res.ok) setError(res.error ?? "Error");
    else router.refresh();
  }

  async function onToggle(p: Plan) {
    const res = await togglePlanAction(p.id, !p.activo);
    if (!res.ok) setError(res.error ?? "Error");
    else router.refresh();
  }

  if (creating || editing) {
    return (
      <PlanForm
        editing={editing}
        existing={initial}
        onDone={() => {
          setCreating(false);
          setEditing(null);
          router.refresh();
        }}
        onCancel={() => {
          setCreating(false);
          setEditing(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-status-danger">{error}</div>}

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{initial.length} planes</p>
        <Button type="button" size="sm" onClick={() => setCreating(true)} className="inline-flex items-center gap-1.5">
          <Plus className="h-4 w-4" /> Nuevo plan
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {initial.map((p) => (
          <div key={p.id} className={`rounded-xl border bg-white p-5 ${p.activo ? "border-gray-200" : "border-gray-200 opacity-60"}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Package2 className="h-5 w-5 text-brand-primary" />
                <h3 className="text-lg font-bold text-gray-900">{p.nombre}</h3>
              </div>
              {!p.activo && <Badge variant="default">inactivo</Badge>}
            </div>

            <p className="mt-1 text-2xl font-bold text-gray-900">
              {fmtPrecio(p.precio, p.moneda)}
              <span className="text-sm font-normal text-gray-400"> {PERIODOS.find((x) => x.value === p.periodicidad)?.label}</span>
            </p>
            {p.descripcion && <p className="mt-1 text-xs text-gray-500">{p.descripcion}</p>}

            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="rounded bg-blue-50 px-2 py-0.5 text-xs text-brand-primary">{contarModulos(p.modulos)} módulos</span>
              <span className="rounded bg-green-50 px-2 py-0.5 text-xs text-green-700">{contarHerramientas(p.herramientas)} herramientas</span>
              {LIMITES.map((l) => {
                const v = p.limites[l.key];
                if (v == null) return null; // ilimitado → no chip
                return (
                  <span key={l.key} className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                    {v} {l.label.toLowerCase()}
                  </span>
                );
              })}
            </div>

            <div className="mt-4 flex items-center gap-3 border-t border-gray-100 pt-3">
              <button onClick={() => setEditing(p)} className="inline-flex items-center gap-1 text-sm text-brand-primary hover:underline">
                <Pencil className="h-3.5 w-3.5" /> Editar
              </button>
              <button onClick={() => onToggle(p)} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
                <Power className="h-3.5 w-3.5" /> {p.activo ? "Desactivar" : "Activar"}
              </button>
              <button onClick={() => onDelete(p)} className="ml-auto text-gray-400 hover:text-status-danger" title="Eliminar">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlanForm({ editing, onDone, onCancel, existing }: { editing: Plan | null; onDone: () => void; onCancel: () => void; existing: Plan[] }) {
  const [nombre, setNombre] = useState(editing?.nombre ?? "");
  const [descripcion, setDescripcion] = useState(editing?.descripcion ?? "");
  const [precio, setPrecio] = useState(editing?.precio ?? 0);
  const [moneda, setMoneda] = useState(editing?.moneda ?? "USD");
  const [periodicidad, setPeriodicidad] = useState<Plan["periodicidad"]>(editing?.periodicidad ?? "mensual");
  const [modulos, setModulos] = useState<PlanModulos>(editing ? editing.modulos : emptyModulos());
  const [herramientas, setHerramientas] = useState<PlanHerramientas>(editing?.herramientas ?? {});
  const [limites, setLimites] = useState<PlanLimites>(editing?.limites ?? {});
  const [activo, setActivo] = useState(editing?.activo ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleMod(mod: ModuleKey, action: keyof ModulePerms) {
    setModulos((m) => {
      const row = { ...m[mod], [action]: !m[mod][action] };
      if (action !== "ver" && row[action]) row.ver = true;
      if (action === "ver" && !row.ver) { row.crear = false; row.editar = false; row.eliminar = false; }
      return { ...m, [mod]: row };
    });
  }
  function toggleModAll(mod: ModuleKey, value: boolean) {
    setModulos((m) => ({ ...m, [mod]: { ver: value, crear: value, editar: value, eliminar: value } }));
  }
  function toggleTool(key: HerramientaKey) {
    setHerramientas((h) => ({ ...h, [key]: !h[key] }));
  }

  async function save() {
    setError(null);
    if (!nombre.trim()) { setError("El nombre es obligatorio."); return; }
    setSaving(true);
    const payload = {
      nombre, descripcion: descripcion || null, precio: Number(precio) || 0, moneda, periodicidad,
      modulos, herramientas, limites, activo,
      // Si editamos mantenemos el orden. Si creamos, asignamos max(orden)+1
      // para que el plan nuevo quede al final y no choque con el existente.
      orden: editing?.orden ?? ((existing.length === 0 ? 0 : Math.max(...existing.map((p) => p.orden ?? 0)) + 1)),
    };
    const res = editing ? await updatePlanAction(editing.id, payload) : await createPlanAction(payload);
    setSaving(false);
    if (!res.ok) { setError(res.error ?? "Error"); return; }
    onDone();
  }

  return (
    <div className="space-y-5">
      {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-status-danger">{error}</div>}

      {/* Datos del plan */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="md:col-span-2">
          <Field label="Nombre del plan"><Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Premium" /></Field>
        </div>
        <Field label="Precio">
          <Input type="number" min="0" step="0.01" value={precio} onChange={(e) => setPrecio(Number(e.target.value))} />
        </Field>
        <Field label="Moneda">
          <Select value={moneda} onChange={(e) => setMoneda(e.target.value)}>
            {MONEDAS.map((m) => <option key={m} value={m}>{m}</option>)}
          </Select>
        </Field>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="md:col-span-3">
          <Field label="Descripción"><Input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Para qué tipo de cliente es" /></Field>
        </div>
        <Field label="Cobro">
          <Select value={periodicidad} onChange={(e) => setPeriodicidad(e.target.value as Plan["periodicidad"])}>
            {PERIODOS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </Select>
        </Field>
      </div>

      {/* Módulos + acciones */}
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase text-gray-400">Módulos y acciones</h3>
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Módulo</th>
                {PLAN_ACTIONS.map((a) => <th key={a.key} className="px-3 py-2 text-center font-medium">{a.label}</th>)}
                <th className="px-3 py-2 text-center font-medium">Todo</th>
              </tr>
            </thead>
            <tbody>
              {PLAN_MODULES.map((m) => {
                const row = modulos[m.key];
                const allOn = row.ver && row.crear && row.editar && row.eliminar;
                return (
                  <tr key={m.key} className="border-t border-gray-100">
                    <td className="px-3 py-2 font-medium text-gray-800">{m.label}</td>
                    {PLAN_ACTIONS.map((a) => (
                      <td key={a.key} className="px-3 py-2 text-center">
                        <input type="checkbox" checked={row[a.key]} onChange={() => toggleMod(m.key, a.key)} className="h-4 w-4 cursor-pointer" />
                      </td>
                    ))}
                    <td className="px-3 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => toggleModAll(m.key, !allOn)}
                        className={`inline-flex h-5 w-5 items-center justify-center rounded border ${allOn ? "border-brand-primary bg-brand-primary text-white" : "border-gray-300 text-transparent"}`}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Herramientas */}
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase text-gray-400">Herramientas incluidas</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {HERRAMIENTA_GRUPOS.map((grupo) => (
            <div key={grupo} className="rounded-lg border border-gray-200 p-3">
              <p className="mb-2 text-xs font-semibold text-gray-600">{grupo}</p>
              <div className="space-y-1.5">
                {HERRAMIENTAS.filter((h) => h.grupo === grupo).map((h) => (
                  <label key={h.key} className="flex items-start gap-2 text-sm">
                    <input type="checkbox" checked={!!herramientas[h.key]} onChange={() => toggleTool(h.key)} className="mt-0.5 h-4 w-4" />
                    <span>
                      <span className="block text-gray-800">{h.label}</span>
                      <span className="block text-xs text-gray-400">{h.desc}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Límites */}
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase text-gray-400">Límites (vacío = ilimitado)</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {LIMITES.map((l) => (
            <Field key={l.key} label={l.label}>
              <Input
                type="number"
                min="0"
                value={limites[l.key] ?? ""}
                onChange={(e) => setLimites((x) => ({ ...x, [l.key]: e.target.value === "" ? null : Number(e.target.value) }))}
                placeholder="Ilimitado"
              />
            </Field>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} className="h-4 w-4" />
        Plan activo (disponible para asignar a clientes)
      </label>

      <div className="flex items-center gap-2 border-t border-gray-100 pt-4">
        <Button type="button" onClick={save} disabled={saving}>{saving ? "Guardando…" : editing ? "Guardar cambios" : "Crear plan"}</Button>
        <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
      </div>
    </div>
  );
}
