import { expect, test } from '@playwright/test';
import { completeUniversalLogin, signIn } from './support';

/**
 * SC-006. The API-down case needs a second web server whose API_BASE_URL points at a closed
 * port (README "End-to-end tests"); its origin goes in E2E_DOWN_BASE_URL and must also be an
 * allowed callback URL in the test tenant. Without it that case skips.
 */
test.describe('US4: failures end in a friendly page or a sign-in redirect', () => {
  test('a cancelled or denied sign-in lands on the landing page with a notice', async ({
    page,
  }) => {
    await page.goto('/?signin=failed');
    await expect(page.getByRole('status')).toHaveText(
      'Sign-in did not complete. You can try again.',
    );
    await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();
  });

  test('an Auth0 error on the callback ends on the notice, not a raw error', async ({
    page,
  }) => {
    const response = await page.goto(
      '/auth/callback?error=access_denied&error_description=User%20cancelled&state=unknown',
    );
    expect(response?.status()).toBeLessThan(500);
    await page.waitForURL((url) => url.searchParams.get('signin') === 'failed');
    await expect(page.getByRole('status')).toBeVisible();
  });

  test('an expired session cookie sends the user to sign in and back to /home', async ({
    page,
    context,
  }) => {
    await signIn(page);
    await context.clearCookies();
    await page.goto('/home');
    await page.waitForURL(/\/u\/login|\/authorize/);
  });
});

test.describe('US4: the API is down (web server with API_BASE_URL on a closed port)', () => {
  test.skip(
    !process.env.E2E_DOWN_BASE_URL,
    'E2E_DOWN_BASE_URL is not set (second web server pointed at a closed API port)',
  );

  test('the home page shows Something went wrong with Try again, no internals', async ({
    page,
  }) => {
    const base = process.env.E2E_DOWN_BASE_URL ?? '';
    await page.goto(`${base}/auth/login`);
    await completeUniversalLogin(page);
    await page.waitForURL('**/home');

    await expect(
      page.getByRole('heading', { name: 'Something went wrong' }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
    await expect(page.locator('body')).not.toContainText(
      /ECONNREFUSED|500|stack|at /,
    );
  });
});
