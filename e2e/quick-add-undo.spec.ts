import { expect, test, type Page } from '@playwright/test';
import {
  addSpendingViaUi,
  marker,
  removeSpendingsCreatedBy,
  signIn,
  UNDO_WAIT_MS,
  waitForPendingDeletes,
} from './support';
import {
  addIncomeViaUi,
  closeSettingsDialog,
  openIncomeTab,
  removeIncomeCreatedBy,
} from './income/support';

/**
 * specs/010: quick add from a row's date (US1) and undo for delete (US2), on both the Spendings
 * and the Income table, which share one component.
 */
type Ledger = {
  name: string;
  party: 'Merchant' | 'Source';
  category: string;
  save: string;
  open: (page: Page) => Promise<void>;
  add: (page: Page, party: string, amount: string) => Promise<void>;
  cleanup: (page: Page, mark: string) => Promise<void>;
  /** Switches to the other tab and back. */
  awayAndBack: (page: Page) => Promise<void>;
};

async function openSpendingsTab(page: Page) {
  await page
    .getByRole('navigation', { name: 'Main' })
    .getByRole('link', { name: 'Spendings' })
    .click();
  await page.waitForURL('**/spendings**');
  await expect(
    page.getByRole('region', { name: 'Spendings list' }),
  ).toBeVisible();
}

const LEDGERS: Ledger[] = [
  {
    name: 'Spendings',
    party: 'Merchant',
    category: 'Groceries',
    save: 'Save spending',
    open: async (page) => {
      await signIn(page);
    },
    add: (page, merchant, amount) =>
      addSpendingViaUi(page, { merchant, amount }),
    cleanup: removeSpendingsCreatedBy,
    awayAndBack: async (page) => {
      await openIncomeTab(page);
      await openSpendingsTab(page);
    },
  },
  {
    name: 'Income',
    party: 'Source',
    category: 'Salary',
    save: 'Save income',
    open: async (page) => {
      await signIn(page);
      await openIncomeTab(page);
    },
    add: (page, source, amount) => addIncomeViaUi(page, { source, amount }),
    cleanup: removeIncomeCreatedBy,
    awayAndBack: async (page) => {
      await openSpendingsTab(page);
      await openIncomeTab(page);
    },
  },
];

const rowOf = (page: Page, text: string) =>
  page.getByRole('row').filter({ hasText: text });

/** The footer total, e.g. "$1,234.56". */
const footerTotal = (page: Page) =>
  page.locator('section[aria-label] > div.border-t span.font-mono');

