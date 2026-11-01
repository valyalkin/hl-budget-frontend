import { expect, test, type Locator, type Page } from '@playwright/test';
import {
  addAccountInSettings,
  addSpendingViaUi,
  marker,
  removeAccountInSettings,
  removeAccountsStartingWith,
  removeSpendingsCreatedBy,
  signIn,
} from './support';

/** The amount cell of an account's row in the By account table. */
function amountOf(card: Locator, account: string) {
  return card
    .getByRole('row')
    .filter({ hasText: account })
    .getByRole('cell')
    .nth(1);
}

/** The total row's amount in a breakdown card. */
async function totalOf(card: Locator) {
  return card
    .getByRole('row')
    .filter({
      has: card.page().getByRole('rowheader', { name: 'Total', exact: true }),
    })
    .getByRole('cell')
    .first()
    .innerText();
}

async function top(locator: Locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error('Not on screen');
  return box;
}

/** `YYYY-MM` of last month, in the browser's time zone like the calendar's "previous month". */
function previousMonth() {
  const day = new Date();
  day.setDate(1);
  day.setMonth(day.getMonth() - 1);
  return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}`;
}

async function cleanUp(page: Page, mark: string, accounts: string[]) {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/spendings');
  // The table streams in after the shell; wait for it before looking for rows.
  await expect(
    page.getByRole('button', { name: 'Add a spending row' }),
  ).toBeVisible();
  await removeSpendingsCreatedBy(page, mark);
  for (const name of accounts) await removeAccountInSettings(page, name);
}

test.describe('specs/008 US1 + US2: the month by account on the desktop', () => {
  test('table and pie show only accounts with spending; own view choice; updates on edit', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const mark = marker('acct');
    const first = `${mark} A`;
    const second = `${mark} B`;
    await signIn(page);
    // Leftovers of an earlier run that stopped before its clean-up.
    await removeSpendingsCreatedBy(page, 'e2e-acct-');
    await removeAccountsStartingWith(page, 'e2e-acct-');
    await addAccountInSettings(page, first);
    await addAccountInSettings(page, second);
    try {
      await addSpendingViaUi(page, {
        merchant: `${mark} 1`,
        account: first,
        amount: '30.00',
      });
      await addSpendingViaUi(page, {
        merchant: `${mark} 2`,
        account: second,
        amount: '12.50',
      });
      await addSpendingViaUi(page, {
        merchant: `${mark} 3`,
        account: first,
        amount: '10.00',
      });

      const summary = page.getByRole('complementary', {
        name: 'Month summary',
      });
      const card = summary.getByRole('region', { name: 'By account' });
      const categoryCard = summary.getByRole('region', { name: 'By category' });

      // Directly below By category, in the same column (FR-010).
      const below = await top(card);
      const above = await top(categoryCard);
      expect(below.y).toBeGreaterThan(above.y + above.height - 1);
      expect(Math.abs(below.x - above.x)).toBeLessThan(2);

      // Table: amounts per account, largest first, a total equal to the month's (FR-003, FR-007).
      await expect(
        card.getByRole('columnheader', { name: 'Account' }),
      ).toBeVisible();
      await expect(amountOf(card, first)).toHaveText('$40.00');
      await expect(amountOf(card, second)).toHaveText('$12.50');
      const names = await card.getByRole('row').allInnerTexts();
      expect(names.findIndex((r) => r.includes(first))).toBeLessThan(
        names.findIndex((r) => r.includes(second)),
      );
      expect(await totalOf(card)).toBe(await totalOf(categoryCard));

      // Pie: one slice per account in its colour, a legend, no "Everything else" (FR-004).
      await card.getByRole('button', { name: 'Pie' }).click();
      const chart = card.getByRole('group', { name: /^Spending by account/ });
      await expect(
        chart.getByRole('img', { name: new RegExp(`^${first}:`) }),
      ).toBeVisible();
      await expect(
        chart.getByRole('img', { name: new RegExp(`^${second}:`) }),
      ).toBeVisible();
      await expect(card.getByText('Everything else')).toHaveCount(0);
      await expect(card.getByRole('list', { name: 'Legend' })).toContainText(
        second,
      );

      // Each card keeps its own choice across a reload (FR-002).
      await expect(
        categoryCard.getByRole('button', { name: 'Table' }),
      ).toHaveAttribute('aria-pressed', 'true');
      await page.reload();
      await expect(
        page
          .getByRole('region', { name: 'By account' })
          .getByRole('button', { name: 'Pie' }),
      ).toHaveAttribute('aria-pressed', 'true');
      await expect(
        page
          .getByRole('region', { name: 'By category' })
          .getByRole('button', { name: 'Table' }),
      ).toHaveAttribute('aria-pressed', 'true');
      await page
        .getByRole('region', { name: 'By account' })
        .getByRole('button', { name: 'Table' })
        .click();

      // Moving a spending to another account moves its amount, without a reload (FR-008).
      const row = page.getByRole('row').filter({ hasText: `${mark} 2` });
      await row.hover();
      await row.getByRole('button', { name: /^Edit / }).click();
      const account = page.getByRole('combobox', { name: 'Account' });
      await account.fill(first);
      // Enter accepts the suggestion and moves on; Enter in the amount saves the row.
      await account.press('Enter');
      await page.getByRole('textbox', { name: /^Amount in / }).press('Enter');
      await expect(
        page.getByRole('button', { name: 'Save spending' }),
      ).toHaveCount(0);
      const updated = page.getByRole('region', { name: 'By account' });
      await expect(amountOf(updated, first)).toHaveText('$52.50');
      await expect(
        updated.getByRole('row').filter({ hasText: second }),
      ).toHaveCount(0);

      // On a narrower window the cards drop below the table; By account stays below By category.
      await page.setViewportSize({ width: 1000, height: 900 });
      const narrowBelow = await top(
        page.getByRole('region', { name: 'By account' }),
      );
      const narrowAbove = await top(
        page.getByRole('region', { name: 'By category' }),
      );
      expect(narrowBelow.y).toBeGreaterThan(
        narrowAbove.y + narrowAbove.height - 1,
      );
    } finally {
      await cleanUp(page, mark, [first, second]);
    }
  });

  test('each account has its own colour, the same every month, and a slice names its account', async ({
    page,
  }) => {
    test.setTimeout(180_000);
    const mark = marker('acct');
    const names = ['A', 'B', 'C', 'D'].map((letter) => `${mark} ${letter}`);
    await signIn(page);
    await removeSpendingsCreatedBy(page, 'e2e-acct-');
    await removeAccountsStartingWith(page, 'e2e-acct-');
    for (const name of names) await addAccountInSettings(page, name);

    /** Each of our accounts' table swatch colour in the shown month. */
    const swatches = async () => {
      const card = page.getByRole('region', { name: 'By account' });
      await card.getByRole('button', { name: 'Table' }).click();
      const colours: Record<string, string> = {};
      for (const name of names) {
        colours[name] = await card
          .getByRole('row')
          .filter({ hasText: name })
          .getByTestId('account-swatch')
          .evaluate((el) => getComputedStyle(el).backgroundColor);
      }
      return colours;
    };

    try {
      for (const [i, name] of names.entries()) {
        await addSpendingViaUi(page, {
          merchant: `${mark} now ${i}`,
          account: name,
          amount: `${40 - i * 5}.00`,
        });
        await addSpendingViaUi(page, {
          merchant: `${mark} before ${i}`,
          account: name,
          amount: `${10 + i}.00`,
          previousMonth: true,
        });
      }

      // Four accounts, four different visible colours (FR-020, FR-021, SC-004, SC-005).
      const now = await swatches();
      expect(new Set(Object.values(now)).size).toBe(4);
      for (const colour of Object.values(now)) {
        expect(colour).toMatch(/^rgb\(/);
        expect(colour).not.toBe('rgb(138, 144, 139)'); // the rolling-deploy grey
      }
      // None of the user's other accounts in this month shares them.
      const card = page.getByRole('region', { name: 'By account' });
      const allSwatches = await card
        .getByTestId('account-swatch')
        .evaluateAll((els) =>
          els.map((el) => getComputedStyle(el).backgroundColor),
        );
      for (const colour of Object.values(now)) {
        expect(allSwatches.filter((c) => c === colour)).toHaveLength(1);
      }

      // Slices and legend use the same colours as the table.
      await card.getByRole('button', { name: 'Pie' }).click();
      const chart = card.getByRole('group', { name: /^Spending by account/ });
      for (const name of names) {
        const slice = chart.getByRole('img', { name: new RegExp(`^${name}:`) });
        expect(await slice.evaluate((el) => getComputedStyle(el).fill)).toBe(
          now[name],
        );
        const legend = card
          .getByRole('list', { name: 'Legend' })
          .getByRole('listitem')
          .filter({ hasText: name })
          .getByTestId('account-legend-swatch');
        expect(
          await legend.evaluate((el) => getComputedStyle(el).backgroundColor),
        ).toBe(now[name]);
      }

      // Hovering names the slice at once and emphasises it; keyboard focus does the same (FR-030, FR-031).
      const centre = card.getByTestId('donut-centre');
      for (const name of names) {
        const slice = chart.getByRole('img', { name: new RegExp(`^${name}:`) });
        await slice.focus();
        await expect(centre).toContainText(name, { timeout: 500 });
      }
      const box = await chart.boundingBox();
      if (!box) throw new Error('The chart has no size');
      await chart.hover({
        position: { x: box.width * 0.55, y: box.height * 0.15 },
      });
      await expect(centre).not.toContainText('Total', { timeout: 500 });

      // The previous month: same colour for each account, whatever its rank.
      await page.goto(`/spendings?month=${previousMonth()}`);
      await expect(
        page.getByRole('region', { name: 'By account' }),
      ).toContainText(names[0]!);
      expect(await swatches()).toEqual(now);
    } finally {
      await page.goto(`/spendings?month=${previousMonth()}`);
      await expect(
        page.getByRole('button', { name: 'Add a spending row' }),
      ).toBeVisible();
      await removeSpendingsCreatedBy(page, mark);
      await page
        .getByRole('region', { name: 'By account' })
        .getByRole('button', { name: 'Table' })
        .click();
      await cleanUp(page, mark, names);
    }
  });

  test('an empty month says nothing was spent', async ({ page }) => {
    await signIn(page);
    await page.goto('/spendings?month=2001-01');
    await expect(
      page
        .getByRole('region', { name: 'By account' })
        .getByText('Nothing spent in January 2001.'),
    ).toBeVisible();
  });
});
