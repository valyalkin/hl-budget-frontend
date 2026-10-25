import { expect, it } from 'vitest';
import robots from '@/app/robots';
import sitemap from '@/app/sitemap';

it('the sitemap lists only the landing page', () => {
  const urls = sitemap().map((entry) => new URL(entry.url).pathname);
  expect(urls).toEqual(['/']);
  expect(urls).not.toContain('/home');
});

it('robots disallows the signed-in and auth routes', () => {
  const [rule] = [robots().rules].flat();
  expect(rule?.disallow).toEqual(expect.arrayContaining(['/home', '/auth/']));
});
