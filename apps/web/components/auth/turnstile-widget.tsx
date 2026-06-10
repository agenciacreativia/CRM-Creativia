"use client";

import { forwardRef } from "react";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { env } from "@/lib/env";

/**
 * Widget de Cloudflare Turnstile (CAPTCHA) para los formularios de auth.
 *
 * - Si NEXT_PUBLIC_TURNSTILE_SITE_KEY no está configurada, no renderiza nada
 *   y `enabled` es false — el form sigue funcionando sin captcha (permite
 *   activar/desactivar la protección sin romper el login).
 * - El token obtenido se pasa a `signInWithPassword`/`resetPasswordForEmail`
 *   vía `options.captchaToken`. Supabase lo valida contra Cloudflare con la
 *   secret key configurada en su dashboard (la secret NO vive en este código).
 * - Los tokens de Turnstile son de un solo uso: tras un error de login hay que
 *   resetear el widget (ver `ref.current?.reset()` en los forms).
 */
export const TURNSTILE_ENABLED = env.TURNSTILE_SITE_KEY.length > 0;

export const TurnstileWidget = forwardRef<
  TurnstileInstance,
  { onToken: (token: string) => void; onExpire?: () => void }
>(function TurnstileWidget({ onToken, onExpire }, ref) {
  if (!TURNSTILE_ENABLED) return null;
  return (
    <div className="flex justify-center">
      <Turnstile
        ref={ref}
        siteKey={env.TURNSTILE_SITE_KEY}
        onSuccess={onToken}
        onExpire={() => {
          onToken("");
          onExpire?.();
        }}
        onError={() => onToken("")}
        options={{ theme: "light", size: "flexible" }}
      />
    </div>
  );
});
