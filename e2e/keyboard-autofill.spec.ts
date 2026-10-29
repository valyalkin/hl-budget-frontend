import { expect, test } from '@playwright/test';
import {
  addSpendingViaUi,
  E2E_ACCOUNT,
  marker,
  removeSpendingsCreatedBy,
  signIn,
  openEntryRow,
} from './support';

test.describe('US3: fast keyboard entry with autofill', () => {
  test('a past merchant fills category and account; Tab, Tab, amount, Enter saves', async ({
    page,
  }) => {
    const mark = marker('kbd');
    const merchant = `${mark} Grocer`;
    await signIn(page);
    await addSpendingViaUi(page, {
      merchant,
      category: 'Groceries',
      amount: '5.00',
    });
    await addSpendingViaUi(page, {
      merchant,
      category: 'Groceries',
      amount: '6.00',
    });

    await openEntryRow(page);
    await page.getByRole('combobox', { name: 'Merchant' }).focus();
    await page.keyboard.type(mark.slice(0, 12));
    await page.keyboard.press('Tab');
    await expect(page.getByRole('combobox', { name: 'Merchant' })).toHaveValue(
      merchant,
    );
    await expect(page.getByRole('combobox', { name: 'Category' })).toHaveValue(
      'Groceries',
    );
    await expect(page.getByRole('combobox', { name: 'Account' })).toHaveValue(
      E2E_ACCOUNT,
    );

    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.type('9.99');
    await page.keyboard.press('Enter');
    await expect(
      page.getByRole('button', { name: 'Save spending' }),
    ).toHaveCount(0);
    await expect(page.getByText('$9.99')).toBeVisible();

    await removeSpendingsCreatedBy(page, mark);
  });

  test('typing in Category autofills the most used match with the rest selected', async ({
    page,
  }) => {
    await signIn(page);
    await openEntryRow(page);
    const category = page.getByRole('combobox', { name: 'Category' });
    await category.focus();
    await page.keyboard.type('g');
    const value = await category.inputValue();
    expect(value.toLowerCase().startsWith('g')).toBe(true);
    expect(value.length).toBeGreaterThan(1);
    const selection = await category.evaluate((input: HTMLInputElement) => [
      input.selectionStart,
      input.selectionEnd,
    ]);
    expect(selection).toEqual([1, value.length]);
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
  });
});
