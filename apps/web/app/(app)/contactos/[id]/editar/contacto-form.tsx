"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Field } from "@/components/ui/field";
import type { ContactoDetail } from "@/lib/db/contactos";
import { updateContactoAction, type ContactoFormState } from "./actions";

const INITIAL: ContactoFormState = { ok: false };

type EmpresaOption = { id: string; nombre: string };

export function ContactoForm({
  contacto,
  empresas,
}: {
  contacto: ContactoDetail;
  empresas: EmpresaOption[];
}) {
  const action = updateContactoAction.bind(null, contacto.id);
  const [state, formAction, isPending] = useActionState(action, INITIAL);
  const e = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-5">
      {state.error && (
        <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-status-danger">
          {state.error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Nombre" htmlFor="nombre" required error={e.nombre}>
          <Input id="nombre" name="nombre" defaultValue={contacto.nombre} required />
        </Field>

        <Field label="Cargo" htmlFor="cargo" error={e.cargo}>
          <Input id="cargo" name="cargo" defaultValue={contacto.cargo ?? ""} />
        </Field>

        <Field label="Email" htmlFor="email" required error={e.email}>
          <Input id="email" name="email" type="email" defaultValue={contacto.email} required />
        </Field>

        <Field label="Empresa" htmlFor="empresa_id" required error={e.empresa_id}>
          <Select id="empresa_id" name="empresa_id" defaultValue={contacto.empresa_id} required>
            {empresas.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Teléfono" htmlFor="telefono" error={e.telefono}>
          <Input id="telefono" name="telefono" defaultValue={contacto.telefono ?? ""} />
        </Field>

        <Field label="WhatsApp" htmlFor="telefono_whatsapp" error={e.telefono_whatsapp}>
          <Input
            id="telefono_whatsapp"
            name="telefono_whatsapp"
            defaultValue={contacto.telefono_whatsapp ?? ""}
          />
        </Field>

        <Field label="Origen" htmlFor="origen" error={e.origen}>
          <Select id="origen" name="origen" defaultValue={contacto.origen ?? ""}>
            <option value="">— sin especificar —</option>
            <option value="empresa">Empresa</option>
            <option value="linkedin">LinkedIn</option>
            <option value="cold_call">Cold call</option>
            <option value="evento">Evento</option>
            <option value="otro">Otro</option>
          </Select>
        </Field>
      </div>

      <Field label="Descripción" htmlFor="descripcion" error={e.descripcion}>
        <Textarea
          id="descripcion"
          name="descripcion"
          rows={4}
          defaultValue={contacto.descripcion ?? ""}
        />
      </Field>

      <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Guardando..." : "Guardar cambios"}
        </Button>
        <Link
          href={`/contactos/${contacto.id}`}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
