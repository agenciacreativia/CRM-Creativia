/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typedRoutes: false,
  transpilePackages: ["@crm/shared", "@crm/i18n"],
};

export default nextConfig;
