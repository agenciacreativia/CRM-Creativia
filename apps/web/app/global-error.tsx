"use client";

/**
 * Fallback de último recurso: se renderiza cuando el root layout falló.
 * Debe incluir <html> y <body> porque reemplaza al layout entero.
 * Sin Tailwind (puede no haber cargado): estilos inline.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          fontFamily:
            "Poppins, Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          background: "#f7f9ff",
          color: "#081d2d",
          display: "grid",
          placeItems: "center",
          minHeight: "100vh",
          padding: "64px 20px",
        }}
      >
        <div style={{ maxWidth: 560, width: "100%", textAlign: "center" }}>
          <div
            style={{
              width: 64,
              height: 64,
              margin: "0 auto 24px",
              borderRadius: 16,
              background: "#ba1a1a",
              color: "white",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 32,
              fontWeight: 700,
              boxShadow: "0 8px 24px rgba(186,26,26,0.25)",
            }}
            aria-hidden
          >
            !
          </div>
          <p
            style={{
              margin: 0,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.2em",
              color: "#ba1a1a",
              textTransform: "uppercase",
            }}
          >
            Error crítico
          </p>
          <h1
            style={{
              marginTop: 12,
              marginBottom: 16,
              fontSize: 40,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              fontWeight: 800,
              color: "#120b40",
            }}
          >
            Algo se rompió<br />a un nivel profundo
          </h1>
          <p style={{ color: "#47464f", fontSize: 16, lineHeight: 1.5, margin: 0 }}>
            Detectamos un error que impidió cargar la aplicación. Probá recargar la
            página. Si persiste, escribinos a{" "}
            <a
              href="mailto:hola@agenciacreativia.com"
              style={{ color: "#272255", fontWeight: 600 }}
            >
              hola@agenciacreativia.com
            </a>
            .
          </p>
          {error.digest && (
            <p
              style={{
                marginTop: 16,
                fontFamily:
                  "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, monospace",
                fontSize: 12,
                color: "#787680",
              }}
            >
              Código de referencia: <span style={{ userSelect: "all" }}>{error.digest}</span>
            </p>
          )}
          <div
            style={{
              marginTop: 32,
              display: "flex",
              justifyContent: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={reset}
              style={{
                border: 0,
                cursor: "pointer",
                padding: "12px 24px",
                borderRadius: 999,
                background: "#aaf52b",
                color: "#120b40",
                fontWeight: 700,
                fontSize: 14,
                boxShadow: "0 4px 12px rgba(170,245,43,0.4)",
              }}
            >
              Reintentar
            </button>
            <a
              href="/"
              style={{
                padding: "12px 24px",
                borderRadius: 999,
                background: "white",
                color: "#272255",
                border: "1px solid rgba(39,34,85,0.2)",
                fontWeight: 600,
                fontSize: 14,
                textDecoration: "none",
              }}
            >
              Volver al inicio
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
