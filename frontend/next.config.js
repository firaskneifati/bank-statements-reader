/** @type {import('next').NextConfig} */
const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";

const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
  serverExternalPackages: [],
  experimental: {
    proxyTimeout: 300000, // 5 minutes for large batch uploads
  },
};

module.exports = nextConfig;
