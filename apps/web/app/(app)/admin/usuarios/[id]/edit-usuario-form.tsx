"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Field } from "@/components/ui/field";
import type { UsuarioRow } from "@/lib/db/usuarios";
import { updateUsuarioAction, type UsuarioActionState } from "../actions";

const INITIAL: UsuarioActionState = { ok: false };

export function EditUsuarioForm({ usuario, isSelf }: { usuario: UsuarioRow; isSelf: boolean }) {
  const action = updateUsuarioAction.bind(null, usuario.id);
  const [state, formAction, isPending] = useActionState(action, INITIAL);
  const e = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-5">
      {state.error && (
        <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-status-danger">
          {state.error}
        </div>
      )}
      {state.ok && (
        <div className="bg-green-50 border border-green-200 rounded p-3 text-sm text-green-800">
          ✓ Cambios guardados.
        </div>
      )}

      <Field label="Nombre" htmlFor="nombre" required error={e.nombre}>
        <Input id="nombre" name="nombre" defaultValue={usuario.nombre} required />
      </Field>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Rol" htmlFor="rol" error={e.rol}>
          <Select id="rol" name="rol" defaultValue={usuario.rol} disabled={isSelf}>
            <option value="asesor">Asesor</option>
            <option value="admin">Admin</option>
          </Select>
        </Field>
        <Field label="Estado" htmlFor="activo" error={e.activo}>
          <Select id="activo" name="activo" defaultValue={String(usuario.activo)} disabled={isSelf}>
            <option value="true">Activo</option>
            <option value="false">Desactivado</option>
          </Select>
        </Field>
      </div>

      <Field
        label="Resetear contraseña"
        htmlFor="password"
        error={e.password}
        hint="Dejá vacío para no cambiar. Mínimo 8 caracteres si la cambiás."
      >
        <Input id="password" name="password" type="text" autoComplete="off" placeholder="••••••••" />
      </Field>

      <p className="text-xs text-gray-400 border-t border-gray-100 pt-3">
        Email: <code className="text-gray-600">{usuario.email}</code> (no editable)
      </p>

      <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Guardando..." : "Guardar cambios"}
        </Button>
        <Link href="/admin/usuarios" className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
