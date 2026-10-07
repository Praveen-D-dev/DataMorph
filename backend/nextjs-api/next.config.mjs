/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configured as API/backend service
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ["pg"]
  }
};

export default nextConfig;
