/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:8000/api/:path*",
      },
    ];
  },
  serverExternalPackages: [],
  experimental: {
    proxyTimeout: 300000, // 5 minutes for large batch uploads
  },
};

module.exports = nextConfig;
