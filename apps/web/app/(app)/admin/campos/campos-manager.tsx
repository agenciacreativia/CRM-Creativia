"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import type { CampoPersonalizado, TipoEntidad, TipoCampo } from "@/lib/db/campos";
import { createCampoAction, updateCampoAction, deleteCampoAction, toggleCampoMostrarAction } from "./actions";
import { campoVisibleEnForm } from "@/lib/campos-visibility";

const ENTIDADES: { value: TipoEntidad; label: string }[] = [
  { value: "empresa", label: "Empresas" },
  { value: "contacto", label: "Contactos" },
  { value: "oportunidad", label: "Oportunidades" },
];

const TIPO_LABEL: Record<TipoCampo, string> = {
  texto: "Texto",
  numero: "Número",
  moneda: "Moneda",
  fecha: "Fecha",
  seleccion: "Selección",
  checkbox: "Checkbox",
  textarea: "Texto largo",
};

export function CamposManager({
  initial,
  entidad,
}: {
  initial: CampoPersonalizado[];
  entidad: TipoEntidad;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [, startTransition] = useTransition();

  function switchEntidad(next: TipoEntidad) {
    router.replace(`${pathname}?entidad=${next}`);
  }

  async function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const res = await createCampoAction(fd);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    form.reset();
    setShowNew(false);
    router.refresh();
  }

  function onDelete(id: string) {
    if (!confirm("¿Eliminar este campo? Los valores guardados en oportunidades/empresas se mantienen, pero ya no se mostrarán en formularios.")) return;
    startTransition(async () => {
      const res = await deleteCampoAction(id);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  function onToggleMostrar(id: string, value: boolean) {
    startTransition(async () => {
      const res = await toggleCampoMostrarAction(id, value);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 border-b border-gray-200">
        {ENTIDADES.map((e) => (
          <button
            key={e.value}
            type="button"
            onClick={() => switchEntidad(e.value)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              entidad === e.value
                ? "border-brand-primary text-brand-primary"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            {e.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-status-danger">{error}</div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2 font-medium">Etiqueta</th>
              <th className="px-4 py-2 font-medium">Clave</th>
              <th className="px-4 py-2 font-medium">Tipo</th>
              <th className="px-4 py-2 font-medium">Requerido</th>
              <th className="px-4 py-2 font-medium">En popup</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {initial.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-gray-500 py-6">
                  Sin campos personalizados para {entidad}s. Agregá uno abajo.
                </td>
              </tr>
            )}
            {initial.map((c) =>
              editingId === c.id ? (
                <tr key={c.id} className="border-t border-gray-100">
                  <td colSpan={6} className="p-4 bg-blue-50">
                    <CampoFormFields
                      mode="edit"
                      initial={c}
                      entidad={c.tipo_entidad}
                      onCancel={() => setEditingId(null)}
                      onError={setError}
                    />
                  </td>
                </tr>
              ) : (
                <tr key={c.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium">{c.etiqueta}</td>
                  <td className="px-4 py-2.5 text-gray-600 font-mono text-xs">{c.clave}</td>
                  <td className="px-4 py-2.5">
                    <Badge>{TIPO_LABEL[c.tipo]}</Badge>
                  </td>
                  <td className="px-4 py-2.5">{c.requerido ? "Sí" : "—"}</td>
                  <td className="px-4 py-2.5">
                    {c.requerido ? (
                      <span className="text-xs text-gray-400" title="Los obligatorios siempre se muestran">
                        Siempre
                      </span>
                    ) : (
                      <button
                        type="button"
                        role="switch"
                        aria-checked={campoVisibleEnForm(c)}
                        onClick={() => onToggleMostrar(c.id, !campoVisibleEnForm(c))}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                          campoVisibleEnForm(c) ? "bg-brand-primary" : "bg-gray-300"
                        }`}
                        title={campoVisibleEnForm(c) ? "Se muestra en el popup" : "No se muestra en el popup"}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                            campoVisibleEnForm(c) ? "translate-x-4" : "translate-x-0.5"
                          }`}
                        />
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right space-x-1">
                    <Button type="button" size="sm" variant="ghost" onClick={() => setEditingId(c.id)}>Editar</Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => onDelete(c.id)} className="text-status-danger hover:bg-red-50">Eliminar</Button>
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold uppercase text-gray-500">Nuevo campo</h2>
          {!showNew && (
            <Button type="button" size="sm" onClick={() => setShowNew(true)}>+ Agregar</Button>
          )}
        </div>
        {showNew && (
          <form onSubmit={onCreate}>
            <CampoFormFields mode="create" entidad={entidad} onCancel={() => setShowNew(false)} />
          </form>
        )}
      </div>
    </div>
  );
}

function CampoFormFields({
  mode,
  initial,
  entidad,
  onCancel,
  onError,
}: {
  mode: "create" | "edit";
  initial?: CampoPersonalizado;
  entidad: TipoEntidad;
  onCancel: () => void;
  onError?: (msg: string) => void;
}) {
  const [tipo, setTipo] = useState<TipoCampo>(initial?.tipo ?? "texto");
  const router = useRouter();

  async function onEditSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!initial) return;
    const fd = new FormData(e.currentTarget);
    const res = await updateCampoAction(initial.id, fd);
    if (!res.ok) {
      onError?.(res.error);
      return;
    }
    onCancel();
    router.refresh();
  }

  const fields = (
    <>
      <input type="hidden" name="tipo_entidad" value={entidad} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Etiqueta" htmlFor="etiqueta" required>
          <Input id="etiqueta" name="etiqueta" defaultValue={initial?.etiqueta ?? ""} placeholder="ej. Nivel de interés" required />
        </Field>
        <Field label="Clave" htmlFor="clave" required hint="a-z, números, guiones bajos. No se puede cambiar tras crear.">
          <Input
            id="clave"
            name="clave"
            defaultValue={initial?.clave ?? ""}
            placeholder="nivel_interes"
            required
            pattern="^[a-z][a-z0-9_]{0,49}$"
            readOnly={mode === "edit"}
          />
        </Field>
        <Field label="Tipo" htmlFor="tipo">
          <Select id="tipo" name="tipo" value={tipo} onChange={(e) => setTipo(e.target.value as TipoCampo)} disabled={mode === "edit"}>
            <option value="texto">Texto</option>
            <option value="numero">Número</option>
            <option value="moneda">Moneda</option>
            <option value="fecha">Fecha</option>
            <option value="seleccion">Selección</option>
            <option value="checkbox">Checkbox</option>
            <option value="textarea">Texto largo</option>
          </Select>
        </Field>
        <Field label="Etiqueta en inglés" htmlFor="etiqueta_en" hint="opcional (para usuarios en EN)">
          <Input id="etiqueta_en" name="etiqueta_en" defaultValue={initial?.etiqueta_en ?? ""} />
        </Field>
      </div>

      {tipo === "seleccion" && (
        <Field label="Opciones" htmlFor="opciones" hint="Una por línea o separadas por coma">
          <Textarea
            id="opciones"
            name="opciones"
            rows={3}
            defaultValue={initial?.opciones?.join("\n") ?? ""}
            placeholder="Alto\nMedio\nBajo"
          />
        </Field>
      )}

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="requerido"
          value="true"
          defaultChecked={initial?.requerido}
          className="rounded"
        />
        Campo requerido
      </label>

      <div className="flex items-center gap-2 pt-2">
        <Button type="submit" size="sm">{mode === "create" ? "Crear campo" : "Guardar"}</Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>Cancelar</Button>
      </div>
    </>
  );

  if (mode === "edit") {
    return <form onSubmit={onEditSubmit} className="space-y-3">{fields}</form>;
  }
  return <div className="space-y-3">{fields}</div>;
}
