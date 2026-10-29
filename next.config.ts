import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV !== 'production';

/**
 * A static policy keeps every route prerenderable. Next injects inline bootstrap scripts, so
 * script-src needs 'unsafe-inline' without per-request nonces; 'strict-dynamic' without a nonce
 * would make browsers ignore 'self' and block hydration.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  // Avatars come from the identity provider (any https host).
  "img-src 'self' https: data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

const nextConfig: NextConfig = {
  // Self-contained server.js for the container image (research R-015).
  output: 'standalone',
  reactStrictMode: true,
  reactCompiler: true,
  // Caching is explicit via 'use cache'; per-user reads stay dynamic.
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  // 001's placeholder page is now the Spendings screen (research R-001).
  async redirects() {
    return [
      { source: '/home', destination: '/spendings', permanent: true },
      { source: '/home/:path*', destination: '/spendings', permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000' },
        ],
      },
    ];
  },
};

export default nextConfig;
