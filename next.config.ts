import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'www.remique.app',
          },
        ],
        destination: 'https://remique.app/:path*',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
