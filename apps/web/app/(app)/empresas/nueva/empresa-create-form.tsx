"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Field } from "@/components/ui/field";
import { createEmpresaAction, type EmpresaCreateState } from "./actions";

const INITIAL: EmpresaCreateState = { ok: false };
type UsuarioOption = { id: string; nombre: string; rol: "admin" | "asesor" };

export function EmpresaCreateForm({ usuarios }: { usuarios: UsuarioOption[] }) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(createEmpresaAction, INITIAL);
  const e = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.ok && state.id) {
      router.push(`/empresas/${state.id}`);
      router.refresh();
    }
  }, [state.ok, state.id, router]);

  return (
    <form action={formAction} className="space-y-5">
      {state.error && (
        <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-status-danger">
          {state.error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

        <Field label="Sitio web" htmlFor="sitio_web" error={e.sitio_web}>
          <Input id="sitio_web" name="sitio_web" type="url" placeholder="https://..." />
        </Field>

        <Field label="Origen" htmlFor="origen" error={e.origen}>
          <Select id="origen" name="origen" defaultValue="">
            <option value="">— sin especificar —</option>
            <option value="web">Web</option>
            <option value="referencia">Referencia</option>
            <option value="cold_call">Cold call</option>
            <option value="evento">Evento</option>
            <option value="otro">Otro</option>
          </Select>
        </Field>

        <Field label="Dirección" htmlFor="direccion" error={e.direccion}>
          <Input id="direccion" name="direccion" />
        </Field>

        <Field label="Asignado a" htmlFor="asignado_id" error={e.asignado_id}>
          <Select id="asignado_id" name="asignado_id" defaultValue="">
            <option value="">(no asignado)</option>
            {usuarios.map((u) => (
              <option key={u.id} value={u.id}>{u.nombre} · {u.rol}</option>
            ))}
          </Select>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Ciudad" htmlFor="ciudad" error={e.ciudad}>
            <Input id="ciudad" name="ciudad" />
          </Field>
          <Field label="País" htmlFor="pais" error={e.pais}>
            <Input id="pais" name="pais" />
          </Field>
        </div>
      </div>

      <Field label="Descripción" htmlFor="descripcion" error={e.descripcion}>
        <Textarea id="descripcion" name="descripcion" rows={4} />
      </Field>

      <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Creando..." : "Crear empresa"}
        </Button>
        <Link href="/empresas" className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
