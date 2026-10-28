import type { MetadataRoute } from 'next';
import { connection } from 'next/server';

/**
 * Only the signed-out page is public. Rendered per request so the sitemap URL uses the runtime
 * APP_BASE_URL, not whatever was set when the image was built.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  await connection();
  const baseUrl = process.env.APP_BASE_URL ?? 'http://localhost:3000';
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/spendings', '/home', '/auth/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
