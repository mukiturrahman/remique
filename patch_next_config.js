const fs = require('fs');
let code = fs.readFileSync('next.config.ts', 'utf8');

const newCode = `import type { NextConfig } from "next";

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
`;

fs.writeFileSync('next.config.ts', newCode);
console.log('Patched next.config.ts');
