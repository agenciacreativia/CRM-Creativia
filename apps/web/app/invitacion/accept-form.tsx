"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { acceptInvitacionAction } from "./actions";

export function AcceptForm({ token, email, nombre: initialNombre }: { token: string; email: string; nombre: string }) {
  const router = useRouter();
  const [nombre, setNombre] = useState(initialNombre);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit() {
    setError(null);
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setSaving(true);
    const res = await acceptInvitacionAction({ token, nombre, password });
    setSaving(false);
    if (!res.ok) {
      setError(res.error ?? "Error");
      return;
    }
    setDone(true);
    setTimeout(() => router.push("/login"), 1800);
  }

  if (done) {
    return (
      <div className="rounded-md border border-green-200 bg-green-50 p-4 text-sm text-gray-800">
        ¡Cuenta creada! Te estamos llevando al inicio de sesión…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-status-danger">{error}</div>}

      <Field label="Correo">
        <Input value={email} disabled className="bg-gray-50" />
      </Field>
      <Field label="Tu nombre">
        <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre y apellido" />
      </Field>
      <Field label="Contraseña">
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 8 caracteres" />
      </Field>
      <Field label="Repetir contraseña">
        {/* Bloqueamos paste en la confirmación: forzamos retipear para detectar errores antes del submit. */}
        <Input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          onPaste={(e) => e.preventDefault()}
        />
      </Field>

      <Button type="button" onClick={submit} disabled={saving} className="w-full">
        {saving ? "Creando cuenta…" : "Crear mi cuenta"}
      </Button>
    </div>
  );
}
