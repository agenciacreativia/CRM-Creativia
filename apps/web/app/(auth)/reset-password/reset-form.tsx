"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type FormData = { password: string; confirm: string };

export function ResetPasswordForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recoveryReady, setRecoveryReady] = useState(false);
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>();
  const newPassword = watch("password");

  // Cleanup del setTimeout si el componente se desmonta antes de los 3.5 seg.
  useEffect(() => () => {
    if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
  }, []);

  // Supabase fires a PASSWORD_RECOVERY event after the user clicks the
  // email link. We wait for that before allowing the user to set a new
  // password — otherwise updateUser() would fail.
  useEffect(() => {
    const supabase = createBrowserSupabase();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setRecoveryReady(true);
    });
    // Already on the page with a session? Treat as ready.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setRecoveryReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function onSubmit(values: FormData) {
    if (values.password !== values.confirm) {
      setError("Las contraseñas no coinciden");
      return;
    }
    if (values.password.length < 8) {
      setError("Mínimo 8 caracteres");
      return;
    }
    setSubmitting(true);
    setError(null);
    const supabase = createBrowserSupabase();
    const { error } = await supabase.auth.updateUser({ password: values.password });
    setSubmitting(false);
    if (error) {
      setError(error.message);
      return;
    }
    setDone(true);
    // 3.5s — más tiempo del que el ojo necesita para leer el aviso y darle a
    // "Login" manualmente. Se cancela si el componente se desmonta.
    redirectTimerRef.current = setTimeout(() => router.push("/login"), 3500);
  }

  if (done) {
    return (
      <div className="bg-green-50 border border-green-200 rounded p-4 text-sm text-green-800 text-center">
        ✓ Contraseña actualizada. Redirigiendo al login...
      </div>
    );
  }

  if (!recoveryReady) {
    return (
      <div className="text-sm text-gray-500 text-center py-4">
        <p>Validando el link de recuperación...</p>
        <p className="text-xs text-gray-400 mt-2">
          Si llegaste acá desde un email reciente, espera unos segundos. Si no, pedí un nuevo link en{" "}
          <Link href="/forgot-password" className="text-brand-primary hover:underline">
            ¿Olvidaste tu contraseña?
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form
      method="POST"
      action="#"
      autoComplete="off"
      onSubmit={(e) => {
        // Garantiza que ningún form-submit nativo deje passwords en URL.
        e.preventDefault();
        e.stopPropagation();
        handleSubmit(onSubmit)(e);
      }}
      className="space-y-4"
    >
      <div>
        <Label htmlFor="password">Nueva contraseña</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          aria-label="Nueva contraseña"
          required
          minLength={8}
          {...register("password", { required: true, minLength: 8 })}
        />
        {errors.password && (
          <p className="text-xs text-status-danger mt-1">Mínimo 8 caracteres</p>
        )}
      </div>

      <div>
        <Label htmlFor="confirm">Confirmar contraseña</Label>
        <Input
          id="confirm"
          type="password"
          autoComplete="new-password"
          aria-label="Confirmar contraseña"
          required
          minLength={8}
          {...register("confirm", {
            required: true,
            validate: (v) => v === newPassword || "No coincide",
          })}
        />
        {errors.confirm && (
          <p className="text-xs text-status-danger mt-1">Las contraseñas no coinciden</p>
        )}
      </div>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-status-danger">{error}</div>
      )}

      <Button type="submit" disabled={submitting} aria-label="Actualizar contraseña" className="w-full">
        {submitting ? "Guardando..." : "Actualizar contraseña"}
      </Button>
    </form>
  );
}
