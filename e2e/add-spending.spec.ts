import { expect, test } from '@playwright/test';
import {
  addSpendingViaUi,
  marker,
  removeSpendingsCreatedBy,
  signIn,
  openEntryRow,
} from './support';

test.describe('US2: record a spending in the table', () => {
  test('a spending dated last month, in a new category, moves the view to last month', async ({
    page,
  }) => {
    const mark = marker('add');
    await signIn(page);
    const thisMonth = await page
      .getByRole('heading', { level: 1 })
      .textContent();

    await addSpendingViaUi(page, {
      merchant: `${mark} Shop`,
      category: `Cat ${mark}`.slice(0, 50),
      amount: '12.50',
      previousMonth: true,
    });

    await expect(page.getByRole('heading', { level: 1 })).not.toHaveText(
      thisMonth ?? '',
    );
    await expect(page.getByText(`${mark} Shop`)).toBeVisible();

    // The new category is now offered in the entry row.
    await openEntryRow(page);
    await page.getByRole('combobox', { name: 'Category' }).click();
    await expect(
      page.getByRole('option', { name: new RegExp(`Cat ${mark}`) }),
    ).toBeVisible();
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');

    await removeSpendingsCreatedBy(page, mark);
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
    await page.getByRole('combobox', { name: 'Account' }).fill('Cash');
    await page.getByRole('textbox', { name: /^Amount in / }).fill('0');
    await page.getByRole('button', { name: 'Save spending' }).click();
    await expect(
      page.getByText('Enter an amount greater than zero.'),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Cancel new spending' }).click();
  });
});
