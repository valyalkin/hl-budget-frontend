import { ApiError, UnauthenticatedError } from '@/app/lib/definitions';
import { LEDGER, type Ledger } from '@/app/lib/ledger';
import { plural } from '@/app/lib/utils';

/**
 * Every user-facing error string, worded exactly as in specs/003-spending-screens/spec.md
 * (research R-007). Local checks and server refusals share these.
 */
export const MESSAGES = {
  pickDate: 'Pick a date.',
  dateNotFuture: 'Pick a date that is today or earlier.',
  merchant: 'Add a merchant name.',
  category: 'Choose or type a category.',
  account: 'Choose or type an account.',
  amount: 'Enter an amount greater than zero.',
  categoryName: 'Type a name for the category.',
  accountName: 'Type a name for the account.',
  lastAccount: 'You need at least one account.',
  defaultCategory: 'Default categories can’t be removed.',
  gone: 'This item no longer exists.',
  unavailable: 'Couldn’t reach the server. Your changes weren’t saved.',
  loadFailed: 'We couldn’t load your spendings.',
  notCsv: 'That doesn’t look like a CSV file. Choose a .csv export.',
  unreadable: 'The file couldn’t be read. Try again.',
  noRows:
    'No spendings found in that file. Check that it is a CSV with a header row and at least one data row.',
  tooLarge:
    'That file is too large. Import at most 1 MB and 1,000 rows at a time.',
  alreadyImported: 'These spendings were already added.',
  unknownCategory: 'Not one of your categories',
  unknownAccount: 'Not one of your accounts',
  noAccounts: 'Add an account in Settings first.',
  openSettings: 'Open Settings',
  noAccountsYet:
    'You have no accounts yet. Add one to start recording spendings.',
} as const;

/** `1 row needs attention`, `4 rows need attention` (specs/004-csv-import FR-020). */
export function needAttention(count: number): string {
  return plural(count, 'row needs', 'rows need') + ' attention';
}

/** `Added 12 spendings from oct.csv` (FR-035). */
export function added(count: number, fileName: string): string {
  return `Added ${plural(count, 'spending', 'spendings')} from ${fileName}`;
}

/** The import's add button: `Add spendings` while nothing can be added, else with the count. */
export function addLabel(count: number): string {
  return count > 0
    ? `Add ${plural(count, 'spending', 'spendings')}`
    : 'Add spendings';
}

/** `10 rows`, `1,000 rows`. */
export function rowCount(count: number): string {
  return `${count.toLocaleString('en-CA')} ${count === 1 ? 'row' : 'rows'}`;
}

/** `“Coffee” already exists.` */
export function alreadyExists(name: string): string {
  return `“${name}” already exists.`;
}

/**
 * The in-use refusal, worded for a category, an income category or an account (FR-084). An
 * account used by income names both counts (specs/009 research R-008); with no income the
 * wording is unchanged.
 */
export function inUse(
  resource: 'category' | 'incomeCategory' | 'account',
  name: string,
  count: number,
  incomeCount = 0,
): string {
  if (resource === 'incomeCategory') {
    return `${name} is used by ${plural(incomeCount || count, 'entry', 'entries')}, so it can’t be removed.`;
  }
  const spendings = plural(count, 'spending', 'spendings');
  if (resource === 'category') {
    return `${name} is used by ${spendings}, so it can’t be removed.`;
  }
  const income = plural(incomeCount, 'income entry', 'income entries');
  const used =
    incomeCount === 0
      ? spendings
      : count === 0
        ? income
        : `${spendings} and ${income}`;
  return `${name} has ${used}, so it can’t be removed.`;
}

/**
 * The message for one violation the API reported: a name that is not one of the user's items
 * (code `NotFound`, specs/007) or any other field rule. A row prefix (`spendings[2].`) is ignored.
 */
export function violationMessage(
  violation: {
    field?: string;
    code?: string;
  },
  ledger: Ledger = 'spendings',
): string | undefined {
  const field = (violation.field ?? '').replace(
    /^(spendings|incomes)\[\d+\]\./,
    '',
  );
  if (violation.code === 'NotFound') {
    if (field.startsWith('category')) return LEDGER[ledger].unknownCategory;
    if (field.startsWith('account')) return MESSAGES.unknownAccount;
  }
  return fieldMessage(field, ledger);
}

/** The message for an entry field the API rejected, by its field name (`source` for income). */
export function fieldMessage(
  field: string,
  ledger: Ledger = 'spendings',
): string | undefined {
  if (field === 'date') return MESSAGES.dateNotFuture;
  if (field === 'merchant' || field === 'source')
    return LEDGER[ledger].partyMissing;
  if (field.startsWith('amount')) return MESSAGES.amount;
  if (field.startsWith('category')) return MESSAGES.category;
  if (field.startsWith('account')) return MESSAGES.account;
  return undefined;
}

