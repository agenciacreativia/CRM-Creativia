"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Field } from "@/components/ui/field";
import type { EmpresaDetail } from "@/lib/db/empresas";
import { updateEmpresaAction, type EmpresaFormState } from "./actions";

const INITIAL: EmpresaFormState = { ok: false };

type UsuarioOption = { id: string; nombre: string; rol: "admin" | "asesor" };

export function EmpresaForm({
  empresa,
  usuarios,
}: {
  empresa: EmpresaDetail;
  usuarios: UsuarioOption[];
}) {
  const action = updateEmpresaAction.bind(null, empresa.id);
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
          <Input id="nombre" name="nombre" defaultValue={empresa.nombre} required />
        </Field>

        <Field label="Estado" htmlFor="estado_empresa" error={e.estado_empresa}>
          <Select id="estado_empresa" name="estado_empresa" defaultValue={empresa.estado_empresa}>
            <option value="prospecto">Prospecto</option>
            <option value="cliente">Cliente</option>
            <option value="inactivo">Inactivo</option>
          </Select>
        </Field>

        <Field label="Email" htmlFor="email" error={e.email}>
          <Input id="email" name="email" type="email" defaultValue={empresa.email ?? ""} />
        </Field>

        <Field label="Teléfono" htmlFor="telefono" error={e.telefono}>
          <Input id="telefono" name="telefono" defaultValue={empresa.telefono ?? ""} />
        </Field>

        <Field label="Sitio web" htmlFor="sitio_web" error={e.sitio_web}>
          <Input
            id="sitio_web"
            name="sitio_web"
            defaultValue={empresa.sitio_web ?? ""}
            placeholder="https://..."
          />
        </Field>

        <Field label="Origen" htmlFor="origen" error={e.origen}>
          <Select id="origen" name="origen" defaultValue={empresa.origen ?? ""}>
            <option value="">— sin especificar —</option>
            <option value="web">Web</option>
            <option value="referencia">Referencia</option>
            <option value="cold_call">Cold call</option>
            <option value="evento">Evento</option>
            <option value="otro">Otro</option>
          </Select>
        </Field>

        <Field label="Dirección" htmlFor="direccion" error={e.direccion}>
          <Input id="direccion" name="direccion" defaultValue={empresa.direccion ?? ""} />
        </Field>

        <Field label="Asignado a" htmlFor="asignado_id" error={e.asignado_id}>
          <Select id="asignado_id" name="asignado_id" defaultValue={empresa.asignado_id ?? ""}>
            <option value="">(no asignado)</option>
            {usuarios.map((u) => (
              <option key={u.id} value={u.id}>{u.nombre} · {u.rol}</option>
            ))}
          </Select>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Ciudad" htmlFor="ciudad" error={e.ciudad}>
            <Input id="ciudad" name="ciudad" defaultValue={empresa.ciudad ?? ""} />
          </Field>
          <Field label="País" htmlFor="pais" error={e.pais}>
            <Input id="pais" name="pais" defaultValue={empresa.pais ?? ""} />
          </Field>
        </div>
      </div>

      <Field label="Descripción" htmlFor="descripcion" error={e.descripcion}>
        <Textarea
          id="descripcion"
          name="descripcion"
          rows={4}
          defaultValue={empresa.descripcion ?? ""}
        />
      </Field>

      <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Guardando..." : "Guardar cambios"}
        </Button>
        <Link
          href={`/empresas/${empresa.id}`}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
