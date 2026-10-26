import { expect, test } from '@playwright/test';
import { completeUniversalLogin, credentials } from './support';

test.describe('US1: sign in and see my own profile', () => {
  test('the landing page shows the name, a description and Sign in', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page).toHaveTitle('HL Budget');
    await expect(
      page.getByRole('heading', { level: 1, name: 'HL Budget' }),
    ).toBeVisible();
    await expect(page.getByText(/budget for the household/i)).toBeVisible();
    await expect(page.getByRole('link', { name: 'Sign in' })).toHaveAttribute(
      'href',
      '/auth/login',
    );
  });

  test('Sign in → Universal Login → /home with greeting, email and avatar (SC-001)', async ({
    page,
  }) => {
    const { username } = credentials();
    const started = Date.now();

    await page.goto('/');
    await page.getByRole('link', { name: 'Sign in' }).click();
    await completeUniversalLogin(page);

    await page.waitForURL('**/home');
    await expect(page.getByRole('heading', { name: /^Hello/ })).toBeVisible();
    await expect(page.getByText(username)).toBeVisible();
    await expect(
      page.locator('section img, section [role="img"]'),
    ).toBeVisible();
    // Loose bound: the 30 s budget is measured properly on the deployed app (quickstart).
    expect(Date.now() - started).toBeLessThan(30_000);
  });

  test('two browsers signing in at once both reach /home (SC-002)', async ({
    browser,
  }) => {
    credentials();
    const contexts = await Promise.all([
      browser.newContext(),
      browser.newContext(),
    ]);
    const pages = await Promise.all(
      contexts.map((context) => context.newPage()),
    );

    await Promise.all(
      pages.map(async (page) => {
        await page.goto('/auth/login');
        await completeUniversalLogin(page);
        await page.waitForURL('**/home');
        await expect(
          page.getByRole('heading', { name: /^Hello/ }),
        ).toBeVisible();
      }),
    );

    await Promise.all(contexts.map((context) => context.close()));
  });
});
