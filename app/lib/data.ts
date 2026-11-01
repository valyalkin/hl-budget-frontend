import 'server-only';

import type { Route } from 'next';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { authedFetch } from '@/app/lib/api';
import {
  type AccountList,
  type AccountTotals,
  type CategoryList,
  type CategoryTotals,
  type Income,
  type IncomeAccountTotals,
  type IncomeCategoryList,
  type IncomeCategoryTotals,
  type IncomeMonthlyTotals,
  type IncomePage,
  type IncomeSourceList,
  type MerchantList,
  type MonthlyTotals,
  type NamedItem,
  type SettingsData,
  type Spending,
  type SpendingPage,
  UnauthenticatedError,
  type UserProfile,
} from '@/app/lib/definitions';
import type { Ledger } from '@/app/lib/ledger';
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

/** Spending per account for a month: only accounts with spending, largest first (specs/008). */
export async function getAccountTotals(ym: YearMonth): Promise<AccountTotals> {
  const { from, to } = monthBounds(ym);
  return read<AccountTotals>(`/api/v1/account-totals?from=${from}&to=${to}`);
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

/**
 * The caller's accounts with use counts; shared within one render like getCategories. `count` is
 * the spendings that use it, `incomeCount` the income entries (specs/009 FR-053).
 */
export const getAccounts = cache(
  async (): Promise<(NamedItem & { incomeCount: number })[]> => {
    const list = await read<AccountList>('/api/v1/accounts');
    return list.items.map((a) => ({
      id: a.id,
      name: a.name,
      count: a.spendingCount,
      incomeCount: a.incomeCount,
    }));
  },
);

/** The caller's income categories, Salary and Investments included (specs/009). */
export const getIncomeCategories = cache(
  async (): Promise<(NamedItem & { isDefault: boolean; color: string })[]> => {
    const list = await read<IncomeCategoryList>('/api/v1/income-categories');
    return list.items.map((c) => ({
      id: c.id,
      name: c.name,
      count: c.incomeCount,
      isDefault: c.isDefault,
      color: c.color,
    }));
  },
);

/** Everything Settings shows, on the Spendings and the Income page (specs/009 FR-090). */
export async function getSettingsData(): Promise<SettingsData> {
  const [categories, incomeCategories, accounts] = await Promise.all([
    getCategories(),
    getIncomeCategories(),
    getAccounts(),
  ]);
  return { categories, incomeCategories, accounts };
}

/** The caller's most used merchants, for merchant autofill (R-005). */
export async function getMerchants(): Promise<MerchantList> {
  return read<MerchantList>('/api/v1/merchants');
}

// ---------------------------------------------------------------------------------------------
// Income (specs/009 research R-007). Each reader maps the income resource into the shape the
// spending screens already show, so the same components draw both: an income's `source` becomes
// the entry's `merchant`, and `entryCount` / `incomeCount` become `spendingCount`.

/** An income as the shared screens show it: its source in `merchant`. */
function asEntry(income: Income): Spending {
  const { source, ...rest } = income;
  return { ...rest, merchant: source };
}

async function getMonthIncome(ym: YearMonth): Promise<Spending[]> {
  const { from, to } = monthBounds(ym);
  const items: Spending[] = [];
  let page = 0;
  let totalPages = 1;
  while (page < totalPages) {
    const result = await read<IncomePage>(
      `/api/v1/incomes?from=${from}&to=${to}&size=100&sort=date,desc&page=${page}`,
    );
    items.push(...result.items.map(asEntry));
    totalPages = result.totalPages;
    page += 1;
  }
  return items;
}

async function getMonthlyIncomeTotals(year?: number): Promise<MonthlyTotals> {
  const query = year === undefined ? '' : `?year=${year}`;
  const totals = await read<IncomeMonthlyTotals>(
    `/api/v1/monthly-income-totals${query}`,
  );
  return {
    ...totals,
    months: totals.months.map(({ entryCount, ...month }) => ({
      ...month,
      spendingCount: entryCount,
    })),
  };
}

async function getIncomeCategoryTotals(ym: YearMonth): Promise<CategoryTotals> {
  const { from, to } = monthBounds(ym);
  const { entryCount, items, ...totals } = await read<IncomeCategoryTotals>(
    `/api/v1/income-category-totals?from=${from}&to=${to}`,
  );
  return {
    ...totals,
    spendingCount: entryCount,
    items: items.map(({ entryCount: n, ...item }) => ({
      ...item,
      spendingCount: n,
    })),
  };
}

async function getIncomeAccountTotals(ym: YearMonth): Promise<AccountTotals> {
  const { from, to } = monthBounds(ym);
  const { entryCount, items, ...totals } = await read<IncomeAccountTotals>(
    `/api/v1/income-account-totals?from=${from}&to=${to}`,
  );
  return {
    ...totals,
    spendingCount: entryCount,
    items: items.map(({ entryCount: n, ...item }) => ({
      ...item,
      spendingCount: n,
    })),
  };
}

async function getIncomeSources(): Promise<MerchantList> {
  const list = await read<IncomeSourceList>('/api/v1/income-sources');
  return {
    truncated: list.truncated,
    items: list.items.map(({ incomeCount, ...source }) => ({
      ...source,
      spendingCount: incomeCount,
    })),
  };
}

/** The reads a ledger's page needs; the server alone decides which endpoints they call. */
const READERS = {
  spendings: {
    totals: getMonthlyTotals,
    entries: getMonthSpendings,
    categoryTotals: getCategoryTotals,
    accountTotals: getAccountTotals,
    categories: () => getCategories(),
    merchants: getMerchants,
    accountCount: (a: { count: number; incomeCount: number }) => a.count,
  },
  income: {
    totals: getMonthlyIncomeTotals,
    entries: getMonthIncome,
    categoryTotals: getIncomeCategoryTotals,
    accountTotals: getIncomeAccountTotals,
    categories: async () =>
      (await getIncomeCategories()).map((c) => ({
        id: c.id,
        name: c.name,
        count: c.count,
        isDefault: c.isDefault,
      })),
    merchants: getIncomeSources,
    accountCount: (a: { count: number; incomeCount: number }) => a.incomeCount,
  },
} as const;

export type SpendingsPageData = {
  ym: YearMonth;
  today: string;
  totals: MonthlyTotals;
  spendings: Spending[];
  categoryTotals: CategoryTotals;
  accountTotals: AccountTotals;
  categories: (NamedItem & { isDefault: boolean })[];
  accounts: NamedItem[];
  merchants: MerchantList;
};

/**
 * Everything the Spendings screen shows for `?month=`, in two rounds of parallel calls:
 * 1. the profile and the year's totals (which also say what "today" is);
 * 2. the month itself. A future or invalid month is clamped to today's, which costs one more
 *    totals call only when the clamped month is in another year.
 * Shared within one render (React `cache`), so the desktop and phone sections load it once.
 */
export const loadLedgerPage = cache(async function loadLedgerPage(
  ledger: Ledger,
  monthParam: string | undefined,
): Promise<SpendingsPageData> {
  const reader = READERS[ledger];
  const [, firstTotals] = await Promise.all([
    ensureMyProfile(),
    reader.totals(yearOfParam(monthParam)),
  ]);
  const today = firstTotals.today;
  const ym = parseMonthParam(monthParam, today);
  const [
    totals,
    spendings,
    categoryTotals,
    accountTotals,
    categories,
    accounts,
    merchants,
  ] = await Promise.all([
    ym.year === firstTotals.year ? firstTotals : reader.totals(ym.year),
    reader.entries(ym),
    reader.categoryTotals(ym),
    reader.accountTotals(ym),
    reader.categories(),
    getAccounts(),
    reader.merchants(),
  ]);
  return {
    ym,
    today,
    totals,
    spendings,
    categoryTotals,
    accountTotals,
    categories,
    // Ranked by use in this ledger, so autofill suggests the accounts income goes into.
    accounts: accounts.map((a) => ({
      id: a.id,
      name: a.name,
      count: reader.accountCount(a),
    })),
    merchants,
  };
});

/** The Spendings page's data (feature 003): the spendings ledger of [loadLedgerPage]. */
export function loadSpendingsPage(
  monthParam: string | undefined,
): Promise<SpendingsPageData> {
  return loadLedgerPage('spendings', monthParam);
}

/**
 * The year of the caller's oldest spending, or null when there are none (specs/006-mobile-view
 * R-004): the phone's Year dropdown runs from the current year down to it.
 */
export async function getEarliestSpendingYear(): Promise<number | null> {
  return getEarliestYear('spendings');
}

/** The year of the caller's oldest entry in [ledger], or null when there are none (specs/009). */
export async function getEarliestYear(ledger: Ledger): Promise<number | null> {
  const resource = ledger === 'income' ? 'incomes' : 'spendings';
  const page = await read<SpendingPage | IncomePage>(
    `/api/v1/${resource}?sort=date,asc&size=1&page=0`,
  );
  const first = page.items[0];
  return first ? Number.parseInt(first.date.slice(0, 4), 10) : null;
}
