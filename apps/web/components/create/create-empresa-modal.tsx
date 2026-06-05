"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";
import { CamposCustomInputs } from "@/components/campos/create-campos-inputs";
import type { CampoPersonalizado } from "@/lib/db/campos";
import { createEmpresaAction, type CreateState } from "@/app/(app)/create-actions";

const INITIAL: CreateState = { ok: false };

type UsuarioOption = { id: string; nombre: string };

export function CreateEmpresaModal({
  usuarios,
  campos,
  onClose,
}: {
  usuarios: UsuarioOption[];
  campos: CampoPersonalizado[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(createEmpresaAction, INITIAL);
  const e = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.ok) {
      router.refresh();
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.ok]);

  return (
    <Modal title="Nueva empresa" onClose={onClose} size="max-w-2xl">
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
          <Field label="Estado" htmlFor="estado_empresa" error={e.estado_empresa}>
            <Select id="estado_empresa" name="estado_empresa" defaultValue="prospecto">
              <option value="prospecto">Prospecto</option>
              <option value="cliente">Cliente</option>
              <option value="inactivo">Inactivo</option>
            </Select>
          </Field>
          <Field label="Email" htmlFor="email" error={e.email}>
            <Input id="email" name="email" type="email" />
          </Field>
          <Field label="Teléfono" htmlFor="telefono" error={e.telefono}>
            <Input id="telefono" name="telefono" />
          </Field>
          <Field label="Ciudad" htmlFor="ciudad" error={e.ciudad}>
            <Input id="ciudad" name="ciudad" />
          </Field>
          <Field label="País" htmlFor="pais" error={e.pais}>
            <Input id="pais" name="pais" />
          </Field>
          <Field label="Sitio web" htmlFor="sitio_web" error={e.sitio_web}>
            <Input id="sitio_web" name="sitio_web" placeholder="https://" />
          </Field>
          <Field label="Origen" htmlFor="origen" error={e.origen}>
            <Select id="origen" name="origen" defaultValue="">
              <option value="">—</option>
              <option value="web">Web</option>
              <option value="referencia">Referencia</option>
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
            {isPending ? "Creando…" : "Crear empresa"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
