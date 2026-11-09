import type {
  AccountTotals,
  CategoryTotals,
  MonthlyTotals,
} from '@/app/lib/definitions';
import { toCents } from '@/app/lib/utils';

/**
 * The year Overview's view model (specs/011 data-model.md). Nothing here is stored: it is built on
 * every load from the existing monthly, category and account totals. Pure, so it is unit tested
 * without a server; `loadOverview` in `data.ts` fetches its inputs.
 */

/** The error page's message when the Overview cannot be loaded (FR-026). */
export const OVERVIEW_LOAD_FAILED =
  'We couldn’t load your overview. Try again in a moment.';

/** A month of the shown year. All three are null for a month after today in the current year. */
export type MonthRow = {
  month: number;
  earnedCents: number | null;
  spentCents: number | null;
  netCents: number | null;
};

/** A category or account with spending in the year, and its share of the year's spending. */
export type BreakdownRow = {
  id: string;
  name: string;
  cents: number;
  share: number;
};

export type OverviewData = {
  year: number;
  currentYear: number;
  /** 12 for a past year; today's month (1–12) for the current year. */
  monthsElapsed: number;
  minYear: number;
  /** `?month=`, passed through for the Spendings and Income tab links (research R-002). */
  month: string | null;
  currency: string;
  totals: { earnedCents: number; spentCents: number; savedCents: number };
  months: MonthRow[];
  byCategory: BreakdownRow[];
  byAccount: BreakdownRow[];
};

type Param = string | string[] | undefined;

/** The year asked for in the URL (`?year`, else the year of `?month`), before clamping. */
export function requestedYear(params: {
  year?: Param;
  month?: Param;
}): number | undefined {
  const { year, month } = params;
  if (typeof year === 'string' && /^\d{4}$/.test(year)) {
    return Number.parseInt(year, 10);
  }
  if (typeof month === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    return Number.parseInt(month.slice(0, 4), 10);
  }
  return undefined;
}

/**
 * The year to show (FR-002, FR-005, FR-006): the requested year, else the current year, clamped
 * to `[minYear, currentYear]`. Anything that is not a year counts as absent.
 */
export function parseYear(
  params: { year?: Param; month?: Param },
  today: string,
  minYear: number,
): number {
  const currentYear = Number.parseInt(today.slice(0, 4), 10);
  const wanted = requestedYear(params) ?? currentYear;
  return Math.min(currentYear, Math.max(minYear, wanted));
}

function rows(
  items: readonly { id: string; name: string; cents: number }[],
  spentCents: number,
): BreakdownRow[] {
  return items.map((item) => ({
    ...item,
    share: spentCents > 0 ? (item.cents / spentCents) * 100 : 0,
  }));
}

/** Builds the Overview from one year's totals (data-model.md "Rules"). */
export function buildOverview(input: {
  year: number;
  today: string;
  minYear: number;
  month: string | null;
  spendMonthly: MonthlyTotals;
  incomeMonthly: MonthlyTotals;
  categoryTotals: CategoryTotals;
  accountTotals: AccountTotals;
}): OverviewData {
  const currentYear = Number.parseInt(input.today.slice(0, 4), 10);
  const todayMonth = Number.parseInt(input.today.slice(5, 7), 10);
  const monthsElapsed = input.year < currentYear ? 12 : todayMonth;

  const cents = (totals: MonthlyTotals, index: number) =>
    toCents(totals.months[index]?.total.amount ?? '0.00');

  const months: MonthRow[] = Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    if (month > monthsElapsed) {
      return { month, earnedCents: null, spentCents: null, netCents: null };
    }
    const earnedCents = cents(input.incomeMonthly, index);
    const spentCents = cents(input.spendMonthly, index);
    return {
      month,
      earnedCents,
      spentCents,
      netCents: earnedCents - spentCents,
    };
  });

  // Entries cannot be dated in the future, so all twelve months sum to the year to date.
  const sum = (totals: MonthlyTotals) =>
    totals.months.reduce((total, m) => total + toCents(m.total.amount), 0);
  const earnedCents = sum(input.incomeMonthly);
  const spentCents = sum(input.spendMonthly);

  return {
    year: input.year,
    currentYear,
    monthsElapsed,
    minYear: Math.min(input.minYear, currentYear),
    month: input.month,
    currency: input.spendMonthly.months[0]?.total.currency ?? 'CAD',
    totals: { earnedCents, spentCents, savedCents: earnedCents - spentCents },
    months,
    byCategory: rows(
      input.categoryTotals.items.map((item) => ({
        id: item.category.id,
        name: item.category.name,
        cents: toCents(item.total.amount),
      })),
      spentCents,
    ),
    byAccount: rows(
      input.accountTotals.items.map((item) => ({
        id: item.account.id,
        name: item.account.name,
        cents: toCents(item.total.amount),
      })),
      spentCents,
    ),
  };
}
