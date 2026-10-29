import { expect, test } from '@playwright/test';
import {
  addSpendingViaUi,
  marker,
  MONTH_HEADING,
  removeSpendingsCreatedBy,
  signIn,
} from './support';

test.describe('US1: see my spendings for a month', () => {
  test('today’s month is selected, future months are disabled, the month survives reload', async ({
    page,
  }) => {
    await signIn(page);
    const months = page.getByRole('region', { name: 'Choose month' });
    await expect(months.locator('[aria-current="date"]')).toHaveCount(1);
    await expect(
      months.getByRole('button', { name: 'Next year' }),
    ).toBeDisabled();

    await months.getByRole('link', { name: 'Previous year' }).click();
    await page.waitForURL(/month=\d{4}-12/);
    await expect(
      page.getByRole('heading', { level: 1, name: /^December \d{4}$/ }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole('heading', { level: 1, name: /^December \d{4}$/ }),
    ).toBeVisible();
  });

  test('a recorded spending shows in the table, the footer and the month total', async ({
    page,
  }) => {
    const mark = marker('month');
    await signIn(page);
    await addSpendingViaUi(page, {
      merchant: `${mark} Market`,
      amount: '12.34',
    });

    const table = page.getByRole('table', { name: /Spendings in/ });
    await expect(table.getByText(`${mark} Market`)).toBeVisible();
    await expect(
      page.getByRole('region', { name: 'Month total' }),
    ).toContainText('Spent in');
    await expect(page.getByText(/^\d+ spendings?$/).first()).toBeVisible();

    await removeSpendingsCreatedBy(page, mark);
  });

  test('a month with nothing in it says so', async ({ page }) => {
    await signIn(page);
    await page.goto('/spendings?month=2001-01');
    await expect(
      page.getByRole('heading', { level: 1, name: MONTH_HEADING }),
    ).toBeVisible();
    await expect(
      page.getByText('No spendings recorded in January 2001.'),
    ).toBeVisible();
  });
});
