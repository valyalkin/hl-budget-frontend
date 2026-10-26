import { expect, test } from '@playwright/test';
import { signIn } from './support';

test.describe('US4: unknown addresses (FR-022)', () => {
  test('signed out, /nope is a 404 page with a link home', async ({ page }) => {
    const response = await page.goto('/nope');
    expect(response?.status()).toBe(404);
    await expect(
      page.getByRole('heading', { name: 'Page not found' }),
    ).toBeVisible();
    await page.getByRole('link', { name: 'Back to HL Budget' }).click();
    await page.waitForURL((url) => url.pathname === '/');
  });

  test('signed in, /nope is the same 404 page', async ({ page }) => {
    await signIn(page);
    const response = await page.goto('/nope');
    expect(response?.status()).toBe(404);
    await expect(
      page.getByRole('heading', { name: 'Page not found' }),
    ).toBeVisible();
  });
});
