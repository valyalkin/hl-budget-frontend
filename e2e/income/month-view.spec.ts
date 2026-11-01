import { expect, test } from '@playwright/test';
import {
  addIncomeViaUi,
  marker,
  openIncomeTab,
  removeIncomeCreatedBy,
  signIn,
} from './support';

test.describe('specs/009 US1: see my income for a month', () => {
  test('the Income tab keeps the month, shows income only, and switches back without a reload', async ({
    page,
  }) => {
    const mark = marker('inc-view');
    await signIn(page);
    const heading = page.getByRole('heading', { level: 1 });
    const nav = page.getByRole('navigation', { name: 'Main' });
    await expect(nav.getByRole('link', { name: 'Spendings' })).toHaveAttribute(
      'aria-current',
      'page',
    );

    // Go to last month on Spendings, then switch tabs: the month stays.
    await page.getByRole('link', { name: 'Previous year' }).click();
    await page.waitForURL(/month=\d{4}-12/);
    const shown = await heading.textContent();
    await page.evaluate(() => {
      (window as unknown as { __noReload: boolean }).__noReload = true;
    });
    await openIncomeTab(page);
    expect(page.url()).toMatch(/\/income\?month=\d{4}-12$/);
    await expect(heading).toHaveText(shown ?? '');
    await expect(nav.getByRole('link', { name: 'Income' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(
      await page.evaluate(
        () => (window as unknown as { __noReload?: boolean }).__noReload,
      ),
    ).toBe(true);

    await nav.getByRole('link', { name: 'Spendings' }).click();
    await page.waitForURL(/\/spendings\?month=\d{4}-12$/);
    await expect(heading).toHaveText(shown ?? '');

    // Back on today's month: record an income and see it only on the Income tab.
    await page.goto('/income');
    await expect(
      page.getByRole('columnheader', { name: 'Source' }),
    ).toBeVisible();
    await addIncomeViaUi(page, {
      source: `${mark} Employer`,
      amount: '1000.00',
    });
    await expect(
      page
        .getByRole('region', { name: 'Income list' })
        .getByText(/^\d+ (entry|entries)$/),
    ).toBeVisible();
    await expect(
      page
        .getByRole('region', { name: 'Month total' })
        .getByText(/^Received in /),
    ).toBeVisible();

    await nav.getByRole('link', { name: 'Spendings' }).click();
    await page.waitForURL('**/spendings**');
    // Next keeps the Income page hidden in the DOM; only the visible Spending list counts.
    await expect(
      page
        .getByRole('region', { name: 'Spending list' })
        .getByText(`${mark} Employer`),
    ).toHaveCount(0);

    await page.goto('/income');
    await removeIncomeCreatedBy(page, mark);
  });

  test('an empty month says so, and / opens Spendings', async ({ page }) => {
    await signIn(page);
    await page.goto('/income?month=2001-01');
    await expect(
      page.getByText('No income recorded in January 2001.'),
    ).toBeVisible();
    await page.goto('/');
    await page.waitForURL('**/spendings**');
  });
});
