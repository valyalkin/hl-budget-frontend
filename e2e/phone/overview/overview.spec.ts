import { expect, test, type Page } from '@playwright/test';
import {
  assertNoSideScroll,
  assertTouchTargets,
  expectAccessible,
  openFromMenu,
  phoneRoot,
  signInPhone,
} from '../support';

/** From the phone Spendings screen, switch to Overview with the header switch. */
async function toOverview(page: Page) {
  await page
    .getByRole('navigation', { name: 'Main' })
    .getByRole('link', { name: 'Overview' })
    .click();
  await page.waitForURL('**/overview**');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Overview' }),
  ).toBeVisible();
  await expect(phoneRoot(page)).toBeVisible();
}

async function showAs(page: Page, cardName: string, view: 'Chart' | 'Table') {
  const card = page.getByRole('region', { name: cardName });
  await card.getByRole('button', { name: view }).click();
  await expect(card.getByRole('button', { name: view })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  return card;
}

/** specs/011 US5: the Overview on a phone. */
test.describe('Overview on a phone (specs/011 US5)', () => {
  test('fits the screen, stacks, answers taps and has a menu without import', async ({
    page,
  }) => {
    await signInPhone(page);
    const nav = page.getByRole('navigation', { name: 'Main' });
    await expect(nav.getByRole('link')).toHaveText([
      'Spendings',
      'Income',
      'Overview',
    ]);
    await toOverview(page);

    for (const width of [390, 360]) {
      await page.setViewportSize({ width, height: 800 });
      await assertNoSideScroll(page);
      await assertTouchTargets(page);
      // The tiles are stacked: one column, so every tile starts at the same x.
      const lefts = await page
        .locator('[data-testid^="tile-"]')
        .evaluateAll((tiles) =>
          tiles.map((tile) => Math.round(tile.getBoundingClientRect().left)),
        );
      expect(new Set(lefts).size).toBe(1);
    }

    // Single-letter months fit the width; a tap shows a month's tooltip, a tap elsewhere hides it.
    const months = await showAs(page, 'Earned vs spent', 'Chart');
    const chart = months.getByRole('img');
    await expect(chart.locator('svg')).toBeVisible();
    await expect(
      chart.locator('svg text', { hasText: /^J$/ }).first(),
    ).toBeVisible();
    await chart.scrollIntoViewIfNeeded();
    const box = await chart.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      await page.touchscreen.tap(
        box.x + box.width * 0.15,
        box.y + box.height * 0.5,
      );
    }
    const tip = page.getByText(/Earned\s+\$[\d,]+\.\d{2}/).first();
    await expect(tip).toBeVisible();
    await page.getByRole('heading', { level: 1, name: 'Overview' }).tap();
    await expect(tip).toBeHidden();

    // Tables scroll inside their card; the page never does.
    await showAs(page, 'Earned vs spent', 'Table');
    await showAs(page, 'Spent by category', 'Table');
    await assertNoSideScroll(page);
    await expectAccessible(page, 'phone overview, tables');
    await showAs(page, 'Earned vs spent', 'Chart');
    await showAs(page, 'Spent by category', 'Chart');
    await expectAccessible(page, 'phone overview, charts');

    // The account menu: Settings and Sign out, no Import CSV.
    await page.getByRole('button', { name: 'Account menu' }).click();
    const menu = page.getByRole('dialog', { name: 'Account menu' });
    await expect(menu.getByRole('button', { name: 'Settings' })).toBeVisible();
    await expect(menu.getByRole('link', { name: 'Sign out' })).toBeVisible();
    await expect(menu.getByRole('button', { name: 'Import CSV' })).toHaveCount(
      0,
    );
    await page.goBack();
    await expect(menu).toBeHidden();
    await openFromMenu(page, 'Settings');
    const settings = page.getByRole('dialog', { name: 'Settings' });
    await settings.getByRole('button', { name: 'Close settings' }).click();
    await expect(settings).toBeHidden();

    // The year arrows work on the phone too.
    const previous = page
      .getByRole('group', { name: 'Choose year' })
      .getByRole('link', { name: 'Previous year' });
    if ((await previous.getAttribute('aria-disabled')) !== 'true') {
      await previous.tap();
      await page.waitForURL(/year=\d{4}/);
      await expect(page.getByText(/^January to December \d{4}$/)).toBeVisible();
      await assertNoSideScroll(page);
    }
  });
});
