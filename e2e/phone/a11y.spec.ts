import { expect, test } from '@playwright/test';
import {
  csvFile,
  E2E_ACCOUNT,
  expectAccessible,
  openFromMenu,
  signInPhone,
} from './support';

test('SC-006: every phone screen and sheet', async ({ page }) => {
  await signInPhone(page);
  await expectAccessible(page, 'list');

  await page.getByRole('button', { name: 'By category' }).click();
  await expectAccessible(page, 'by category table');
  await page.getByRole('button', { name: 'Pie' }).click();
  await expectAccessible(page, 'by category pie');
  await page.getByRole('button', { name: 'Spendings' }).click();

  await page.getByRole('button', { name: 'Account menu' }).click();
  await expectAccessible(page, 'account menu');
  await page
    .getByRole('button', { name: 'Close menu' })
    .click({ position: { x: 10, y: 10 } });

  await page.getByRole('button', { name: 'Add spending' }).click();
  await expectAccessible(page, 'new spending');
  await page.getByRole('button', { name: /^Date/ }).click();
  await expectAccessible(page, 'calendar');
  await page.getByRole('combobox', { name: 'Category' }).click();
  await expectAccessible(page, 'category suggestions');
  await page.getByRole('button', { name: 'Close without saving' }).click();

  const firstRow = page.locator('[data-layout="phone"] main li button').first();
  if ((await firstRow.count()) > 0) {
    await firstRow.click();
    await page.getByRole('button', { name: 'Delete spending' }).click();
    await expectAccessible(page, 'delete sheet');
    await page.getByRole('button', { name: 'Cancel' }).click();
    await page.getByRole('button', { name: 'Close without saving' }).click();
  }

  await openFromMenu(page, 'Settings');
  await expectAccessible(page, 'settings categories');
  await page.getByRole('button', { name: 'Accounts' }).click();
  await expectAccessible(page, 'settings accounts');
  await page.getByRole('button', { name: 'Close settings' }).click();

  await openFromMenu(page, 'Import CSV');
  await expectAccessible(page, 'import');
  await page
    .getByLabel('Choose a CSV file')
    .setInputFiles(
      csvFile('a.csv', [
        'Date,Merchant,Category,Account,Amount',
        `,x,,${E2E_ACCOUNT},`,
      ]),
    );
  await expect(
    page.getByRole('dialog', { name: 'Review import' }),
  ).toBeVisible();
  await expectAccessible(page, 'review');
});
