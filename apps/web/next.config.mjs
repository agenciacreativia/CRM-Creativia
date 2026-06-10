/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typedRoutes: false,
  transpilePackages: ["@crm/shared", "@crm/i18n"],

  // Only pull in the icons actually used instead of the whole barrel — keeps
  // dev compilation (and prod bundles) fast for icon-heavy pages like the landing.
  experimental: {
    optimizePackageImports: ["lucide-react"],
    // Allow document uploads through Server Actions (default cap is 1 MB).
    serverActions: {
      bodySizeLimit: "26mb",
    },
  },

  // /oportunidades ya NO tiene redirect global — la propia page lee la
  // preferencia del usuario (localStorage) y manda a tabla o kanban.

  // Headers de seguridad aplicados a todas las respuestas. Mitigan clickjacking
  // (frame-ancestors), MIME sniffing (nosniff), fuga de referer y degradan el
  // impacto de un XSS (CSP). HSTS fuerza HTTPS en visitas posteriores.
  async headers() {
    // CSP relajada para Next (necesita 'unsafe-inline'/'unsafe-eval' en dev y
    // para los scripts inline de hidratación). connect-src incluye Supabase y
    // Google APIs. Ajustar `*.supabase.co` si cambia el proyecto.
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co https://*.supabase.in https://www.googleapis.com https://oauth2.googleapis.com",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join("; ");

    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
