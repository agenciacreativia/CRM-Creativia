/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: false,
  },
  transpilePackages: ["@crm/shared", "@crm/i18n"],
};

export default nextConfig;
