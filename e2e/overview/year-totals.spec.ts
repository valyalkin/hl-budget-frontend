import { expect, test } from '@playwright/test';
import {
  addIncomeViaUi,
  addSpendingViaUi,
  marker,
  MONTH_HEADING,
  openIncomeTab,
  openOverviewTab,
  openTab,
  readTile,
  removeIncomeCreatedBy,
  removeSpendingsCreatedBy,
  signIn,
} from './support';

/**
 * specs/011 US1: the year's Earned, Spent and Saved. The test user's data is shared with other
 * specs, so this checks how the tiles change, never their absolute values. Whole-dollar amounts
 * keep the whole-dollar tiles exact.
 */
test.describe('Overview year totals (specs/011 US1)', () => {
  test('opens on the selected year and moves with new spendings and income', async ({
    page,
  }) => {
    const mark = marker('ov-totals');
    await signIn(page);
    const heading = page.getByRole('heading', {
      level: 1,
      name: MONTH_HEADING,
    });
    const shown = await heading.textContent();

    await openOverviewTab(page);
    expect(page.url()).toMatch(/\/overview(\?month=\d{4}-\d{2})?$/);
    await expect(
      page.getByText(/^January to .* \(year to date\)$/),
    ).toBeVisible();
    await expect(
      page
        .getByRole('navigation', { name: 'Main' })
        .getByRole('link', { name: 'Overview' }),
    ).toHaveAttribute('aria-current', 'page');
    const spent = await readTile(page, 'Spent');
    const earned = await readTile(page, 'Earned');
    const saved = await readTile(page, 'Saved');

    // FR-002: back on Spendings, the same month is shown.
    await openTab(page, 'Spendings');
    await expect(heading).toHaveText(shown ?? '');
    await addSpendingViaUi(page, { merchant: `${mark} shop`, amount: '7.00' });

    await openOverviewTab(page);
    await expect.poll(() => readTile(page, 'Spent')).toBe(spent + 7);
    expect(await readTile(page, 'Saved')).toBe(saved - 7);

    await openTab(page, 'Spendings');
    await openIncomeTab(page);
    await addIncomeViaUi(page, { source: `${mark} pay`, amount: '13.00' });

    // FR-027: the Overview includes it without a manual reload.
    await openOverviewTab(page);
    await expect.poll(() => readTile(page, 'Earned')).toBe(earned + 13);
    expect(await readTile(page, 'Saved')).toBe(saved + 6);

    // Clean up.
    await openTab(page, 'Income');
    await removeIncomeCreatedBy(page, mark);
    await openTab(page, 'Spendings');
    await removeSpendingsCreatedBy(page, mark);

    // FR-003: the app still opens on Spendings.
    await page.goto('/');
    await page.waitForURL('**/spendings**');
  });
});
