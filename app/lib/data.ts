import 'server-only';

import type { Route } from 'next';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { authedFetch } from '@/app/lib/api';
import {
  type AccountList,
  type CategoryList,
  type CategoryTotals,
  type MerchantList,
  type MonthlyTotals,
  type NamedItem,
  type Spending,
  type SpendingPage,
  UnauthenticatedError,
  type UserProfile,
} from '@/app/lib/definitions';
import {
  monthBounds,
  parseMonthParam,
  type YearMonth,
  yearOfParam,
} from '@/app/lib/utils';

const SIGN_IN = '/auth/login?returnTo=/spendings' as Route;

/**
 * Every read is per user and never cached across requests. A rejected or unusable token sends the
 * user to sign in again (FR-010 of 001); any other failure propagates to the segment's error
 * boundary (FR-092).
 */
async function read<T>(
  path: `/api/v1/${string}`,
  init?: RequestInit,
): Promise<T> {
  try {
    return await authedFetch<T>(path, init);
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      redirect(SIGN_IN);
    }
    throw error;
  }
}

/**
 * Creates or refreshes the caller's record and returns it (PUT /api/v1/users/me). 200 and 201
 * are the same to the UI. Per-user and idempotent, so safe to call on every page view.
 */
export async function ensureMyProfile(): Promise<UserProfile> {
  return read<UserProfile>('/api/v1/users/me', { method: 'PUT' });
}

/** Twelve months of a year (the current year when omitted) and today's date (R-002, R-008). */
export async function getMonthlyTotals(year?: number): Promise<MonthlyTotals> {
  const query = year === undefined ? '' : `?year=${year}`;
  return read<MonthlyTotals>(`/api/v1/monthly-totals${query}`);
}

/** Every spending of a month, newest first, following every page (R-003). */
export async function getMonthSpendings(ym: YearMonth): Promise<Spending[]> {
  const { from, to } = monthBounds(ym);
  const items: Spending[] = [];
  let page = 0;
  let totalPages = 1;
  while (page < totalPages) {
    const result = await read<SpendingPage>(
      `/api/v1/spendings?from=${from}&to=${to}&size=100&sort=date,desc&page=${page}`,
    );
    items.push(...result.items);
    totalPages = result.totalPages;
    page += 1;
  }
  return items;
}

/** Spending per category for a month: only categories with spending, largest first. */
export async function getCategoryTotals(
  ym: YearMonth,
): Promise<CategoryTotals> {
  const { from, to } = monthBounds(ym);
  return read<CategoryTotals>(`/api/v1/category-totals?from=${from}&to=${to}`);
}

/**
 * The caller's categories, defaults included, with use counts. React's `cache` shares one call
 * between the Spendings section and Settings within a single render; nothing is kept after it.
 */
export const getCategories = cache(
  async (): Promise<(NamedItem & { isDefault: boolean })[]> => {
    const list = await read<CategoryList>('/api/v1/categories');
    return list.items.map((c) => ({
      id: c.id,
      name: c.name,
      count: c.spendingCount,
      isDefault: c.isDefault,
    }));
  },
);

/** The caller's accounts with use counts; shared within one render like getCategories. */
export const getAccounts = cache(async (): Promise<NamedItem[]> => {
  const list = await read<AccountList>('/api/v1/accounts');
  return list.items.map((a) => ({
    id: a.id,
    name: a.name,
    count: a.spendingCount,
  }));
});

/** The caller's most used merchants, for merchant autofill (R-005). */
export async function getMerchants(): Promise<MerchantList> {
  return read<MerchantList>('/api/v1/merchants');
}

export type SpendingsPageData = {
  ym: YearMonth;
  today: string;
  totals: MonthlyTotals;
  spendings: Spending[];
  categoryTotals: CategoryTotals;
  categories: (NamedItem & { isDefault: boolean })[];
  accounts: NamedItem[];
  merchants: MerchantList;
};

/**
 * Everything the Spendings screen shows for `?month=`, in two rounds of parallel calls:
 * 1. the profile and the year's totals (which also say what "today" is);
 * 2. the month itself. A future or invalid month is clamped to today's, which costs one more
 *    totals call only when the clamped month is in another year.
 */
export async function loadSpendingsPage(
  monthParam: string | undefined,
): Promise<SpendingsPageData> {
  const [, firstTotals] = await Promise.all([
    ensureMyProfile(),
    getMonthlyTotals(yearOfParam(monthParam)),
  ]);
  const today = firstTotals.today;
  const ym = parseMonthParam(monthParam, today);
  const [totals, spendings, categoryTotals, categories, accounts, merchants] =
    await Promise.all([
      ym.year === firstTotals.year ? firstTotals : getMonthlyTotals(ym.year),
      getMonthSpendings(ym),
      getCategoryTotals(ym),
      getCategories(),
      getAccounts(),
      getMerchants(),
    ]);
  return {
    ym,
    today,
    totals,
    spendings,
    categoryTotals,
    categories,
    accounts,
    merchants,
  };
}
