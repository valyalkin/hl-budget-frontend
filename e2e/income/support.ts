import { expect, type Page } from '@playwright/test';
import { E2E_ACCOUNT, MONTH_HEADING } from '../support';

export * from '../support';

/** From the Spendings screen, switch to Income with the header tab and wait for the month. */
export async function openIncomeTab(page: Page) {
  await page
    .getByRole('navigation', { name: 'Main' })
    .getByRole('link', { name: 'Income' })
    .click();
  await page.waitForURL('**/income**');
  await expect(page.getByRole('region', { name: 'Income list' })).toBeVisible();
  await expect(
    page.getByRole('heading', { level: 1, name: MONTH_HEADING }),
  ).toBeVisible();
}

export type NewIncome = {
  source: string;
  category?: string;
  account?: string;
  amount: string;
  /** Pick the 1st of the previous month in the calendar instead of today. */
  previousMonth?: boolean;
};

/** Adds an income through the Income table's entry row and waits for it to be saved. */
export async function addIncomeViaUi(page: Page, income: NewIncome) {
  await page.getByRole('button', { name: 'Add an income row' }).click();
  const calendar = page.getByRole('dialog', { name: 'Choose date' });
  if (income.previousMonth) {
    await calendar.getByRole('button', { name: 'Previous month' }).click();
    await calendar
      .getByRole('button', { name: /^[A-Z][a-z]{2} 1, \d{4}$/ })
      .click();
  } else {
    await calendar.getByRole('button', { name: 'Today' }).click();
  }
  await expect(page.getByRole('combobox', { name: 'Source' })).toBeFocused();
  await page.getByRole('combobox', { name: 'Source' }).fill(income.source);
  await page
    .getByRole('combobox', { name: 'Category' })
    .fill(income.category ?? 'Salary');
  await page
    .getByRole('combobox', { name: 'Account' })
    .fill(income.account ?? E2E_ACCOUNT);
  await page.getByRole('textbox', { name: /^Amount in / }).fill(income.amount);
  await page.getByRole('button', { name: 'Save income' }).click();
  await expect(page.getByRole('button', { name: 'Save income' })).toHaveCount(
    0,
  );
  await expect(
    page.getByText(income.source, { exact: true }).first(),
  ).toBeVisible();
}

/** Removes every income entry in the shown month whose source contains `mark`. */
export async function removeIncomeCreatedBy(page: Page, mark: string) {
  const remove = page.getByRole('button', {
    name: new RegExp(`^Remove .*${mark}`),
  });
  while ((await remove.count()) > 0) {
    const before = await remove.count();
    await remove.first().click();
    await expect(remove).toHaveCount(before - 1);
  }
}

/** Opens Settings on Income categories. */
export async function openIncomeCategories(page: Page) {
  await page.getByRole('button', { name: 'User settings' }).click();
  const dialog = page.getByRole('dialog', { name: 'Settings' });
  await dialog.getByRole('tab', { name: 'Income categories' }).click();
  return dialog;
}

/** Leaves Settings on its first section and closes it. */
export async function closeSettingsDialog(page: Page) {
  const dialog = page.getByRole('dialog', { name: 'Settings' });
  await dialog.getByRole('tab', { name: 'Spending categories' }).click();
  await dialog.getByRole('button', { name: 'Close settings' }).click();
  await expect(dialog).toBeHidden();
}