for (const ledger of LEDGERS) {
  test.describe(`US1: quick add from a date — ${ledger.name}`, () => {
    test('clicking a row’s date opens a new row on that date', async ({
      page,
    }) => {
      const mark = marker('quick-add');
      const first = `${mark} One`;
      const second = `${mark} Two`;
      await ledger.open(page);
      await ledger.add(page, first, '4.00');
      const url = page.url();

      const date = rowOf(page, first).getByRole('button', { name: /^Add on / });
      const label = (await date.getAttribute('aria-label')) ?? '';
      const day = label.replace(/^Add on /, '');
      await expect(date).toHaveAttribute('title', label);
      await date.click();

      await expect(
        page.getByRole('dialog', { name: 'Choose date' }),
      ).toHaveCount(0);
      const party = page.getByRole('combobox', { name: ledger.party });
      await expect(party).toBeFocused();
      await expect(
        page.getByRole('button', { name: new RegExp(`^Date ${day}, \\d{4}`) }),
      ).toBeVisible();

      await party.fill(second);
      await page
        .getByRole('combobox', { name: 'Category' })
        .fill(ledger.category);
      await page.getByRole('combobox', { name: 'Account' }).fill('E2E card');
      await page.getByRole('textbox', { name: /^Amount in / }).fill('5.00');
      await page.keyboard.press('Enter');
      await expect(page.getByRole('button', { name: ledger.save })).toHaveCount(
        0,
      );

      await expect(rowOf(page, second)).toContainText(day);
      expect(page.url()).toBe(url);

      await ledger.cleanup(page, mark);
    });

    test('keyboard: Enter on a focused date does the same; dates lock while a row is open', async ({
      page,
    }) => {
      const mark = marker('quick-key');
      const entry = `${mark} Key`;
      await ledger.open(page);
      await ledger.add(page, entry, '3.00');

      await rowOf(page, entry)
        .getByRole('button', { name: /^Add on / })
        .focus();
      await page.keyboard.press('Enter');
      await expect(
        page.getByRole('combobox', { name: ledger.party }),
      ).toBeFocused();
      await expect(page.getByRole('button', { name: /^Add on / })).toHaveCount(
        0,
      );
      await page.keyboard.press('Escape');
      await expect(page.getByRole('button', { name: ledger.save })).toHaveCount(
        0,
      );

      await ledger.cleanup(page, mark);
    });
  });

  test.describe(`US2: undo for delete — ${ledger.name}`, () => {
    const removeButton = (page: Page, text: string) =>
      rowOf(page, text).getByRole('button', { name: /^Remove / });

    test('Undo within 5 seconds keeps the entry', async ({ page }) => {
      const mark = marker('undo');
      const entry = `${mark} Kept`;
      await ledger.open(page);
      await ledger.add(page, entry, '6.00');

      await removeButton(page, entry).click();
      const row = rowOf(page, entry);
      await expect(row).toHaveAttribute('data-pending', 'true');
      const undo = row.getByRole('button', { name: 'Undo' });
      await expect(undo).toBeVisible();
      await expect(undo).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(row).not.toHaveAttribute('data-pending', 'true');
      await expect(removeButton(page, entry)).toBeFocused();

      // Past the undo time, and after a reload, it is still there.
      await page.waitForTimeout(6000);
      await page.reload();
      await expect(rowOf(page, entry)).toHaveCount(1);

      await ledger.cleanup(page, mark);
    });

    test('left alone, the entry is deleted after 5 seconds and totals drop', async ({
      page,
    }) => {
      const mark = marker('undo-wait');
      const entry = `${mark} Gone`;
      await ledger.open(page);
      await ledger.add(page, entry, '7.00');
      const before = await footerTotal(page).textContent();

      await removeButton(page, entry).click();
      // Not deleted yet: the totals still count it.
      await expect(footerTotal(page)).toHaveText(before ?? '');
      await page.waitForTimeout(4000);
      await expect(rowOf(page, entry)).toHaveCount(1);

      await expect(rowOf(page, entry)).toHaveCount(0, {
        timeout: UNDO_WAIT_MS,
      });
      await expect(footerTotal(page)).not.toHaveText(before ?? '');
      await page.reload();
      await expect(page.getByRole('region', { name: /list$/ })).toBeVisible();
      await expect(rowOf(page, entry)).toHaveCount(0);
    });

    test('several rows wait at once; undoing one keeps only that one', async ({
      page,
    }) => {
      const mark = marker('undo-many');
      await ledger.open(page);
      for (const name of ['A', 'B', 'C']) {
        await ledger.add(page, `${mark} ${name}`, '1.00');
      }
      for (const name of ['A', 'B', 'C']) {
        await removeButton(page, `${mark} ${name}`).click();
      }
      await expect(page.getByRole('button', { name: 'Undo' })).toHaveCount(3);
      await rowOf(page, `${mark} B`)
        .getByRole('button', { name: 'Undo' })
        .click();

      await waitForPendingDeletes(page);
      await expect(rowOf(page, `${mark} A`)).toHaveCount(0);
      await expect(rowOf(page, `${mark} C`)).toHaveCount(0);
      await expect(rowOf(page, `${mark} B`)).toHaveCount(1);

      await ledger.cleanup(page, mark);
    });

    test('leaving the screen deletes waiting entries at once', async ({
      page,
    }) => {
      const mark = marker('undo-leave');
      const toTab = `${mark} Tab`;
      const toSettings = `${mark} Settings`;
      await ledger.open(page);
      await ledger.add(page, toTab, '2.00');
      await ledger.add(page, toSettings, '2.00');

      await removeButton(page, toTab).click();
      await ledger.awayAndBack(page);
      await expect(rowOf(page, toTab)).toHaveCount(0);

      // Settings deletes it before the 5 seconds are up.
      await removeButton(page, toSettings).click();
      await page.getByRole('button', { name: 'User settings' }).click();
      await closeSettingsDialog(page);
      await expect(rowOf(page, toSettings)).toHaveCount(0, { timeout: 3000 });
    });

    test('a reload within 5 seconds keeps the entry', async ({ page }) => {
      const mark = marker('undo-reload');
      const entry = `${mark} Reload`;
      await ledger.open(page);
      await ledger.add(page, entry, '8.00');

      await removeButton(page, entry).click();
      await expect(rowOf(page, entry)).toHaveAttribute('data-pending', 'true');
      await page.reload();
      await expect(rowOf(page, entry)).toHaveCount(1);
      await expect(rowOf(page, entry)).not.toHaveAttribute(
        'data-pending',
        'true',
      );

      await ledger.cleanup(page, mark);
    });
  });
}
