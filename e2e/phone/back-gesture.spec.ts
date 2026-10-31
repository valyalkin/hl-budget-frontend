import { expect, test } from '@playwright/test';
import {
  addSpendingPhone,
  csvFile,
  deletePhoneSpendings,
  E2E_ACCOUNT,
  marker,
  openFromMenu,
  signInPhone,
  spendingRow,
} from './support';

test.describe('FR-103 (phone): the back gesture closes only the top layer', () => {
  test('menu, Settings, New spending and the delete sheet', async ({
    page,
  }) => {
    const mark = marker('phone-back');
    await signInPhone(page);

    await page.getByRole('button', { name: 'Account menu' }).click();
    await page.goBack();
    await expect(
      page.getByRole('dialog', { name: 'Account menu' }),
    ).toHaveCount(0);
    await expect(page).toHaveURL(/\/spendings/);

    await openFromMenu(page, 'Settings');
    await page.goBack();
    await expect(page.getByRole('dialog', { name: 'Settings' })).toHaveCount(0);

    await page.getByRole('button', { name: 'Add spending' }).click();
    await page.goBack();
    await expect(
      page.getByRole('dialog', { name: 'New spending' }),
    ).toHaveCount(0);

    await addSpendingPhone(page, { merchant: `${mark} Deli`, amount: '7.00' });
    await spendingRow(page, `${mark} Deli`).click();
    await page.getByRole('button', { name: 'Delete spending' }).click();
    await page.goBack();
    await expect(page.getByRole('alertdialog')).toHaveCount(0);
    await expect(
      page.getByRole('dialog', { name: 'Edit spending' }),
    ).toBeVisible();
    await page.goBack();
    await expect(
      page.getByRole('dialog', { name: 'Edit spending' }),
    ).toHaveCount(0);
    await expect(page).toHaveURL(/\/spendings/);

    await deletePhoneSpendings(page, mark);
  });

  test('Review goes back to Import CSV, then to the list', async ({ page }) => {
    await signInPhone(page);
    await openFromMenu(page, 'Import CSV');
    await page
      .getByLabel('Choose a CSV file')
      .setInputFiles(
        csvFile('b.csv', [
          'Date,Merchant,Category,Account,Amount',
          `2026-01-02,x,Groceries,${E2E_ACCOUNT},1`,
        ]),
      );
    await expect(
      page.getByRole('dialog', { name: 'Review import' }),
    ).toBeVisible();
    await page.goBack();
    await expect(
      page.getByRole('dialog', { name: 'Review import' }),
    ).toHaveCount(0);
    await expect(
      page.getByRole('dialog', { name: 'Import CSV' }),
    ).toBeVisible();
    await page.goBack();
    await expect(page.getByRole('dialog', { name: 'Import CSV' })).toHaveCount(
      0,
    );
  });

  test('a reload on an open screen shows the list', async ({ page }) => {
    await signInPhone(page);
    await openFromMenu(page, 'Settings');
    await page.reload();
    await expect(page.getByRole('combobox', { name: 'Month' })).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('after saving a spending, one Back does not reopen the form', async ({
    page,
  }) => {
    const mark = marker('phone-back-save');
    await signInPhone(page);
    await addSpendingPhone(page, { merchant: `${mark} Shop`, amount: '2.00' });
    await page.goBack();
    await expect(
      page.getByRole('dialog', { name: 'New spending' }),
    ).toHaveCount(0);
    await page.goto('/spendings');
    await deletePhoneSpendings(page, mark);
  });
});
