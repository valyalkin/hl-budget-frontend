import { MESSAGES } from '@/app/lib/messages';
import { isValidDate, parseAmountInput } from '@/app/lib/utils';

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

const MAX_MERCHANT = 255;
const MAX_NAME = 50;

/**
 * Every problem with a draft, by field, worded as in the spec; empty when it can be saved.
 * Mirrors the server's rules; the server stays authoritative. The import review shows all of
 * them at once (specs/004-csv-import FR-022).
 */
export function draftProblems(
  draft: Draft,
  today: string,
): Partial<Record<Field, string>> {
  const problems: Partial<Record<Field, string>> = {};
  if (!isValidDate(draft.date)) {
    problems.date = MESSAGES.pickDate;
  } else if (draft.date > today) {
    problems.date = MESSAGES.dateNotFuture;
  }
  const merchant = draft.merchant.trim();
  if (!merchant || merchant.length > MAX_MERCHANT) {
    problems.merchant = MESSAGES.merchant;
  }
  const category = draft.category.trim();
  if (!category || category.length > MAX_NAME) {
    problems.category = MESSAGES.category;
  }
  const account = draft.account.trim();
  if (!account || account.length > MAX_NAME) {
    problems.account = MESSAGES.account;
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
export function draftProblem(draft: Draft, today: string): DraftProblem | null {
  const problems = draftProblems(draft, today);
  const field = FIELDS.find((name) => problems[name] !== undefined);
  const message = field ? problems[field] : undefined;
  return field && message ? { field, message } : null;
}

/** Whether a single field has something in it (for Enter: "move on" versus "save"). */
export function isFilled(draft: Draft, field: Field): boolean {
  return draft[field].trim() !== '';
}
