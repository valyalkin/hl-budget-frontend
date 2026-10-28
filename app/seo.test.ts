import { expect, it, vi } from 'vitest';

vi.mock('next/server', () => ({ connection: vi.fn(async () => undefined) }));

import robots from '@/app/robots';
import sitemap from '@/app/sitemap';

it('the sitemap lists only the landing page, at the runtime origin', async () => {
  const entries = await sitemap();
  expect(entries.map((entry) => entry.url)).toEqual(['http://app.test/']);
});

it('robots disallows the signed-in and auth routes', async () => {
  const result = await robots();
  const [rule] = [result.rules].flat();
  expect(rule?.disallow).toEqual(
    expect.arrayContaining(['/spendings', '/home', '/auth/']),
  );
  expect(result.sitemap).toBe('http://app.test/sitemap.xml');
});
