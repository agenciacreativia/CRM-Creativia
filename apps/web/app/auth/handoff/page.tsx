"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { createBrowserSupabase } from "@/lib/supabase/client";

/**
 * Session handoff landing.
 *
 * The central (bare-domain) login authenticates the user, then redirects here
 * — on the user's own tenant subdomain — passing the session tokens in the URL
 * fragment (never sent to the server). We set the session so the auth cookies
 * are written for THIS host, then continue to the requested page.
 */
export default function HandoffPage() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const access_token = hash.get("access_token");
    const refresh_token = hash.get("refresh_token");
    const nextRaw = hash.get("next") || "/dashboard";
    const imp = hash.get("imp") === "1";
    // Sanitización anti-XSS: `agencia` se muestra luego en el banner de impersonación.
    // Limitamos a caracteres seguros (letras, números, espacios y signos básicos) y
    // recortamos longitud para evitar inyección de HTML/JS vía localStorage.
    const agenciaRaw = hash.get("agencia") || "";
    const agencia = agenciaRaw.replace(/[<>"'`\\]/g, "").slice(0, 120);
    // `volver` debe ser una ruta relativa segura (mismo criterio que `next`).
    const volverRaw = hash.get("volver") || "";
    const volver = /^\/[^/]/.test(volverRaw) ? volverRaw.slice(0, 500) : "";
    // Defensa anti open-redirect: el `next` debe ser una ruta relativa que arranca
    // con "/" y NO con "//" (URLs protocol-relative que escapan al mismo host).
    const next = /^\/[^/]/.test(nextRaw) ? nextRaw : "/dashboard";

    if (!access_token || !refresh_token) {
      setError("No se recibieron las credenciales de sesión.");
      return;
    }

    const supabase = createBrowserSupabase();
    supabase.auth
      .setSession({ access_token, refresh_token })
      .then(({ error }) => {
        if (error) {
          setError(error.message);
          return;
        }
        // Flag impersonation so the agency CRM shows a "support mode" banner.
        try {
          if (imp) localStorage.setItem("crm.impersonando", JSON.stringify({ agencia, volver }));
          else localStorage.removeItem("crm.impersonando");
        } catch {
          /* ignore */
        }
        // Clean the tokens out of the URL, then continue.
        window.location.replace(next);
      })
      .catch((e) => setError(String(e)));
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="text-center">
        {/* Logo según tema: full-color en light, texto blanco en dark (el navy
            del logo a color se pierde sobre el fondo oscuro de la precarga). */}
        <Image
          src="/turistea-crm.svg"
          alt="Turistea CRM"
          width={1677}
          height={451}
          priority
          className="mx-auto h-12 w-auto dark:hidden"
        />
        <Image
          src="/turistea-crm-light.svg"
          alt="Turistea CRM"
          width={1677}
          height={451}
          priority
          className="mx-auto hidden h-12 w-auto dark:block"
        />
        {error ? (
          <p className="mt-6 text-sm text-status-danger">{error}</p>
        ) : (
          <p className="mt-6 text-sm text-gray-500">Ingresando a tu espacio…</p>
        )}
      </div>
    </main>
  );
}
