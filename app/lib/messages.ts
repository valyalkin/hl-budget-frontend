import { ApiError, UnauthenticatedError } from '@/app/lib/definitions';
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

/** The in-use refusal, worded for a category or an account (FR-084). */
export function inUse(
  resource: 'category' | 'account',
  name: string,
  count: number,
): string {
  const spendings = plural(count, 'spending', 'spendings');
  return resource === 'category'
    ? `${name} is used by ${spendings}, so it can’t be removed.`
    : `${name} has ${spendings}, so it can’t be removed.`;
}

/** The message for a spending field the API rejected, by its field name. */
export function fieldMessage(field: string): string | undefined {
  if (field === 'date') return MESSAGES.dateNotFuture;
  if (field === 'merchant') return MESSAGES.merchant;
  if (field.startsWith('amount')) return MESSAGES.amount;
  if (field.startsWith('category')) return MESSAGES.category;
  if (field.startsWith('account')) return MESSAGES.account;
  return undefined;
}

export type MessageContext = {
  resource?: 'category' | 'account';
  name?: string;
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
    return inUse(
      context.resource ?? 'category',
      context.name ?? 'It',
      typeof count === 'number' ? count : 1,
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
    return fieldMessage(first.field) ?? MESSAGES.unavailable;
  }
  return MESSAGES.unavailable;
}

/** The first invalid field the API named, as the form field it belongs to. */
export function fieldFor(error: unknown): string | undefined {
  if (!(error instanceof ApiError)) {
    return undefined;
  }
  const field = error.errors?.[0]?.field;
  return field?.split('.')[0]?.replace(/(Id|Name)$/, '');
}
