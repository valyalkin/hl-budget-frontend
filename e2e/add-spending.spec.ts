import { expect, test } from '@playwright/test';
import {
  addSpendingViaUi,
  E2E_ACCOUNT,
  marker,
  removeSpendingsCreatedBy,
  signIn,
  openEntryRow,
} from './support';

test.describe('US2: record a spending in the table', () => {
  test('a spending dated last month moves the view to last month', async ({
    page,
  }) => {
    const mark = marker('add');
    await signIn(page);
    const thisMonth = await page
      .getByRole('heading', { level: 1 })
      .textContent();

    await addSpendingViaUi(page, {
      merchant: `${mark} Shop`,
      category: 'Taxi',
      amount: '12.50',
      previousMonth: true,
    });

    await expect(page.getByRole('heading', { level: 1 })).not.toHaveText(
      thisMonth ?? '',
    );
    await expect(page.getByText(`${mark} Shop`)).toBeVisible();

    await removeSpendingsCreatedBy(page, mark);
  });

  test('a category or account that is not one of the user’s is refused, never created (specs/007)', async ({
    page,
  }) => {
    const mark = marker('unknown');
    const unknown = `Cat ${mark}`.slice(0, 50);
    await signIn(page);
    await openEntryRow(page);
    await page.getByRole('combobox', { name: 'Merchant' }).fill(`${mark} Shop`);
    await page.getByRole('combobox', { name: 'Category' }).fill(unknown);
    await expect(page.getByText(/^Create /)).toHaveCount(0);
    await page.getByRole('combobox', { name: 'Account' }).fill(E2E_ACCOUNT);
    await page.getByRole('textbox', { name: /^Amount in / }).fill('3.00');
    await page.getByRole('button', { name: 'Save spending' }).click();
    await expect(page.getByText('Not one of your categories')).toBeVisible();

    await page.getByRole('combobox', { name: 'Category' }).fill('Groceries');
    await page
      .getByRole('combobox', { name: 'Account' })
      .fill(`Card ${mark}`.slice(0, 50));
    await page.getByRole('button', { name: 'Save spending' }).click();
    await expect(page.getByText('Not one of your accounts')).toBeVisible();
    await page.getByRole('button', { name: 'Cancel new spending' }).click();

    await page.getByRole('button', { name: 'User settings' }).click();
    const dialog = page.getByRole('dialog', { name: 'Settings' });
    await expect(dialog.getByText(unknown)).toHaveCount(0);
    await dialog.getByRole('tab', { name: 'Accounts' }).click();
    await expect(dialog.getByText(`Card ${mark}`)).toHaveCount(0);
    await dialog.getByRole('button', { name: 'Close settings' }).click();
  });

  test('missing or invalid fields are refused with the spec’s wording', async ({
    page,
  }) => {
    await signIn(page);
    await openEntryRow(page);
    await page.getByRole('button', { name: 'Save spending' }).click();
    await expect(page.getByText('Add a merchant name.')).toBeVisible();

    await page.getByRole('combobox', { name: 'Merchant' }).fill('Bakery');
    await page.getByRole('combobox', { name: 'Category' }).fill('Groceries');
    await page.getByRole('combobox', { name: 'Account' }).fill(E2E_ACCOUNT);
    await page.getByRole('textbox', { name: /^Amount in / }).fill('0');
    await page.getByRole('button', { name: 'Save spending' }).click();
    await expect(
      page.getByText('Enter an amount greater than zero.'),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Cancel new spending' }).click();
  });
});
