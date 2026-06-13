"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { RichText } from "@/components/ui/rich-text";
import type { PlantillaCorreo } from "@/lib/db/plantillas";
import { savePlantillaAction, deletePlantillaAction } from "./plantillas-actions";

export function PlantillasManager({ initial }: { initial: PlantillaCorreo[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<PlantillaCorreo | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [, startTransition] = useTransition();

  const showForm = creating || editing !== null;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const res = await savePlantillaAction(editing?.id ?? null, fd);
    setSaving(false);
    if (!res.ok) {
      setError(res.error ?? "Error");
      return;
    }
    setCreating(false);
    setEditing(null);
    router.refresh();
  }

  function onDelete(id: string) {
    if (!confirm("¿Eliminar esta plantilla?")) return;
    startTransition(async () => {
      const res = await deletePlantillaAction(id);
      if (!res.ok) setError(res.error ?? "Error");
      else router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {error && (
        <div role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-sm text-status-danger">{error}</div>
      )}

      {!showForm && (
        <>
          {initial.length === 0 ? (
            <p className="text-sm text-gray-500">Aún no tenés plantillas.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {initial.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">{p.nombre}</p>
                    <p className="truncate text-xs text-gray-500">{p.asunto || "(sin asunto)"}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setEditing(p)} className="text-gray-400 hover:text-brand-primary" title="Editar">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => onDelete(p.id)} className="text-gray-400 hover:text-status-danger" title="Eliminar">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Button type="button" size="sm" onClick={() => setCreating(true)} className="inline-flex items-center gap-1.5">
            <Plus className="h-4 w-4" /> Nueva plantilla
          </Button>
        </>
      )}

      {showForm && (
        <form onSubmit={onSubmit} className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <Field label="Nombre de la plantilla" htmlFor="nombre">
            <Input id="nombre" name="nombre" defaultValue={editing?.nombre ?? ""} placeholder="Ej. Cotización enviada" required />
          </Field>
          <Field label="Asunto" htmlFor="asunto">
            <Input id="asunto" name="asunto" defaultValue={editing?.asunto ?? ""} placeholder="Asunto por defecto" />
          </Field>
          <Field label="Cuerpo" htmlFor="cuerpo_html">
            <RichText name="cuerpo_html" defaultHtml={editing?.cuerpo_html ?? ""} />
          </Field>
          <div className="flex items-center gap-2">
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? "Guardando…" : "Guardar plantilla"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setCreating(false);
                setEditing(null);
                setError(null);
              }}
            >
              Cancelar
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
