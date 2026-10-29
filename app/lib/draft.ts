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
 * The first problem with a draft, in field order (FR-037), worded as in the spec; null when the
 * draft can be saved. Mirrors the server's rules; the server stays authoritative.
 */
export function draftProblem(draft: Draft, today: string): DraftProblem | null {
  if (!isValidDate(draft.date)) {
    return { field: 'date', message: MESSAGES.pickDate };
  }
  if (draft.date > today) {
    return { field: 'date', message: MESSAGES.dateNotFuture };
  }
  const merchant = draft.merchant.trim();
  if (!merchant || merchant.length > MAX_MERCHANT) {
    return { field: 'merchant', message: MESSAGES.merchant };
  }
  const category = draft.category.trim();
  if (!category || category.length > MAX_NAME) {
    return { field: 'category', message: MESSAGES.category };
  }
  const account = draft.account.trim();
  if (!account || account.length > MAX_NAME) {
    return { field: 'account', message: MESSAGES.account };
  }
  if (parseAmountInput(draft.amount) === null) {
    return { field: 'amount', message: MESSAGES.amount };
  }
  return null;
}

/** Whether a single field has something in it (for Enter: "move on" versus "save"). */
export function isFilled(draft: Draft, field: Field): boolean {
  return draft[field].trim() !== '';
}
