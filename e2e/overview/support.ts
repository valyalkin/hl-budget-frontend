import { expect, type Locator, type Page } from '@playwright/test';

export * from '../income/support';

/** From Spendings or Income, switch to Overview with the header tab and wait for it. */
export async function openOverviewTab(page: Page) {
  await page
    .getByRole('navigation', { name: 'Main' })
    .getByRole('link', { name: 'Overview' })
    .click();
  await page.waitForURL('**/overview**');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Overview' }),
  ).toBeVisible();
}

/** Switch from Overview back to a ledger tab. */
export async function openTab(page: Page, name: 'Spendings' | 'Income') {
  await page
    .getByRole('navigation', { name: 'Main' })
    .getByRole('link', { name })
    .click();
  await page.waitForURL(
    name === 'Spendings' ? '**/spendings**' : '**/income**',
  );
}

/** `"$12,480"` or `"−$1,240"` → whole dollars as a number. */
export function dollars(text: string | null): number {
  const clean = (text ?? '').replace(/[^\d−-]/g, '');
  const negative = /^[−-]/.test(clean);
  const value = Number.parseInt(clean.replace(/[−-]/g, ''), 10) || 0;
  return negative ? -value : value;
}

/** A total tile's amount on the Overview: Earned, Spent or Saved. */
export function tileAmount(
  page: Page,
  label: 'Earned' | 'Spent' | 'Saved',
): Locator {
  return page
    .getByTestId(`tile-${label.toLowerCase()}`)
    .getByTestId('tile-amount');
}

export async function readTile(
  page: Page,
  label: 'Earned' | 'Spent' | 'Saved',
) {
  return dollars(await tileAmount(page, label).textContent());
}

/** A card on the Overview, by its heading. */
export function card(
  page: Page,
  name: 'Earned vs spent' | 'Spent by category' | 'Spent by account',
): Locator {
  return page.getByRole('region', { name });
}

/** Shows a card as a table (or chart) with its Show as switch. */
export async function showAs(card: Locator, view: 'Chart' | 'Table') {
  await card
    .getByRole('group', { name: 'Show as' })
    .getByRole('button', { name: view })
    .click();
  await expect(card.getByRole('button', { name: view })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
}

/** The amount in a breakdown table's row for `name`, in whole dollars (0 when absent). */
export async function breakdownAmount(card: Locator, name: string) {
  const row = card.getByRole('row').filter({
    has: card.page().getByRole('cell', { name, exact: true }),
  });
  if ((await row.count()) === 0) {
    return 0;
  }
  return dollars(await row.first().getByRole('cell').nth(1).textContent());
}
