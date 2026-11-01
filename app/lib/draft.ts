import { LEDGER, type Ledger } from '@/app/lib/ledger';
import { MESSAGES } from '@/app/lib/messages';
import { exactMatch, isValidDate, parseAmountInput } from '@/app/lib/utils';

/** The fields of the entry row, in Tab order (FR-053). */
export const FIELDS = [
  'date',
  'merchant',
  'category',
  'account',
  'amount',
] as const;
export type Field = (typeof FIELDS)[number];

/** What the entry row holds while the user types (data-model.md "Row draft"). */
export type Draft = {
  date: string;
  merchant: string;
  category: string;
  account: string;
  amount: string;
};

export type DraftProblem = { field: Field; message: string };

/** The user's categories and accounts; a draft may only name these (specs/007 FR-021). */
export type DraftLookups = {
  categories: readonly { name: string }[];
  accounts: readonly { name: string }[];
};

const MAX_MERCHANT = 255;
const MAX_NAME = 50;

/**
 * Every problem with a draft, by field, worded as in the spec; empty when it can be saved.
 * Mirrors the server's rules; the server stays authoritative. The import review shows all of
 * them at once (specs/004-csv-import FR-022). A category or account must be one of the user's
 * items (specs/007 FR-021, FR-022); nothing is created outside Settings.
 */
export function draftProblems(
  draft: Draft,
  today: string,
  lookups: DraftLookups,
  ledger: Ledger = 'spendings',
): Partial<Record<Field, string>> {
  const text = LEDGER[ledger];
  const problems: Partial<Record<Field, string>> = {};
  if (!isValidDate(draft.date)) {
    problems.date = MESSAGES.pickDate;
  } else if (draft.date > today) {
    problems.date = MESSAGES.dateNotFuture;
  }
  const merchant = draft.merchant.trim();
  if (!merchant || merchant.length > MAX_MERCHANT) {
    problems.merchant = text.partyMissing;
  }
  const category = draft.category.trim();
  if (!category || category.length > MAX_NAME) {
    problems.category = MESSAGES.category;
  } else if (!exactMatch(category, lookups.categories)) {
    problems.category = text.unknownCategory;
  }
  const account = draft.account.trim();
  if (!account || account.length > MAX_NAME) {
    problems.account = MESSAGES.account;
  } else if (!exactMatch(account, lookups.accounts)) {
    problems.account = MESSAGES.unknownAccount;
  }
  if (parseAmountInput(draft.amount) === null) {
    problems.amount = MESSAGES.amount;
  }
  return problems;
}

/**
 * The first problem with a draft, in field order (FR-037), worded as in the spec; null when the
 * draft can be saved.
 */
export function draftProblem(
  draft: Draft,
  today: string,
  lookups: DraftLookups,
  ledger: Ledger = 'spendings',
): DraftProblem | null {
  const problems = draftProblems(draft, today, lookups, ledger);
  const field = FIELDS.find((name) => problems[name] !== undefined);
  const message = field ? problems[field] : undefined;
  return field && message ? { field, message } : null;
}

/** Just the names, which is all a Server Action needs to check a draft against (keeps it small). */
export function namesOnly(lookups: DraftLookups): {
  categories: { name: string }[];
  accounts: { name: string }[];
} {
  return {
    categories: lookups.categories.map(({ name }) => ({ name })),
    accounts: lookups.accounts.map(({ name }) => ({ name })),
  };
}

/** Whether a single field has something in it (for Enter: "move on" versus "save"). */
export function isFilled(draft: Draft, field: Field): boolean {
  return draft[field].trim() !== '';
}
