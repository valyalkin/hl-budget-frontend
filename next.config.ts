import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Self-contained server.js for the container image (research R-015).
  output: 'standalone',
  reactStrictMode: true,
  reactCompiler: true,
  // Caching is explicit via 'use cache'; per-user reads stay dynamic.
  cacheComponents: true,
};

export default nextConfig;
