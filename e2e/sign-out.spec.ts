import { expect, test } from '@playwright/test';
import { PASSWORD_LABEL, signIn } from './support';

test.describe('US7: sign out', () => {
  test('Sign out shows the signed-out screen, and Back reveals no spendings', async ({
    page,
  }) => {
    await signIn(page);
    const response = await page.reload();
    expect(response?.headers()['cache-control']).toContain('no-store');

    await page.getByRole('link', { name: 'Sign out' }).click();
    await page.waitForURL((url) => url.pathname === '/');
    await expect(
      page.getByRole('heading', { name: "You're signed out" }),
    ).toBeVisible();

    await page.goBack();
    await expect(page.getByRole('table', { name: /Spendings in/ })).toHaveCount(
      0,
    );

    await page.goto('/spendings');
    await page.waitForURL(/\/u\/login|\/authorize/);
    await expect(page.getByLabel(PASSWORD_LABEL)).toBeVisible();
  });
});
