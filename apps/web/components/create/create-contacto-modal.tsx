"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";
import { CamposCustomInputs } from "@/components/campos/create-campos-inputs";
import type { CampoPersonalizado } from "@/lib/db/campos";
import { createContactoAction, type CreateState } from "@/app/(app)/create-actions";

const INITIAL: CreateState = { ok: false };

type Option = { id: string; nombre: string };

export function CreateContactoModal({
  empresas,
  usuarios,
  campos,
  onClose,
  defaultEmpresaId,
}: {
  empresas: Option[];
  usuarios: Option[];
  campos: CampoPersonalizado[];
  onClose: () => void;
  defaultEmpresaId?: string;
}) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(createContactoAction, INITIAL);
  const e = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.ok) {
      router.refresh();
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.ok]);

  return (
    <Modal title="Nuevo contacto" onClose={onClose} size="max-w-2xl">
      {empresas.length === 0 ? (
        <div className="rounded border border-yellow-200 bg-yellow-50 p-4 text-sm">
          Necesitás al menos una empresa para crear un contacto.{" "}
          <Link href="/admin/datos/importar" className="text-brand-primary hover:underline" onClick={onClose}>
            Importar →
          </Link>
        </div>
      ) : (
        <form action={formAction} className="space-y-5">
          {state.error && (
            <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-status-danger">
              {state.error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Nombre" htmlFor="nombre" required error={e.nombre}>
              <Input id="nombre" name="nombre" required autoFocus />
            </Field>
            <Field label="Empresa" htmlFor="empresa_id" required error={e.empresa_id}>
              <Select id="empresa_id" name="empresa_id" defaultValue={defaultEmpresaId ?? empresas[0]?.id ?? ""}>
                {empresas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Cargo" htmlFor="cargo" error={e.cargo}>
              <Input id="cargo" name="cargo" />
            </Field>
            <Field label="Email" htmlFor="email" required error={e.email}>
              <Input id="email" name="email" type="email" required />
            </Field>
            <Field label="Teléfono" htmlFor="telefono" error={e.telefono}>
              <Input id="telefono" name="telefono" />
            </Field>
            <Field label="WhatsApp" htmlFor="telefono_whatsapp" error={e.telefono_whatsapp}>
              <Input id="telefono_whatsapp" name="telefono_whatsapp" />
            </Field>
            <Field label="Origen" htmlFor="origen" error={e.origen}>
              <Select id="origen" name="origen" defaultValue="">
                <option value="">—</option>
                <option value="empresa">Empresa</option>
                <option value="linkedin">LinkedIn</option>
                <option value="cold_call">Cold call</option>
                <option value="evento">Evento</option>
                <option value="otro">Otro</option>
              </Select>
            </Field>
            <Field label="Asignado a" htmlFor="asignado_id" error={e.asignado_id}>
              <Select id="asignado_id" name="asignado_id" defaultValue="">
                <option value="">Sin asignar</option>
                {usuarios.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nombre}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Descripción" htmlFor="descripcion" error={e.descripcion}>
            <Textarea id="descripcion" name="descripcion" rows={3} />
          </Field>

          <CamposCustomInputs campos={campos} />

          <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-4">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creando…" : "Crear contacto"}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
