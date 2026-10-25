import { expect, test } from '@playwright/test';
import { completeUniversalLogin, credentials, signIn } from './support';

test.describe('US2: protected pages require sign-in (SC-003)', () => {
  test('signed out, /home answers 302 to login with no profile content', async ({
    request,
  }) => {
    const response = await request.get('/home?x=1', { maxRedirects: 0 });

    expect(response.status()).toBe(302);
    expect(response.headers()['location']).toContain(
      '/auth/login?returnTo=%2Fhome%3Fx%3D1',
    );
    // Next echoes the redirect target as plain text; no page or profile is rendered.
    expect(await response.text()).not.toMatch(/<html|Hello/i);
  });

  test('after signing in, the user is back on the page they asked for', async ({
    page,
  }) => {
    credentials();
    await page.goto('/home?x=1');
    await completeUniversalLogin(page);

    await page.waitForURL('**/home?x=1');
    await expect(page.getByRole('heading', { name: /^Hello/ })).toBeVisible();
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

    const response = await page.request.get(`${baseURL}/home`, {
      maxRedirects: 0,
    });
    expect(response.status()).toBe(302);
    expect(response.headers()['location']).toContain('/auth/login');
  });

  test('an absolute returnTo is ignored and the user lands on /home', async ({
    page,
  }) => {
    credentials();
    await page.goto('/auth/login?returnTo=https://example.com');
    await completeUniversalLogin(page);

    await page.waitForURL('**/home');
    expect(new URL(page.url()).host).not.toBe('example.com');
  });

  test('/home is marked noindex', async ({ page }) => {
    await signIn(page);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      /noindex/,
    );
  });
});
