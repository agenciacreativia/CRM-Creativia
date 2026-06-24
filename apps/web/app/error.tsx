"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCcw, ArrowLeft, Mail } from "lucide-react";

/**
 * Captura errores no manejados de rutas del App Router.
 * Se renderiza dentro del root layout, así que mantiene la navegación.
 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Visible en server logs / Sentry si está configurado.
    console.error("App route error:", error);
  }, [error]);

  return (
    <main className="grid min-h-screen place-items-center bg-[#f7f9ff] px-5 py-16 text-[#081d2d]">
      <div className="mx-auto w-full max-w-xl text-center">
        <div className="mx-auto mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-[#ba1a1a] text-white shadow-[0_8px_24px_rgba(186,26,26,0.25)]">
          <AlertTriangle className="h-8 w-8" />
        </div>

        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#ba1a1a]">
          Algo salió mal
        </p>
        <h1 className="mt-3 text-4xl font-extrabold leading-tight tracking-tight text-[#120b40] sm:text-5xl">
          No pudimos cargar<br className="hidden sm:block" />
          esta sección
        </h1>
        <p className="mx-auto mt-4 max-w-md text-base text-[#47464f]">
          Tuvimos un problema técnico procesando tu solicitud. Volvelo a intentar:
          si el error persiste, escribinos y lo resolvemos rápido.
        </p>

        {error.digest && (
          <p className="mx-auto mt-4 max-w-md font-mono text-xs text-[#787680]">
            Código de referencia: <span className="select-all">{error.digest}</span>
          </p>
        )}

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-full bg-[#aaf52b] px-6 py-3 text-sm font-bold text-[#120b40] shadow-[0_4px_12px_rgba(170,245,43,0.4)] transition hover:-translate-y-0.5 hover:bg-[#9be022]"
          >
            <RefreshCcw className="h-4 w-4" />
            Reintentar
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-[#272255]/20 bg-white px-6 py-3 text-sm font-semibold text-[#272255] transition hover:-translate-y-0.5 hover:border-[#272255]"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al inicio
          </Link>
          <a
            href={
              error.digest
                ? `mailto:hola@agenciacreativia.com?subject=Error%20${error.digest}&body=Reporto%20un%20error%20con%20código:%20${error.digest}`
                : "mailto:hola@agenciacreativia.com"
            }
            className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-[#47464f] transition hover:text-[#272255]"
          >
            <Mail className="h-4 w-4" />
            Reportar
          </a>
        </div>
      </div>
    </main>
  );
}
