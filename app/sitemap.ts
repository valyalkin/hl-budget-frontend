import type { MetadataRoute } from 'next';
import { connection } from 'next/server';

/** Public pages only (FR-004). Per request, so it carries the runtime APP_BASE_URL. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const baseUrl = process.env.APP_BASE_URL ?? 'http://localhost:3000';
  return [{ url: `${baseUrl}/`, changeFrequency: 'monthly', priority: 1 }];
}
