import { expect, test } from '@playwright/test';
import { completeUniversalLogin, credentials, signIn } from './support';

test.describe('US2: protected pages require sign-in (SC-003)', () => {
  test('signed out, /spendings answers 302 to login with no spending content', async ({
    request,
  }) => {
    const response = await request.get('/spendings?month=2026-09', {
      maxRedirects: 0,
    });

    expect(response.status()).toBe(302);
    expect(response.headers()['location']).toContain(
      '/auth/login?returnTo=%2Fspendings%3Fmonth%3D2026-09',
    );
    // Next echoes the redirect target as plain text; no page or profile is rendered.
    expect(await response.text()).not.toMatch(/<html|Spendings in/i);
  });

  test('after signing in, the user is back on the page they asked for', async ({
    page,
  }) => {
    credentials();
    await page.goto('/spendings?month=2026-09');
    await completeUniversalLogin(page);

    await page.waitForURL('**/spendings?month=2026-09');
    await expect(
      page.getByRole('heading', { level: 1, name: 'September 2026' }),
    ).toBeVisible();
  });

  test('a tampered session cookie is treated as signed out', async ({
    page,
    context,
    baseURL,
  }) => {
    await signIn(page);
    const cookies = await context.cookies();
    const session = cookies.find((cookie) =>
      cookie.name.startsWith('__session'),
    );
    expect(session).toBeDefined();

    await context.clearCookies();
    await context.addCookies([
      { ...session!, value: `${session!.value.slice(0, -8)}tampered` },
    ]);

    const response = await page.request.get(`${baseURL}/spendings`, {
      maxRedirects: 0,
    });
    expect(response.status()).toBe(302);
    expect(response.headers()['location']).toContain('/auth/login');
  });

  test('an absolute returnTo is ignored and the user lands on /spendings', async ({
    page,
  }) => {
    credentials();
    await page.goto('/auth/login?returnTo=https://example.com');
    await completeUniversalLogin(page);

    await page.waitForURL('**/spendings**');
    expect(new URL(page.url()).host).not.toBe('example.com');
  });

  test('the old /home address redirects to /spendings', async ({ request }) => {
    const response = await request.get('/home', { maxRedirects: 0 });
    expect(response.status()).toBe(308);
    expect(response.headers()['location']).toBe('/spendings');
  });

  test('/spendings is marked noindex', async ({ page }) => {
    await signIn(page);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      /noindex/,
    );
  });
});
