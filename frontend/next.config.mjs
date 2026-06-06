import { fileURLToPath } from 'node:url';

const outputFileTracingRoot = fileURLToPath(new URL('.', import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    externalDir: true,
  },
  outputFileTracingRoot,
};

export default nextConfig;
