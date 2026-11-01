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
