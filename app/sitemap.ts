import type { MetadataRoute } from 'next';

const baseUrl = process.env.APP_BASE_URL ?? 'http://localhost:3000';

/** Public pages only (FR-004): never a signed-in route. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: `${baseUrl}/`, changeFrequency: 'monthly', priority: 1 }];
}
