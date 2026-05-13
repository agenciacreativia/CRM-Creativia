"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type FormData = { email: string };

export function ForgotPasswordForm() {
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit } = useForm<FormData>();

  async function onSubmit(values: FormData) {
    setSubmitting(true);
    setError(null);
    const supabase = createBrowserSupabase();
    const redirectTo = `${window.location.origin}/auth/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo,
    });
    setSubmitting(false);
    if (error) {
      setError("No se pudo enviar el email. Verificá la dirección.");
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="space-y-4 text-center">
        <div className="bg-green-50 border border-green-200 rounded p-4 text-sm text-green-800">
          ✓ Email enviado. Revisá tu bandeja de entrada (y la carpeta de spam).
        </div>
        <Link href="/login" className="text-sm text-brand-primary hover:underline">
          ← Volver al login
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" autoComplete="email" required {...register("email", { required: true })} />
      </div>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-status-danger">{error}</div>
      )}

      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? "Enviando..." : "Enviar link de recuperación"}
      </Button>

      <div className="text-center">
        <Link href="/login" className="text-sm text-gray-500 hover:underline">
          ← Volver al login
        </Link>
      </div>
    </form>
  );
}
