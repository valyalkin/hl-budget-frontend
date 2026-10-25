import type { MetadataRoute } from 'next';

const baseUrl = process.env.APP_BASE_URL ?? 'http://localhost:3000';

/** Only the landing page is public. Signed-in pages and the auth routes are never crawled. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/home', '/auth/'] }],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
