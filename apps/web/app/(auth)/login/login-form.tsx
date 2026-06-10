"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { TurnstileInstance } from "@marsidev/react-turnstile";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { env } from "@/lib/env";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TurnstileWidget, TURNSTILE_ENABLED } from "@/components/auth/turnstile-widget";

type FormData = { email: string; password: string };

/** Subdomain currently present in the browser host, or null on the bare domain. */
function currentSubdomain(): string | null {
  const host = window.location.hostname.toLowerCase();
  const base = env.BASE_DOMAIN.split(":")[0].toLowerCase();
  if (host === base) return null;
  if (!host.endsWith(`.${base}`)) return null;
  return host.slice(0, host.length - base.length - 1).split(".")[0] || null;
}

export function LoginForm() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/dashboard";

  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState("");
  const turnstileRef = useRef<TurnstileInstance>(null);
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>();

  async function onSubmit(values: FormData) {
    if (TURNSTILE_ENABLED && !captchaToken) {
      setServerError(t("login.captcha_required"));
      return;
    }
    setSubmitting(true);
    setServerError(null);

    try {
      const supabase = createBrowserSupabase();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
        options: TURNSTILE_ENABLED ? { captchaToken } : undefined,
      });

      if (error || !data?.session) {
        setServerError(t("login.error_invalid_credentials"));
        // Token Turnstile es de un solo uso: reseteamos para el próximo intento.
        turnstileRef.current?.reset();
        setCaptchaToken("");
        return;
      }

      // If we're already on a tenant subdomain, the session cookie is set for the
      // right host — just continue to the app.
      if (currentSubdomain()) {
        // Refrescamos antes de navegar para que el JWT recién emitido se propague
        // a los Server Components; navegar primero podría dejar al usuario en
        // 'next' con un árbol RSC stale.
        router.refresh();
        router.push(next);
        return;
      }

      // Central (bare-domain) login: figure out which tenant this user belongs to
      // and hand the session off to that subdomain.
      try {
        const res = await fetch("/api/auth/tenant-home");
        if (res.ok) {
          const { subdomain } = (await res.json()) as { subdomain: string };
          const hash = new URLSearchParams({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
            next,
          });
          // Construimos la URL con la API URL para evitar URLs malformadas si el
          // subdomain o BASE_DOMAIN contienen caracteres inesperados.
          const handoffUrl = new URL(
            "/auth/handoff",
            `${window.location.protocol}//${subdomain}.${env.BASE_DOMAIN}`,
          );
          handoffUrl.hash = hash.toString();
          window.location.href = handoffUrl.href;
          return;
        }
      } catch {
        // fall through to default
      }

      // Fallback: stay on the current host.
      router.push(next);
      router.refresh();
    } finally {
      // Garantizar que el botón vuelva a habilitarse en cualquier escenario
      // (error, success, excepción) — antes solo se reseteaba en el path de error.
      setSubmitting(false);
    }
  }

  return (
    <form
      method="POST"
      action="#"
      autoComplete="on"
      onSubmit={(e) => {
        // Blindaje extra: aún si el handler de react-hook-form no se montó
        // (hydration tardía, JS bloqueado, etc.) NUNCA dejamos que el browser
        // haga GET con email/password en la URL.
        e.preventDefault();
        e.stopPropagation();
        handleSubmit(onSubmit)(e);
      }}
      className="space-y-4"
    >
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

      <TurnstileWidget ref={turnstileRef} onToken={setCaptchaToken} />

      {serverError && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-status-danger">
          {serverError}
        </div>
      )}

      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? t("login.signing_in") : t("login.submit")}
      </Button>

      <div className="text-center">
        <Link href="/forgot-password" className="text-sm text-gray-500 hover:text-brand-primary hover:underline">
          {t("login.forgot_password")}
        </Link>
      </div>
    </form>
  );
}
