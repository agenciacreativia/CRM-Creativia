"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type FormData = { email: string; password: string };

export function LoginForm() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/dashboard";

  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>();

  async function onSubmit(values: FormData) {
    setSubmitting(true);
    setServerError(null);

    const supabase = createBrowserSupabase();
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    if (error) {
      setServerError(t("login.error_invalid_credentials"));
      setSubmitting(false);
      return;
    }

    router.push(next);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="email">{t("login.email")}</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          {...register("email", { required: true })}
        />
        {errors.email && <p className="text-xs text-status-danger mt-1">{t("login.email_required")}</p>}
      </div>

      <div>
        <Label htmlFor="password">{t("login.password")}</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          {...register("password", { required: true, minLength: 8 })}
        />
        {errors.password && (
          <p className="text-xs text-status-danger mt-1">{t("login.password_min")}</p>
        )}
      </div>

      {serverError && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-status-danger">
          {serverError}
        </div>
      )}

      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? t("login.signing_in") : t("login.submit")}
      </Button>
    </form>
  );
}
