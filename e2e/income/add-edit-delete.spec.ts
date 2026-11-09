import { expect, test } from '@playwright/test';
import {
  addIncomeViaUi,
  E2E_ACCOUNT,
  marker,
  removeIncomeCreatedBy,
  signIn,
  UNDO_WAIT_MS,
} from './support';

test.describe('specs/009 US2: record, edit and delete income on the desktop', () => {
  test('the entry row asks for a Source and refuses a spending category or unknown account', async ({
    page,
  }) => {
    const mark = marker('inc-rules');
    await signIn(page);
    await page.goto('/income');
    await page.getByRole('button', { name: 'Add an income row' }).click();
    await expect(
      page.getByRole('dialog', { name: 'Choose date' }),
    ).toBeVisible();
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: 'Save income' }).click();
    await expect(page.getByText('Add a source.')).toBeVisible();

    await page.getByRole('combobox', { name: 'Source' }).fill(`${mark} Co`);
    await page.getByRole('combobox', { name: 'Category' }).fill('Groceries');
    await page.getByRole('combobox', { name: 'Account' }).fill(E2E_ACCOUNT);
    await page.getByRole('textbox', { name: /^Amount in / }).fill('10.00');
    await page.getByRole('button', { name: 'Save income' }).click();
    await expect(
      page.getByText('Not one of your income categories'),
    ).toBeVisible();

    await page.getByRole('combobox', { name: 'Category' }).fill('Salary');
    await page
      .getByRole('combobox', { name: 'Account' })
      .fill(`Card ${mark}`.slice(0, 50));
    await page.getByRole('button', { name: 'Save income' }).click();
    await expect(page.getByText('Not one of your accounts')).toBeVisible();

    await page.getByRole('combobox', { name: 'Account' }).fill(E2E_ACCOUNT);
    await page.getByRole('textbox', { name: /^Amount in / }).fill('0');
    await page.getByRole('button', { name: 'Save income' }).click();
    await expect(
      page.getByText('Enter an amount greater than zero.'),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Cancel new income' }).click();
    await expect(page.getByText(`${mark} Co`)).toHaveCount(0);
  });

  test('keyboard only: a past source fills category and account, Enter saves once', async ({
    page,
  }) => {
    const mark = marker('inc-kbd');
    const source = `${mark} Employer`;
    await signIn(page);
    await page.goto('/income');
    await removeIncomeCreatedBy(page, 'e2e-inc-kbd-');
    await addIncomeViaUi(page, {
      source,
      category: 'Investments',
      amount: '50.00',
    });

    await page.getByRole('button', { name: 'Add an income row' }).click();
    await page.keyboard.press('Escape');
    await page.getByRole('combobox', { name: 'Source' }).focus();
    await page.keyboard.type(mark);
    await page.keyboard.press('Tab');
    await expect(page.getByRole('combobox', { name: 'Source' })).toHaveValue(
      source,
    );
    await expect(page.getByRole('combobox', { name: 'Category' })).toHaveValue(
      'Investments',
    );
    await expect(page.getByRole('combobox', { name: 'Account' })).toHaveValue(
      E2E_ACCOUNT,
    );
    // Only income categories are offered.
    await page.getByRole('combobox', { name: 'Category' }).fill('');
    await page.keyboard.type('g');
    await expect(page.getByRole('option', { name: /Groceries/ })).toHaveCount(
      0,
    );
    await page.getByRole('combobox', { name: 'Category' }).fill('Investments');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.type('77.77');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: 'Save income' })).toHaveCount(
      0,
    );
    await expect(
      page.getByRole('row').filter({ hasText: '$77.77' }),
    ).toHaveCount(1);

    await removeIncomeCreatedBy(page, mark);
  });

  test('edit an income’s amount, then remove it at once; totals follow', async ({
    page,
  }) => {
    const mark = marker('inc-edit');
    const source = `${mark} Client`;
    await signIn(page);
    await page.goto('/income');
    await addIncomeViaUi(page, { source, amount: '200.00' });

    const row = page.getByRole('row').filter({ hasText: source });
    await row.hover();
    await row.getByRole('button', { name: /^Edit / }).click();
    const amount = page.getByRole('textbox', { name: /^Amount in / });
    await amount.fill('250.50');
    await amount.press('Enter');
    await expect(
      page.getByRole('row').filter({ hasText: source }),
    ).toContainText('$250.50');

    await page
      .getByRole('row')
      .filter({ hasText: source })
      .getByRole('button', { name: /^Remove / })
      .click();
    await expect(page.getByText(source)).toHaveCount(0, {
      timeout: UNDO_WAIT_MS,
    });
  });

  test('switching to Spendings with a row open discards it', async ({
    page,
  }) => {
    await signIn(page);
    await page.goto('/income');
    await page.getByRole('button', { name: 'Add an income row' }).click();
    await page.keyboard.press('Escape');
    await page.getByRole('combobox', { name: 'Source' }).fill('Unsaved');
    await page
      .getByRole('navigation', { name: 'Main' })
      .getByRole('link', { name: 'Spendings' })
      .click();
    await page.waitForURL('**/spendings**');
    await page
      .getByRole('navigation', { name: 'Main' })
      .getByRole('link', { name: 'Income' })
      .click();
    await page.waitForURL('**/income**');
    await expect(page.getByRole('combobox', { name: 'Source' })).toHaveCount(0);
    await expect(page.getByText('Unsaved')).toHaveCount(0);
  });
});
