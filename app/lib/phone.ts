import type { ImportRow } from '@/app/lib/csv-import';
import {
  type Draft,
  type DraftProblem,
  draftProblems,
  type Field,
} from '@/app/lib/draft';
import { addLabel, needAttention, PHONE } from '@/app/lib/messages';
import {
  formatCents,
  isFutureMonth,
  isValidDate,
  monthLabel,
  monthOf,
  parseAmountInput,
  sharePercent,
  shortDate,
  toCents,
  type YearMonth,
} from '@/app/lib/utils';

/**
 * Pure helpers for the phone layout (specs/006-mobile-view). Business rules stay in draft.ts and
 * csv-import.ts; these only order, group and word what the phone screens show.
 */

// ---------------------------------------------------------------------------------------------
// Month and year pickers (FR-012 – FR-014)

export type MonthOption = { value: number; label: string; disabled: boolean };

/** January … December of `year`; months after today's are disabled in today's year. */
export function monthOptions(year: number, today: string): MonthOption[] {
  return Array.from({ length: 12 }, (_, i) => {
    const ym = { year, month: i + 1 };
    return {
      value: i + 1,
      label: monthLabel(ym).split(' ')[0] ?? '',
      disabled: isFutureMonth(ym, today),
    };
  });
}

/** Years newest first, from today's year down to the earliest with a spending (or the shown one). */
export function yearOptions(
  today: string,
  earliestYear: number | null,
  shownYear: number,
): number[] {
  const current = monthOf(today).year;
  const last = Math.min(earliestYear ?? current, shownYear, current);
  return Array.from({ length: current - last + 1 }, (_, i) => current - i);
}

/** A month in the future becomes today's month (picking the current year in a late month). */
export function clampMonth(ym: YearMonth, today: string): YearMonth {
  return isFutureMonth(ym, today) ? monthOf(today) : ym;
}

// ---------------------------------------------------------------------------------------------
// The spending form (FR-042, FR-047)

/** The phone form's field order; validation reports the first problem in this order. */
export const PHONE_FIELDS = [
  'amount',
  'date',
  'merchant',
  'category',
  'account',
] as const satisfies readonly Field[];

/** The first problem with a draft in the phone's field order, or null when it can be saved. */
export function firstPhoneProblem(
  draft: Draft,
  today: string,
): DraftProblem | null {
  const problems = draftProblems(draft, today);
  for (const field of PHONE_FIELDS) {
    const message = problems[field];
    if (message) {
      return { field, message };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------------------------
// By category: top 6 plus "Everything else" (FR-032)

export const EVERYTHING_ELSE = 'Everything else';
const CATEGORY_COLORS = Array.from(
  { length: 6 },
  (_, i) => `var(--color-cat-${i + 1})`,
);
const REST_COLOR = 'var(--color-muted)';

export type CategorySlice = {
  key: string;
  name: string;
  cents: number;
  share: number;
  color: string;
};

/** The `limit` largest categories, and the rest summed as "Everything else" when there are more. */
export function topCategories(
  items: readonly { id: string; name: string; cents: number }[],
  totalCents: number,
  limit = 6,
): CategorySlice[] {
  const ranked = [...items].sort((a, b) => b.cents - a.cents);
  const top = ranked.slice(0, limit).map((item, i) => ({
    key: item.id,
    name: item.name,
    cents: item.cents,
    share: sharePercent(item.cents, totalCents),
    color: CATEGORY_COLORS[i] ?? REST_COLOR,
  }));
  const rest = ranked.slice(limit);
  if (rest.length === 0) {
    return top;
  }
  const cents = rest.reduce((sum, item) => sum + item.cents, 0);
  return [
    ...top,
    {
      key: 'everything-else',
      name: EVERYTHING_ELSE,
      cents,
      share: sharePercent(cents, totalCents),
      color: REST_COLOR,
    },
  ];
}

// ---------------------------------------------------------------------------------------------
// Import review (FR-093, FR-095)

export type RowPart = { text: string; warn: boolean };
export type ImportRowView = {
  merchant: RowPart;
  date: RowPart;
  category: RowPart;
  account: RowPart;
  amount: RowPart;
  needsAttention: boolean;
};

/** What one review row shows: each part's text, and which parts need attention (in amber). */
export function importRowDisplay(
  row: ImportRow,
  today: string,
  currency: string,
): ImportRowView {
  const { draft } = row;
  const problems = draftProblems(draft, today);
  const named = (value: string, problem: string | undefined, empty: string) =>
    problem
      ? { text: value.trim() || empty, warn: true }
      : { text: value.trim(), warn: false };
  const amount = parseAmountInput(draft.amount);
  return {
    merchant: named(draft.merchant, problems.merchant, PHONE.merchantMissing),
    date: problems.date
      ? {
          text: isValidDate(draft.date) ? shortDate(draft.date) : PHONE.noDate,
          warn: true,
        }
      : { text: shortDate(draft.date), warn: false },
    category: named(draft.category, problems.category, PHONE.noCategory),
    account: named(draft.account, problems.account, PHONE.noAccount),
    amount:
      amount === null
        ? { text: PHONE.noAmount, warn: true }
        : { text: formatCents(toCents(amount), currency), warn: false },
    needsAttention: Object.keys(problems).length > 0,
  };
}

function needingAttention(rows: readonly ImportRow[], today: string): number {
  return rows.filter(
    (row) => Object.keys(draftProblems(row.draft, today)).length > 0,
  ).length;
}

/** "4 rows need attention", "1 row needs attention" or "All rows look good". */
export function importBanner(
  rows: readonly ImportRow[],
  today: string,
): { text: string; ok: boolean } {
  const count = needingAttention(rows, today);
  return count > 0
    ? { text: needAttention(count), ok: false }
    : { text: PHONE.allGood, ok: true };
}

/** The add button: disabled "Add spendings" while blocked, else "Add N spendings". */
export function importAddLabel(
  rows: readonly ImportRow[],
  today: string,
): { label: string; disabled: boolean } {
  const blocked = rows.length === 0 || needingAttention(rows, today) > 0;
  return blocked
    ? { label: addLabel(0), disabled: true }
    : { label: addLabel(rows.length), disabled: false };
}
