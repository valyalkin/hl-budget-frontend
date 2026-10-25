import { expect, test } from '@playwright/test';
import { signIn } from './support';

test.describe('US3: sign out', () => {
  test('Sign out ends the session here and at Auth0', async ({ page }) => {
    await signIn(page);
    const homeResponse = await page.reload();
    // US3-AS4: protected pages are never served from a cache.
    expect(homeResponse?.headers()['cache-control']).toContain('no-store');

    await page.getByRole('link', { name: 'Sign out' }).click();
    await page.waitForURL((url) => url.pathname === '/');
    await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();

    // Back must not show the profile: the page reloads and the proxy redirects.
    await page.goBack();
    await expect(page.getByRole('heading', { name: /^Hello/ })).toHaveCount(0);

    // /home now needs a fresh sign-in…
    await page.goto('/home');
    await page.waitForURL(/\/u\/login|\/authorize/);
    // …and Auth0 asks for credentials rather than signing in silently.
    await expect(page.getByLabel(/^password$/i)).toBeVisible();
  });
});
