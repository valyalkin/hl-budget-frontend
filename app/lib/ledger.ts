import type { BreakdownKind } from '@/app/ui/spendings/breakdown-kind';
import { plural } from '@/app/lib/utils';

/** The two kinds of entry the app records (specs/009 research R-006): spendings and income. */
export type Ledger = 'spendings' | 'income';

export const LEDGERS: readonly Ledger[] = ['spendings', 'income'];

/**
 * Everything the screens word or store differently for spendings and for income. The spending
 * values are exactly what the screens said before feature 009, so Spendings does not change.
 */
export type LedgerText = {
  /** The page's route; `?month=` is added to it. */
  route: '/spendings' | '/income';
  /** The tab, the page title and the phone's first view option. */
  tab: string;
  /** Counts: `14 spendings`, `3 entries`. */
  count: (n: number) => string;
  /** The list's accessible name and its caption prefix. */
  listName: string;
  caption: string;
  /** Who was paid, or who paid. */
  party: string;
  /** The phone form's hint in that field. */
  partyPlaceholder: string;
  /** `No spendings recorded in October 2026.` (desktop). */
  emptyMonth: (label: string) => string;
  /** `No spendings in October 2026.` (phone). */
  emptyMonthPhone: (label: string) => string;
  addRow: string;
  saveNew: string;
  cancelNew: string;
  /** The phone's floating button and its form. */
  addButton: string;
  newTitle: string;
  editTitle: string;
  remove: string;
  deleteTitle: string;
  keep: string;
  /** The total card's label prefix: `Spent in`, `Received in`. */
  totalIn: string;
  /** The breakdown card's empty month: `Nothing spent in`, `Nothing received in`. */
  nothingIn: string;
  /** The error page's message. */
  loadFailed: string;
  /** `Spending by category`, `Income by category`. */
  breakdownNoun: string;
  /** Validation wording that differs. */
  partyMissing: string;
  partyMissingShort: string;
  unknownCategory: string;
  /** The Table / Pie choice for each breakdown, kept apart per ledger (FR-064). */
  storageKeys: Record<BreakdownKind, string>;
  /** CSV import. */
  importTitle: string;
  sample: string;
  noRowsInFile: string;
  alreadyImported: string;
  added: (n: number, fileName: string) => string;
  addLabel: (n: number) => string;
  /** The phone's view switch: `Spendings`, `Income`. */
  view: string;
};

export const LEDGER: Record<Ledger, LedgerText> = {
  spendings: {
    route: '/spendings',
    tab: 'Spendings',
    count: (n) => plural(n, 'spending', 'spendings'),
    listName: 'Spending list',
    caption: 'Spendings in',
    party: 'Merchant',
    partyPlaceholder: 'Where did you spend?',
    emptyMonth: (label) => `No spendings recorded in ${label}.`,
    emptyMonthPhone: (label) => `No spendings in ${label}.`,
    addRow: 'Add a spending row',
    saveNew: 'Save spending',
    cancelNew: 'Cancel new spending',
    addButton: 'Add spending',
    newTitle: 'New spending',
    editTitle: 'Edit spending',
    remove: 'Delete spending',
    deleteTitle: 'Delete this spending?',
    keep: 'Keep this spending',
    totalIn: 'Spent in',
    nothingIn: 'Nothing spent in',
    loadFailed: 'We couldn’t load your spendings.',
    breakdownNoun: 'Spending',
    partyMissing: 'Add a merchant name.',
    partyMissingShort: 'Merchant missing',
    unknownCategory: 'Not one of your categories',
    storageKeys: {
      category: 'hlb.byCategoryView',
      account: 'hlb.byAccountView',
    },
    importTitle: 'Import CSV',
    sample: '/sample-spendings.csv',
    noRowsInFile:
      'No spendings found in that file. Check that it is a CSV with a header row and at least one data row.',
    alreadyImported: 'These spendings were already added.',
    added: (n, fileName) =>
      `Added ${plural(n, 'spending', 'spendings')} from ${fileName}`,
    addLabel: (n) =>
      n > 0 ? `Add ${plural(n, 'spending', 'spendings')}` : 'Add spendings',
    view: 'Spendings',
  },
  income: {
    route: '/income',
    tab: 'Income',
    count: (n) => plural(n, 'entry', 'entries'),
    listName: 'Income list',
    caption: 'Income in',
    party: 'Source',
    partyPlaceholder: 'Where did it come from?',
    emptyMonth: (label) => `No income recorded in ${label}.`,
    emptyMonthPhone: (label) => `No income in ${label}.`,
    addRow: 'Add an income row',
    saveNew: 'Save income',
    cancelNew: 'Cancel new income',
    addButton: 'Add income',
    newTitle: 'New income',
    editTitle: 'Edit income',
    remove: 'Delete income',
    deleteTitle: 'Delete this income?',
    keep: 'Keep this income',
    totalIn: 'Received in',
    nothingIn: 'Nothing received in',
    loadFailed: 'We couldn’t load your income.',
    breakdownNoun: 'Income',
    partyMissing: 'Add a source.',
    partyMissingShort: 'Source missing',
    unknownCategory: 'Not one of your income categories',
    storageKeys: {
      category: 'hlb.income.byCategoryView',
      account: 'hlb.income.byAccountView',
    },
    importTitle: 'Import income',
    sample: '/sample-income.csv',
    noRowsInFile:
      'No income found in that file. Check that it is a CSV with a header row and at least one data row.',
    alreadyImported: 'These income entries were already added.',
    added: (n, fileName) =>
      `Added ${plural(n, 'income entry', 'income entries')} from ${fileName}`,
    addLabel: (n) =>
      n > 0
        ? `Add ${plural(n, 'income entry', 'income entries')}`
        : 'Add income',
    view: 'Income',
  },
};

/** The page address for a ledger and month, e.g. `/income?month=2026-10`. */
export function ledgerHref(ledger: Ledger, month: string): string {
  return `${LEDGER[ledger].route}?month=${month}`;
}
