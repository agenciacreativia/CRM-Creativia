/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typedRoutes: false,
  transpilePackages: ["@crm/shared", "@crm/i18n"],

  // Default the /oportunidades route to the Kanban view. Doing this at the
  // routing layer (instead of redirect() inside a page) issues a clean 307
  // before any rendering happens — no flash of the loading skeleton.
  async redirects() {
    return [
      {
        source: "/oportunidades",
        destination: "/oportunidades/kanban",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
