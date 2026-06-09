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
};

export default nextConfig;
