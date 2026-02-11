/** @type {import('next').NextConfig} */
const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";

const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${backendUrl}/api/v1/:path*`,
      },
    ];
  },
  serverExternalPackages: [],
  experimental: {
    proxyTimeout: 300000, // 5 minutes for large batch uploads
  },
};

module.exports = nextConfig;
