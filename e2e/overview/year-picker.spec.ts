import { expect, test } from '@playwright/test';
import { openOverviewTab, signIn } from './support';

/** specs/011 US4: stepping between years, the limits, and the other tabs keeping their month. */
test.describe('Overview year picker (specs/011 US4)', () => {
  test('moves between years within the limits and never moves the other tabs', async ({
    page,
  }) => {
    await signIn(page);
    await openOverviewTab(page);
    const group = page.getByRole('group', { name: 'Choose year' });
    const previous = group.getByRole('link', { name: 'Previous year' });
    const next = group.getByRole('link', { name: 'Next year' });
    const thisYear = new Date().getFullYear();

    // FR-006: no future years.
    await expect(group.getByText(String(thisYear))).toBeVisible();
    await expect(next).toHaveAttribute('aria-disabled', 'true');

    // Out-of-range years are clamped.
    await page.goto('/overview?year=2999');
    await expect(
      page.getByRole('group', { name: 'Choose year' }),
    ).toContainText(String(thisYear));
    await page.goto('/overview?year=1999');
    await expect(previous).toHaveAttribute('aria-disabled', 'true');
    const earliest = Number(
      (await group.locator('[aria-live]').textContent())?.trim(),
    );
    expect(earliest).toBeLessThanOrEqual(thisYear);

    // Step back from this year when there is an earlier one.
    await page.goto('/overview');
    if (earliest < thisYear) {
      await previous.click();
      await page.waitForURL(new RegExp(`year=${thisYear - 1}`));
      await expect(
        page.getByText(`January to December ${thisYear - 1}`),
      ).toBeVisible();
      await expect(
        page.getByRole('heading', { level: 1, name: 'Overview' }),
      ).toBeVisible();
      await next.click();
      await page.waitForURL(new RegExp(`year=${thisYear}`));
      await expect(page.getByText(/\(year to date\)$/)).toBeVisible();
    }

    // FR-002: Overview's year never moves the month on Income.
    await page.goto(`/overview?month=${thisYear}-03&year=${earliest}`);
    await page
      .getByRole('navigation', { name: 'Main' })
      .getByRole('link', { name: 'Income' })
      .click();
    await page.waitForURL(`**/income?month=${thisYear}-03`);
    await expect(
      page.getByRole('heading', { level: 1, name: `March ${thisYear}` }),
    ).toBeVisible();
  });

  test('a year change replaces the history entry', async ({ page }) => {
    await signIn(page);
    await page.goto('/spendings');
    await page.goto('/overview?year=2999');
    const previous = page
      .getByRole('group', { name: 'Choose year' })
      .getByRole('link', { name: 'Previous year' });
    test.skip(
      (await previous.getAttribute('aria-disabled')) === 'true',
      'the test user has no earlier year',
    );
    await previous.click();
    await page.waitForURL(/year=\d{4}/);
    await page.goBack();
    await page.waitForURL('**/spendings**');
  });
});
