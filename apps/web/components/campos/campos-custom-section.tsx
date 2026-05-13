"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";
import type { CampoPersonalizado, TipoEntidad } from "@/lib/db/campos";
import { saveCamposCustomAction } from "@/app/(app)/admin/campos/actions";

type Props = {
  tipo_entidad: TipoEntidad;
  entity_id: string;
  campos: CampoPersonalizado[];
  values: Record<string, unknown>;
  canEdit: boolean;
};

/**
 * Renders the tenant's custom field definitions as a form for the given
 * entity. Values come from the entity's campos_custom JSONB column.
 *
 * If `canEdit` is false, renders read-only.
 */
export function CamposCustomSection({ tipo_entidad, entity_id, campos, values, canEdit }: Props) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  if (campos.length === 0) return null;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const out: Record<string, unknown> = {};
    for (const c of campos) {
      const raw = fd.get(c.clave);
      out[c.clave] = parseValue(c, raw);
    }
    const res = await saveCamposCustomAction({ tipo_entidad, entity_id, values: out });
    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setEditing(false);
    router.refresh();
  }

  return (
    <section className="bg-white border border-gray-200 rounded-lg p-6">
      <header className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold uppercase text-gray-500">
          Campos personalizados <span className="text-gray-400">({campos.length})</span>
        </h2>
        {canEdit && !editing && (
          <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(true)}>
            Editar
          </Button>
        )}
      </header>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-status-danger mb-3">{error}</div>
      )}

      {editing ? (
        <form onSubmit={onSubmit} className="space-y-3">
          {campos.map((c) => (
            <FieldInput key={c.id} campo={c} value={values[c.clave]} />
          ))}
          <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? "Guardando..." : "Guardar"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancelar</Button>
          </div>
        </form>
      ) : (
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          {campos.map((c) => (
            <div key={c.id}>
              <dt className="text-xs uppercase text-gray-500">{c.etiqueta}</dt>
              <dd className="text-gray-800 mt-0.5">{formatDisplay(c, values[c.clave])}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

function FieldInput({ campo, value }: { campo: CampoPersonalizado; value: unknown }) {
  const v = value as string | number | boolean | undefined;
  switch (campo.tipo) {
    case "textarea":
      return (
        <Field label={campo.etiqueta} htmlFor={campo.clave} required={campo.requerido}>
          <Textarea
            id={campo.clave}
            name={campo.clave}
            rows={3}
            defaultValue={(v as string) ?? ""}
            required={campo.requerido}
          />
        </Field>
      );
    case "checkbox":
      return (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name={campo.clave}
            value="true"
            defaultChecked={Boolean(v)}
            className="rounded"
          />
          {campo.etiqueta}
        </label>
      );
    case "seleccion":
      return (
        <Field label={campo.etiqueta} htmlFor={campo.clave} required={campo.requerido}>
          <Select id={campo.clave} name={campo.clave} defaultValue={(v as string) ?? ""} required={campo.requerido}>
            <option value="">— sin seleccionar —</option>
            {(campo.opciones ?? []).map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </Select>
        </Field>
      );
    case "fecha":
      return (
        <Field label={campo.etiqueta} htmlFor={campo.clave} required={campo.requerido}>
          <Input id={campo.clave} name={campo.clave} type="date" defaultValue={(v as string) ?? ""} required={campo.requerido} />
        </Field>
      );
    case "numero":
    case "moneda":
      return (
        <Field label={campo.etiqueta} htmlFor={campo.clave} required={campo.requerido}>
          <Input
            id={campo.clave}
            name={campo.clave}
            type="number"
            step={campo.tipo === "moneda" ? "0.01" : "any"}
            defaultValue={v == null ? "" : String(v)}
            required={campo.requerido}
          />
        </Field>
      );
    case "texto":
    default:
      return (
        <Field label={campo.etiqueta} htmlFor={campo.clave} required={campo.requerido}>
          <Input id={campo.clave} name={campo.clave} defaultValue={(v as string) ?? ""} required={campo.requerido} />
        </Field>
      );
  }
}

function parseValue(campo: CampoPersonalizado, raw: FormDataEntryValue | null): unknown {
  if (campo.tipo === "checkbox") {
    return raw === "true" || raw === "on";
  }
  if (raw == null) return null;
  const s = typeof raw === "string" ? raw : "";
  if (s.trim() === "") return null;
  if (campo.tipo === "numero" || campo.tipo === "moneda") {
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }
  return s;
}

function formatDisplay(campo: CampoPersonalizado, value: unknown): React.ReactNode {
  if (value == null || value === "") return <span className="text-gray-400">—</span>;
  if (campo.tipo === "checkbox") return value ? "Sí" : "No";
  if (campo.tipo === "moneda" && typeof value === "number") {
    return new Intl.NumberFormat("es", { style: "currency", currency: "USD" }).format(value);
  }
  if (campo.tipo === "fecha") {
    return new Date(String(value)).toLocaleDateString("es");
  }
  return String(value);
}
