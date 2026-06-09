"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Field } from "@/components/ui/field";
import { createUsuarioAction, type UsuarioActionState } from "./actions";

const INITIAL: UsuarioActionState = { ok: false };

export function NewUsuarioForm() {
  const [state, formAction, isPending] = useActionState(createUsuarioAction, INITIAL);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const e = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      router.refresh();
    }
  }, [state.ok, router]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4 max-w-2xl">
      {state.error && (
        <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-status-danger">
          {state.error}
        </div>
      )}
      {state.ok && (
        <div className="bg-green-50 border border-green-200 rounded p-3 text-sm text-green-800">
          ✓ Usuario creado. Compartile la contraseña inicial — debería cambiarla al loguearse.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Nombre completo" htmlFor="nombre" required error={e.nombre}>
          <Input id="nombre" name="nombre" placeholder="ej. Santiago Alcaraz" required />
        </Field>
        <Field label="Email" htmlFor="email" required error={e.email}>
          <Input id="email" name="email" type="email" placeholder="usuario@empresa.com" required />
        </Field>
        <Field label="Rol" htmlFor="rol" required error={e.rol}>
          <Select id="rol" name="rol" defaultValue="asesor">
            <option value="asesor">Asesor</option>
            <option value="admin">Admin</option>
          </Select>
        </Field>
        <Field
          label="Contraseña inicial"
          htmlFor="password"
          required
          error={e.password}
          hint="Mínimo 8 caracteres. El usuario puede cambiarla después."
        >
          <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} aria-label="Contraseña inicial" />
        </Field>
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? "Creando..." : "+ Crear usuario"}
      </Button>
    </form>
  );
}
