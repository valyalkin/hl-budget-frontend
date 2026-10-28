import { expect, test, type Page } from '@playwright/test';

/**
 * The dev/test tenant's seeded user. Credentials come from the environment (local .env or CI
 * secrets) and are never committed. Without them the journey specs skip.
 */
export function credentials() {
  const username = process.env.E2E_USERNAME;
  const password = process.env.E2E_PASSWORD;
  test.skip(
    !username || !password,
    'E2E_USERNAME / E2E_PASSWORD are not set (Auth0 test tenant user)',
  );
  return { username: username ?? '', password: password ?? '' };
}

/**
 * Auth0 labels the field "Password *" (required marker), so match the start only. Not
 * /password/i: that would also match the "Show password" switch.
 */
export const PASSWORD_LABEL = /^password\b/i;

/** Completes Auth0 Universal Login (identifier + password) on the current page. */
export async function completeUniversalLogin(page: Page) {
  const { username, password } = credentials();
  await page.waitForURL(/\/u\/login|\/authorize/);
  await page.getByLabel(/email address|username/i).fill(username);
  await page.getByLabel(PASSWORD_LABEL).fill(password);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
}

/** The Spendings screen's month heading, e.g. "October 2026". */
export const MONTH_HEADING =
  /^(January|February|March|April|May|June|July|August|September|October|November|December) \d{4}$/;

/** From anywhere: start sign-in and land on the Spendings screen signed in. */
export async function signIn(page: Page) {
  await page.goto('/auth/login');
  await completeUniversalLogin(page);
  await page.waitForURL('**/spendings**');
  await expect(
    page.getByRole('heading', { level: 1, name: MONTH_HEADING }),
  ).toBeVisible();
}

/** A per-run marker for merchant names, so each spec finds and removes only its own data. */
export function marker(spec: string): string {
  return `e2e-${spec}-${Date.now().toString(36)}`;
}

/** The account the specs record on; typing it creates it the first time (FR-035). */
export const E2E_ACCOUNT = 'E2E card';

export type NewSpending = {
  merchant: string;
  category?: string;
  account?: string;
  amount: string;
  /** Pick the 1st of the previous month in the calendar instead of today. */
  previousMonth?: boolean;
};

/** Adds a spending through the table's entry row and waits for it to be saved. */
export async function addSpendingViaUi(page: Page, spending: NewSpending) {
  await page.getByRole('button', { name: 'Add a spending row' }).click();
  if (spending.previousMonth) {
    await page.getByRole('button', { name: /^Date .* Open calendar$/ }).click();
    const calendar = page.getByRole('dialog', { name: 'Choose date' });
    await calendar.getByRole('button', { name: 'Previous month' }).click();
    await calendar
      .getByRole('button', { name: /^[A-Z][a-z]{2} 1, \d{4}$/ })
      .click();
  }
  await page
    .getByRole('combobox', { name: 'Merchant' })
    .fill(spending.merchant);
  await page
    .getByRole('combobox', { name: 'Category' })
    .fill(spending.category ?? 'Groceries');
  await page
    .getByRole('combobox', { name: 'Account' })
    .fill(spending.account ?? E2E_ACCOUNT);
  await page
    .getByRole('textbox', { name: /^Amount in / })
    .fill(spending.amount);
  await page.getByRole('button', { name: 'Save spending' }).click();
  await expect(page.getByRole('button', { name: 'Save spending' })).toHaveCount(
    0,
  );
  await expect(
    page.getByText(spending.merchant, { exact: true }),
  ).toBeVisible();
}

/** Removes every spending in the shown month whose merchant contains `mark`. */
export async function removeSpendingsCreatedBy(page: Page, mark: string) {
  const remove = page.getByRole('button', {
    name: new RegExp(`^Remove .*${mark}`),
  });
  while ((await remove.count()) > 0) {
    const before = await remove.count();
    await remove.first().click();
    await expect(remove).toHaveCount(before - 1);
  }
}
