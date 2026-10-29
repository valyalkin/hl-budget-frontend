import { expect, test } from '@playwright/test';
import { completeUniversalLogin, credentials, MONTH_HEADING } from './support';

test.describe('US7: sign in (feature 003)', () => {
  test('signed out, / shows the signed-out screen with Sign in', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page).toHaveTitle('HL-Budget');
    await expect(
      page.getByRole('heading', { level: 1, name: "You're signed out" }),
    ).toBeVisible();
    await expect(
      page.getByText('Sign in to see and record your spendings.'),
    ).toBeVisible();
    await expect(
      page.getByRole('main').getByRole('link', { name: 'Sign in' }),
    ).toHaveAttribute('href', '/auth/login?returnTo=/spendings');
    await expect(page.getByRole('table')).toHaveCount(0);
  });

  test('Sign in → Universal Login → the Spendings screen for the current month', async ({
    page,
  }) => {
    credentials();
    await page.goto('/');
    await page.getByRole('main').getByRole('link', { name: 'Sign in' }).click();
    await completeUniversalLogin(page);

    await page.waitForURL('**/spendings**');
    await expect(
      page.getByRole('heading', { level: 1, name: MONTH_HEADING }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Sign out' })).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'User settings' }),
    ).toBeVisible();
  });

  test('two browsers signing in at once both reach /spendings (001 SC-002)', async ({
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
        await page.waitForURL('**/spendings**');
      }),
    );
    await Promise.all(contexts.map((context) => context.close()));
  });
});
