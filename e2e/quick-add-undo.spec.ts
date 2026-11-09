import { expect, test, type Page } from '@playwright/test';
import {
  addSpendingViaUi,
  marker,
  removeSpendingsCreatedBy,
  signIn,
} from './support';
import {
  addIncomeViaUi,
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
};

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
}
