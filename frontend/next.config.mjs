import { fileURLToPath } from 'node:url';

const outputFileTracingRoot = fileURLToPath(new URL('.', import.meta.url));
const configuredApiTarget =
  process.env.API_PROXY_TARGET ||
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/api\/?$/, '') ||
  'http://localhost:4000';

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    externalDir: true,
  },
  outputFileTracingRoot,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${configuredApiTarget}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
