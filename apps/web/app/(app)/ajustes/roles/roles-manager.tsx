"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Shield, ShieldCheck, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import {
  PERMISSION_MODULES,
  PERMISSION_ACTIONS,
  emptyPermisos,
  type ModuleKey,
  type ActionKey,
  type ModulePerms,
} from "@/lib/permissions";
import type { Rol } from "@/lib/db/roles";
import { createRolAction, updateRolAction, deleteRolAction } from "./actions";

type Matrix = Record<ModuleKey, ModulePerms>;

export function RolesManager({ initial }: { initial: Rol[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Rol | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDelete(r: Rol) {
    setError(null);
    if (!confirm(`¿Eliminar el rol "${r.nombre}"?`)) return;
    const res = await deleteRolAction(r.id);
    if (!res.ok) setError(res.error ?? "Error");
    else router.refresh();
  }

  if (creating || editing) {
    return (
      <RolForm
        editing={editing}
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
    <div className="space-y-3">
      {error && <div role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-sm text-status-danger">{error}</div>}

      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">Definí roles y qué puede hacer cada uno en cada módulo.</p>
        <Button type="button" size="sm" onClick={() => setCreating(true)} className="inline-flex items-center gap-1.5">
          <Plus className="h-4 w-4" /> Nuevo rol
        </Button>
      </div>

      <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
        {initial.map((r) => (
          <li key={r.id} className="flex items-start justify-between gap-3 p-3.5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                {r.es_admin ? (
                  <ShieldCheck className="h-4 w-4 shrink-0 text-brand-primary" />
                ) : (
                  <Shield className="h-4 w-4 shrink-0 text-gray-400" />
                )}
                <span className="font-medium text-gray-900">{r.nombre}</span>
                {r.es_admin && <Badge variant="info">acceso total</Badge>}
                {r.es_sistema && <Badge variant="default">sistema</Badge>}
                <span className="text-xs text-gray-400">
                  {r.usuarios_count} usuario{r.usuarios_count === 1 ? "" : "s"}
                </span>
              </div>
              {r.descripcion && <p className="mt-0.5 text-xs text-gray-500">{r.descripcion}</p>}
              {!r.es_admin && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {PERMISSION_MODULES.map((m) => {
                    const p = r.permisos[m.key];
                    const verbs = PERMISSION_ACTIONS.filter((a) => p?.[a.key]).map((a) => a.label[0]);
                    if (verbs.length === 0) return null;
                    return (
                      <span key={m.key} className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                        {m.label}: {verbs.join("")}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button onClick={() => setEditing(r)} className="text-gray-400 hover:text-brand-primary" title="Editar">
                <Pencil className="h-4 w-4" />
              </button>
              {!r.es_sistema && (
                <button onClick={() => onDelete(r)} className="text-gray-400 hover:text-status-danger" title="Eliminar">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RolForm({ editing, onDone, onCancel }: { editing: Rol | null; onDone: () => void; onCancel: () => void }) {
  const [nombre, setNombre] = useState(editing?.nombre ?? "");
  const [descripcion, setDescripcion] = useState(editing?.descripcion ?? "");
  const [esAdmin, setEsAdmin] = useState(editing?.es_admin ?? false);
  const [matrix, setMatrix] = useState<Matrix>(editing ? editing.permisos : emptyPermisos());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(mod: ModuleKey, action: ActionKey) {
    setMatrix((m) => {
      const row = { ...m[mod], [action]: !m[mod][action] };
      // Turning on any action implies "ver"; turning off "ver" clears the row.
      if (action !== "ver" && row[action]) row.ver = true;
      if (action === "ver" && !row.ver) {
        row.crear = false;
        row.editar = false;
        row.eliminar = false;
      }
      return { ...m, [mod]: row };
    });
  }

  function toggleModuleAll(mod: ModuleKey, value: boolean) {
    setMatrix((m) => ({ ...m, [mod]: { ver: value, crear: value, editar: value, eliminar: value } }));
  }

  async function save() {
    setError(null);
    if (!nombre.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }
    setSaving(true);
    const payload = { nombre, descripcion: descripcion || null, es_admin: esAdmin, permisos: matrix };
    const res = editing ? await updateRolAction(editing.id, payload) : await createRolAction(payload);
    setSaving(false);
    if (!res.ok) {
      setError(res.error ?? "Error");
      return;
    }
    onDone();
  }

  return (
    <div className="space-y-4">
      {error && <div role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-sm text-status-danger">{error}</div>}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Nombre del rol">
          <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Counter Senior" />
        </Field>
        <Field label="Descripción (opcional)">
          <Input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Para qué sirve este rol" />
        </Field>
      </div>

      <label className="flex items-start gap-2.5 rounded-lg border border-gray-200 bg-gray-50 p-3">
        <input
          type="checkbox"
          checked={esAdmin}
          onChange={(e) => setEsAdmin(e.target.checked)}
          className="mt-0.5 h-4 w-4"
        />
        <span>
          <span className="block text-sm font-medium text-gray-900">Acceso total (administrador)</span>
          <span className="block text-xs text-gray-500">
            Ignora los permisos por módulo y puede gestionar usuarios, roles y configuración.
          </span>
        </span>
      </label>

      {!esAdmin && (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Módulo</th>
                {PERMISSION_ACTIONS.map((a) => (
                  <th key={a.key} className="px-3 py-2 text-center font-medium">{a.label}</th>
                ))}
                <th className="px-3 py-2 text-center font-medium">Todo</th>
              </tr>
            </thead>
            <tbody>
              {PERMISSION_MODULES.map((m) => {
                const row = matrix[m.key];
                const allOn = row.ver && row.crear && row.editar && row.eliminar;
                return (
                  <tr key={m.key} className="border-t border-gray-100">
                    <td className="px-3 py-2 font-medium text-gray-800">{m.label}</td>
                    {PERMISSION_ACTIONS.map((a) => (
                      <td key={a.key} className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={row[a.key]}
                          onChange={() => toggle(m.key, a.key)}
                          className="h-4 w-4 cursor-pointer"
                        />
                      </td>
                    ))}
                    <td className="px-3 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => toggleModuleAll(m.key, !allOn)}
                        className={`inline-flex h-5 w-5 items-center justify-center rounded border ${
                          allOn ? "border-brand-primary bg-brand-primary text-white" : "border-gray-300 text-transparent"
                        }`}
                        title={allOn ? "Quitar todo" : "Marcar todo"}
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
      )}

      <div className="flex items-center gap-2 border-t border-gray-100 pt-4">
        <Button type="button" onClick={save} disabled={saving}>
          {saving ? "Guardando…" : editing ? "Guardar cambios" : "Crear rol"}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
      </div>
    </div>
  );
}
