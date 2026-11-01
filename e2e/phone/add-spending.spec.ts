import { expect, test } from '@playwright/test';
import {
  addSpendingPhone,
  checkScreen,
  deletePhoneSpendings,
  E2E_ACCOUNT,
  marker,
  phoneRoot,
  signInPhone,
  spendingRow,
} from './support';

test.describe('US2 (phone): add a spending', () => {
  test('the form: field order, decimal keypad, inline calendar, validation in phone order', async ({
    page,
  }) => {
    await signInPhone(page);
    await page.getByRole('button', { name: 'Add spending' }).click();
    const form = page.getByRole('dialog', { name: 'New spending' });
    await expect(form).toBeVisible();
    const amount = form.getByRole('textbox', { name: 'Amount (CAD)' });
    await expect(amount).toHaveAttribute('inputmode', 'decimal');
    await checkScreen(page);

    await form.getByRole('button', { name: 'Add spending' }).click();
    await expect(form.getByRole('alert')).toHaveText(
      'Enter an amount greater than zero.',
    );
    await expect(amount).toBeFocused();

    await amount.fill('9.99');
    await form.getByRole('button', { name: 'Add spending' }).click();
    await expect(form.getByRole('alert')).toHaveText('Add a merchant name.');

    await form.getByRole('button', { name: /^Date/ }).click();
    const calendar = form.getByRole('group', { name: 'Choose date' });
    await expect(calendar).toBeVisible();
    await expect(
      calendar.getByRole('button', { name: 'Next month' }),
    ).toBeDisabled();
    await checkScreen(page);
    await calendar.getByRole('button', { name: 'Today' }).click();
    await expect(calendar).toHaveCount(0);

    await form.getByRole('button', { name: 'Close without saving' }).click();
    await expect(form).toHaveCount(0);
  });

  test('an unknown category is refused; a past merchant fills category and account', async ({
    page,
  }) => {
    const mark = marker('phone-add');
    await signInPhone(page);

    // specs/007: only Settings creates categories.
    await page.getByRole('button', { name: 'Add spending' }).click();
    const fresh = page.getByRole('dialog', { name: 'New spending' });
    await fresh.getByRole('textbox', { name: 'Amount (CAD)' }).fill('1.00');
    await fresh.getByRole('combobox', { name: 'Merchant' }).fill(`${mark} X`);
    await fresh
      .getByRole('combobox', { name: 'Category' })
      .fill(`${mark} Treats`);
    await fresh.getByRole('combobox', { name: 'Account' }).fill(E2E_ACCOUNT);
    await fresh.getByRole('button', { name: 'Add spending' }).click();
    await expect(fresh.getByRole('alert')).toHaveText(
      'Not one of your categories',
    );
    await fresh.getByRole('button', { name: 'Close without saving' }).click();
    await expect(fresh).toHaveCount(0);

    await addSpendingPhone(page, {
      merchant: `${mark} Bakery`,
      category: 'Taxi',
      account: E2E_ACCOUNT,
      amount: '12.40',
    });
    await expect(spendingRow(page, `${mark} Bakery`)).toContainText('Taxi');

    await page.getByRole('button', { name: 'Add spending' }).click();
    const form = page.getByRole('dialog', { name: 'New spending' });
    await form.getByRole('textbox', { name: 'Amount (CAD)' }).fill('3.10');
    await form.getByRole('combobox', { name: 'Merchant' }).fill(`${mark} Bak`);
    await form
      .getByRole('option', { name: new RegExp(`${mark} Bakery`) })
      .click();
    await expect(form.getByRole('combobox', { name: 'Category' })).toHaveValue(
      'Taxi',
    );
    await expect(form.getByRole('combobox', { name: 'Account' })).toHaveValue(
      E2E_ACCOUNT,
    );
    // A double tap saves once.
    await form.getByRole('button', { name: 'Add spending' }).dblclick();
    await expect(form).toHaveCount(0);
    await expect(spendingRow(page, `${mark} Bakery`)).toHaveCount(2);

    await deletePhoneSpendings(page, mark);
  });

  test('a spending dated in the previous month lands on that month', async ({
    page,
  }) => {
    const mark = marker('phone-prev');
    await signInPhone(page);
    await page.getByRole('button', { name: 'Add spending' }).click();
    const form = page.getByRole('dialog', { name: 'New spending' });
    await form.getByRole('textbox', { name: 'Amount (CAD)' }).fill('4.00');
    await form.getByRole('button', { name: /^Date/ }).click();
    await form.getByRole('button', { name: 'Previous month' }).click();
    await form.getByRole('button', { name: /, [A-Z][a-z]+ 1, \d{4}$/ }).click();
    await form.getByRole('combobox', { name: 'Merchant' }).fill(`${mark} Shop`);
    await form.getByRole('combobox', { name: 'Category' }).fill('Groceries');
    await form.getByRole('combobox', { name: 'Account' }).fill(E2E_ACCOUNT);
    await form.getByRole('button', { name: 'Add spending' }).click();
    await expect(form).toHaveCount(0);
    const now = new Date();
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    await expect(page.getByRole('combobox', { name: 'Month' })).toHaveValue(
      String(prev.getMonth() + 1),
    );
    await expect(spendingRow(page, `${mark} Shop`)).toBeVisible();
    await deletePhoneSpendings(page, mark);
    await expect(phoneRoot(page)).toBeVisible();
  });
});