export type MessageContext = {
  resource?: 'category' | 'incomeCategory' | 'account';
  name?: string;
  ledger?: Ledger;
};

/** What to tell the user about a failed API call. */
export function messageFor(
  error: unknown,
  context: MessageContext = {},
): string {
  if (error instanceof UnauthenticatedError || !(error instanceof ApiError)) {
    return MESSAGES.unavailable;
  }
  if (error.status === 404) {
    return MESSAGES.gone;
  }
  if (error.reason === 'duplicate-name') {
    const name = error.details?.name;
    return alreadyExists(
      typeof name === 'string' ? name : (context.name ?? ''),
    );
  }
  if (error.reason === 'in-use') {
    const count = error.details?.spendingCount;
    const incomeCount = error.details?.incomeCount;
    return inUse(
      context.resource ?? 'category',
      context.name ?? 'It',
      typeof count === 'number' ? count : 1,
      typeof incomeCount === 'number' ? incomeCount : 0,
    );
  }
  if (error.reason === 'last-account') {
    return MESSAGES.lastAccount;
  }
  if (error.reason === 'default-category') {
    return MESSAGES.defaultCategory;
  }
  const first = error.errors?.[0];
  if (error.status === 422 && first) {
    return violationMessage(first, context.ledger) ?? MESSAGES.unavailable;
  }
  return MESSAGES.unavailable;
}

/** The first invalid field the API named, as the form field it belongs to. */
export function fieldFor(error: unknown): string | undefined {
  if (!(error instanceof ApiError)) {
    return undefined;
  }
  const field = error.errors?.[0]?.field;
  const name = field?.split('.')[0]?.replace(/(Id|Name)$/, '');
  // An income's source is the entry row's merchant field (specs/009 research R-006).
  return name === 'source' ? 'merchant' : name;
}

// ---------------------------------------------------------------------------------------------
// Phone layout (specs/006-mobile-view). Additions only; the desktop strings above are unchanged.

export const PHONE = {
  deleteTitle: 'Delete this spending?',
  noCustomCategories: 'No custom categories yet.',
  categoriesIntro:
    'Every account starts with the default set. Add your own for anything they don’t cover.',
  incomeCategoriesIntro:
    'Salary and Investments are there from the start. Add your own for any other income.',
  accountsIntro:
    'The cards, bank accounts and wallets you pay from. Each spending is recorded against one of them.',
  importIntro:
    'Upload a CSV export from your bank or card. You’ll check every row before anything is added.',
  importNoteTitle: 'What the file should contain',
  importNote:
    'Columns for date, merchant, category, account and amount, with a header row. The order doesn’t matter, and anything missing can be filled in on the next screen.',
  tapToFix: 'Tap a row to check or fix it.',
  noRowsLeft: 'No rows left to import.',
  allGood: 'All rows look good',
  merchantMissing: 'Merchant missing',
  noDate: 'No date',
  noCategory: 'No category',
  noAccount: 'No account',
  noAmount: 'No amount',
  noSpendingsYet: 'No spendings yet',
} as const;

/** `No spendings in October 2026.` */
export function noSpendingsIn(label: string): string {
  return `No spendings in ${label}.`;
}

/** `Nothing to break down in October 2026.` */
export function nothingToBreakDown(label: string): string {
  return `Nothing to break down in ${label}.`;
}

/** `Deleted Neighbourhood Market · $64.38` */
export function deleted(merchant: string, amount: string): string {
  return `Deleted ${merchant} · ${amount}`;
}

/**
 * An account's use in Settings: `No spendings yet`, `1 spending recorded`, `12 spendings recorded`,
 * and with income `3 spendings · 1 income entry` (specs/009 research R-008).
 */
export function accountUsage(count: number, incomeCount = 0): string {
  if (incomeCount > 0) {
    return `${plural(count, 'spending', 'spendings')} · ${plural(incomeCount, 'income entry', 'income entries')}`;
  }
  return count === 0
    ? PHONE.noSpendingsYet
    : `${plural(count, 'spending', 'spendings')} recorded`;
}

/** An income category's use in Settings: `No income yet`, `1 entry recorded`, `4 entries recorded`. */
export function incomeCategoryUsage(count: number): string {
  return count === 0
    ? 'No income yet'
    : `${plural(count, 'entry', 'entries')} recorded`;
}
