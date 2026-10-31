import { expect, test } from '@playwright/test';
import { MONTH_HEADING } from '../support';
import { phoneRoot, signInPhone } from './support';

test.describe('Edge cases (phone): the width crosses 640px', () => {
  test('the layout switches and keeps the month', async ({ page }) => {
    await signInPhone(page);
    await page.goto('/spendings?month=2026-01');
    await page.setViewportSize({ width: 800, height: 900 });
    await expect(
      page.getByRole('heading', { level: 1, name: MONTH_HEADING }),
    ).toHaveText('January 2026');
    await expect(phoneRoot(page)).toHaveCount(0);
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(phoneRoot(page)).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Month' })).toHaveValue(
      '1',
    );
  });

  test('an open phone screen closes without saving when the desktop layout takes over', async ({
    page,
  }) => {
    await signInPhone(page);
    await page.getByRole('button', { name: 'Add spending' }).click();
    await page.getByRole('textbox', { name: 'Amount (CAD)' }).fill('5.00');
    await page.setViewportSize({ width: 800, height: 900 });
    await expect(
      page.getByRole('dialog', { name: 'New spending' }),
    ).toHaveCount(0);
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(phoneRoot(page)).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });
});
