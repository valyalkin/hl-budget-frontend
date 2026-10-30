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
  const identifier = page.getByLabel(/email address|username/i);
  const secret = page.getByLabel(PASSWORD_LABEL);
  // Auth0's page can still be settling when it first shows, and a fill can then land in the wrong
  // field. Fill both, check both, and retry until they hold.
  await expect(async () => {
    await identifier.fill(username);
    await secret.fill(password);
    await expect(identifier).toHaveValue(username, { timeout: 1_000 });
    await expect(secret).toHaveValue(password, { timeout: 1_000 });
  }).toPass({ timeout: 15_000 });
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
/** Opens a new entry row, whose calendar opens by itself, and closes the calendar. */
export async function openEntryRow(page: Page) {
  await page.getByRole('button', { name: 'Add a spending row' }).click();
  const calendar = page.getByRole('dialog', { name: 'Choose date' });
  await expect(calendar).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(calendar).toHaveCount(0);
}

export async function addSpendingViaUi(page: Page, spending: NewSpending) {
  await page.getByRole('button', { name: 'Add a spending row' }).click();
  // A new row opens its calendar by itself.
  const calendar = page.getByRole('dialog', { name: 'Choose date' });
  if (spending.previousMonth) {
    await calendar.getByRole('button', { name: 'Previous month' }).click();
    await calendar
      .getByRole('button', { name: /^[A-Z][a-z]{2} 1, \d{4}$/ })
      .click();
  } else {
    await calendar.getByRole('button', { name: 'Today' }).click();
  }
  await expect(page.getByRole('combobox', { name: 'Merchant' })).toBeFocused();
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
  // The same merchant may already be in the table (a spec can add it twice).
  await expect(
    page.getByText(spending.merchant, { exact: true }).first(),
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

/** A date `daysAgo` days before today, day first (`DD/MM/YYYY`), as bank exports write it. */
export function dayFirst(daysAgo: number): string {
  const day = new Date(Date.now() - daysAgo * 86_400_000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(day.getDate())}/${pad(day.getMonth() + 1)}/${day.getFullYear()}`;
}

/** `YYYY-MM` of the date `daysAgo` days before today. */
export function monthOfDaysAgo(daysAgo: number): string {
  const day = new Date(Date.now() - daysAgo * 86_400_000);
  return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}`;
}

/** A CSV file for Playwright's setInputFiles, built at run time so its dates never go stale. */
export function csvFile(name: string, lines: string[]) {
  return {
    name,
    mimeType: 'text/csv',
    buffer: Buffer.from(lines.join('\n') + '\n'),
  };
}

/** Opens the import window from the Spendings screen. */
export async function openImport(page: Page) {
  await page.getByRole('button', { name: 'Import CSV' }).click();
  await expect(page.getByRole('dialog', { name: 'Import CSV' })).toBeVisible();
}

/** Removes the marked spendings from each of the given months (`YYYY-MM`). */
export async function removeImported(
  page: Page,
  mark: string,
  months: string[],
) {
  for (const month of new Set(months)) {
    await page.goto(`/spendings?month=${month}`);
    await removeSpendingsCreatedBy(page, mark);
  }
}
