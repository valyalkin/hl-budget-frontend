import { expect, test } from '@playwright/test';
import {
  addIncomeViaUi,
  addSpendingViaUi,
  breakdownAmount,
  card,
  dollars,
  E2E_ACCOUNT,
  marker,
  openIncomeTab,
  openOverviewTab,
  openTab,
  readTile,
  removeIncomeCreatedBy,
  removeSpendingsCreatedBy,
  showAs,
  signIn,
} from './support';

/**
 * specs/011 US3: Spent by category and Spent by account. Shared test data, so the spec checks how
 * the rows change; whole-dollar amounts keep the whole-dollar tables exact.
 */
test.describe('Overview breakdowns (specs/011 US3)', () => {
  test('rank the year’s spending, count spendings only, and keep their own views', async ({
    page,
  }) => {
    const mark = marker('ov-breakdown');
    await signIn(page);
    await openOverviewTab(page);
    const byCategory = card(page, 'Spent by category');
    const byAccount = card(page, 'Spent by account');
    await showAs(byCategory, 'Table');
    await showAs(byAccount, 'Table');
    const other = await breakdownAmount(byCategory, 'Other');
    const account = await breakdownAmount(byAccount, E2E_ACCOUNT);

    await openTab(page, 'Spendings');
    await addSpendingViaUi(page, {
      merchant: `${mark} misc`,
      category: 'Other',
      amount: '9.00',
    });
    await openOverviewTab(page);
    await expect
      .poll(() => breakdownAmount(byCategory, 'Other'))
      .toBe(other + 9);
    expect(await breakdownAmount(byAccount, E2E_ACCOUNT)).toBe(account + 9);

    // FR-019: the rows add up to the Spent tile, within a dollar of rounding per row.
    const amounts = await byCategory
      .getByRole('row')
      .locator('td:nth-child(2)')
      .allTextContents();
    const sum = amounts.reduce((total, text) => total + dollars(text), 0);
    expect(Math.abs(sum - (await readTile(page, 'Spent')))).toBeLessThanOrEqual(
      amounts.length,
    );

    // FR-021: income never counts here.
    const before = await byAccount.getByRole('table').textContent();
    await openTab(page, 'Spendings');
    await openIncomeTab(page);
    await addIncomeViaUi(page, { source: `${mark} pay`, amount: '500.00' });
    await openOverviewTab(page);
    await expect(byAccount.getByRole('table')).toHaveText(before ?? '');

    // FR-023: each card keeps its own choice across a reload.
    await showAs(byCategory, 'Chart');
    await page.reload();
    await expect(
      card(page, 'Spent by category').getByRole('button', { name: 'Chart' }),
    ).toHaveAttribute('aria-pressed', 'true');
    await expect(
      card(page, 'Spent by account').getByRole('button', { name: 'Table' }),
    ).toHaveAttribute('aria-pressed', 'true');

    // FR-018: hovering a bar names its share of the year's spending.
    const chart = card(page, 'Spent by category').getByRole('img');
    await expect(chart.locator('svg')).toBeVisible();
    await chart.scrollIntoViewIfNeeded();
    const box = await chart.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width * 0.5, box.y + 24);
    }
    await expect(
      page.getByText(/· \d+(\.\d)?% of spent/).first(),
    ).toBeVisible();
    await showAs(card(page, 'Spent by account'), 'Chart');

    // Clean up.
    await openTab(page, 'Income');
    await removeIncomeCreatedBy(page, mark);
    await openTab(page, 'Spendings');
    await removeSpendingsCreatedBy(page, mark);
  });
});
