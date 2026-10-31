import AxeBuilder from '@axe-core/playwright';
import { expect, type Locator, type Page } from '@playwright/test';
import { completeUniversalLogin } from '../support';

export {
  csvFile,
  dayFirst,
  E2E_ACCOUNT,
  marker,
  monthOfDaysAgo,
} from '../support';

/** The phone layout's root; the desktop tree is not rendered below 640px. */
export function phoneRoot(page: Page): Locator {
  return page.locator('[data-layout="phone"]');
}

export async function expectPhoneLayout(page: Page) {
  await expect(phoneRoot(page)).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Month' })).toBeVisible();
}

/** Signs in and lands on the phone Spendings screen. */
export async function signInPhone(page: Page) {
  await page.goto('/auth/login');
  await completeUniversalLogin(page);
  await page.waitForURL('**/spendings**');
  await expectPhoneLayout(page);
}

/** The open phone screen or sheet on top, or the phone root when none is open. */
async function activeArea(page: Page): Promise<Locator> {
  const open = page.locator('dialog[data-phone][open]');
  return (await open.count()) > 0 ? open.last() : phoneRoot(page);
}

/** FR-004 / SC-003: every visible control is at least 44×44 CSS px. */
export async function assertTouchTargets(page: Page) {
  const small = await (
    await activeArea(page)
  )
    .locator(
      'button, a[href], input:not([type="file"]), select, [role="option"]',
    )
    .evaluateAll((elements) =>
      elements
        .filter((el) => {
          const box = el.getBoundingClientRect();
          const style = getComputedStyle(el);
          const visible =
            box.width > 0 &&
            box.height > 0 &&
            style.visibility !== 'hidden' &&
            style.opacity !== '0';
          return visible && (box.width < 44 || box.height < 44);
        })
        .map((el) => {
          const box = el.getBoundingClientRect();
          const name =
            el.getAttribute('aria-label') ??
            el.textContent?.trim() ??
            el.tagName;
          return `${name} (${Math.round(box.width)}×${Math.round(box.height)})`;
        }),
    );
  expect(small, 'controls smaller than 44×44').toEqual([]);
}

/** FR-005 / SC-003: inputs and dropdowns use at least 16px text, so iOS doesn't zoom. */
export async function assertNoZoomInputs(page: Page) {
  const tiny = await (
    await activeArea(page)
  )
    .locator('input:not([type="file"]), select, textarea')
    .evaluateAll((elements) =>
      elements
        .filter((el) => el.getBoundingClientRect().width > 0)
        .filter((el) => Number.parseFloat(getComputedStyle(el).fontSize) < 16)
        .map((el) => el.getAttribute('aria-label') ?? el.id),
    );
  expect(tiny, 'inputs under 16px').toEqual([]);
}

/** FR-007 / SC-002: nothing scrolls sideways. */
export async function assertNoSideScroll(page: Page) {
  const overflow = await page.evaluate(() => {
    const root = document.documentElement;
    return root.scrollWidth - root.clientWidth;
  });
  expect(overflow, 'sideways overflow in px').toBeLessThanOrEqual(0);
}

/** The touch, text-size and overflow checks, on whatever is on screen now. */
export async function checkScreen(page: Page) {
  await assertTouchTargets(page);
  await assertNoZoomInputs(page);
  await assertNoSideScroll(page);
}

/** SC-006: no serious or critical accessibility issues. */
export async function expectAccessible(page: Page, state: string) {
  const results = await new AxeBuilder({ page }).analyze();
  const blocking = results.violations.filter(
    (violation) =>
      violation.impact === 'serious' || violation.impact === 'critical',
  );
  expect(
    blocking.map(
      (v) =>
        `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(' ')).join(', ')})`,
    ),
    state,
  ).toEqual([]);
}

export type PhoneSpending = {
  merchant: string;
  category?: string;
  account?: string;
  amount: string;
  /** Pick the 1st of the previous month instead of the default date. */
  previousMonth?: boolean;
};

/** Adds a spending through the phone's New spending screen and waits for the list. */
export async function addSpendingPhone(page: Page, spending: PhoneSpending) {
  await page.getByRole('button', { name: 'Add spending' }).click();
  const form = page.getByRole('dialog', { name: 'New spending' });
  await expect(form).toBeVisible();
  await form
    .getByRole('textbox', { name: 'Amount (CAD)' })
    .fill(spending.amount);
  if (spending.previousMonth) {
    await form.getByRole('button', { name: /^Date/ }).click();
    await form.getByRole('button', { name: 'Previous month' }).click();
    await form.getByRole('button', { name: /, [A-Z][a-z]+ 1, \d{4}$/ }).click();
  }
  await form
    .getByRole('combobox', { name: 'Merchant' })
    .fill(spending.merchant);
  await form
    .getByRole('combobox', { name: 'Category' })
    .fill(spending.category ?? 'Groceries');
  await form
    .getByRole('combobox', { name: 'Account' })
    .fill(spending.account ?? 'E2E card');
  await form.getByRole('button', { name: 'Add spending' }).click();
  await expect(form).toHaveCount(0);
  await expect(spendingRow(page, spending.merchant).first()).toBeVisible();
}

/** A list row; rows name their merchant for screen readers. */
export function spendingRow(page: Page, merchant: string): Locator {
  return phoneRoot(page).getByRole('button', {
    name: new RegExp(`, ${escape(merchant)}, `),
  });
}

function escape(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Deletes every spending in the shown month whose merchant contains `mark`, through the sheet. */
export async function deletePhoneSpendings(page: Page, mark: string) {
  const rows = phoneRoot(page).getByRole('button', {
    name: new RegExp(escape(mark)),
  });
  while ((await rows.count()) > 0) {
    const before = await rows.count();
    await rows.first().click();
    await page
      .getByRole('dialog', { name: 'Edit spending' })
      .getByRole('button', { name: 'Delete spending' })
      .click();
    await page
      .getByRole('alertdialog', { name: 'Delete this spending?' })
      .getByRole('button', { name: 'Delete spending' })
      .click();
    await expect(rows).toHaveCount(before - 1);
  }
}

/** Opens a sheet item from the account menu. */
export async function openFromMenu(
  page: Page,
  item: 'Settings' | 'Import CSV',
) {
  await page.getByRole('button', { name: 'Account menu' }).click();
  await page
    .getByRole('dialog', { name: 'Account menu' })
    .getByRole('button', { name: item })
    .click();
  await expect(
    page.getByRole('dialog', {
      name: item === 'Settings' ? 'Settings' : 'Import CSV',
    }),
  ).toBeVisible();
}
