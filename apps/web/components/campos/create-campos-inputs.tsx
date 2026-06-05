"use client";

import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";
import type { CampoPersonalizado } from "@/lib/db/campos";
import { campoVisibleEnForm } from "@/lib/campos-visibility";

/** Prefix for custom-field form inputs so the create action can collect them. */
export const CC_PREFIX = "cc__";

/**
 * Renders the tenant's custom fields (those visible in the form) as empty
 * inputs for a create popup. Field names are `cc__<clave>` so the server
 * action can gather them into `campos_custom`.
 */
export function CamposCustomInputs({ campos }: { campos: CampoPersonalizado[] }) {
  const visibles = campos.filter(campoVisibleEnForm);
  if (visibles.length === 0) return null;

  return (
    <div className="space-y-4 border-t border-gray-100 pt-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
        Campos personalizados
      </p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {visibles.map((c) => (
          <CampoInput key={c.id} campo={c} />
        ))}
      </div>
    </div>
  );
}

function CampoInput({ campo }: { campo: CampoPersonalizado }) {
  const name = `${CC_PREFIX}${campo.clave}`;

  if (campo.tipo === "checkbox") {
    return (
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name={name} value="true" className="rounded" />
        {campo.etiqueta}
      </label>
    );
  }
  if (campo.tipo === "textarea") {
    return (
      <Field label={campo.etiqueta} htmlFor={name} required={campo.requerido}>
        <Textarea id={name} name={name} rows={3} required={campo.requerido} />
      </Field>
    );
  }
  if (campo.tipo === "seleccion") {
    return (
      <Field label={campo.etiqueta} htmlFor={name} required={campo.requerido}>
        <Select id={name} name={name} defaultValue="" required={campo.requerido}>
          <option value="">— sin seleccionar —</option>
          {(campo.opciones ?? []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </Select>
      </Field>
    );
  }
  if (campo.tipo === "fecha") {
    return (
      <Field label={campo.etiqueta} htmlFor={name} required={campo.requerido}>
        <Input id={name} name={name} type="date" required={campo.requerido} />
      </Field>
    );
  }
  if (campo.tipo === "numero" || campo.tipo === "moneda") {
    return (
      <Field label={campo.etiqueta} htmlFor={name} required={campo.requerido}>
        <Input
          id={name}
          name={name}
          type="number"
          step={campo.tipo === "moneda" ? "0.01" : "any"}
          required={campo.requerido}
        />
      </Field>
    );
  }
  return (
    <Field label={campo.etiqueta} htmlFor={name} required={campo.requerido}>
      <Input id={name} name={name} required={campo.requerido} />
    </Field>
  );
}
