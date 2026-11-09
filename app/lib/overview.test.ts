import { describe, expect, it } from 'vitest';
import type {
  AccountTotals,
  CategoryTotals,
  MonthlyTotals,
} from '@/app/lib/definitions';
import { buildOverview, parseYear } from '@/app/lib/overview';

const cad = (amount: string) => ({ amount, currency: 'CAD' });

function monthly(
  year: number,
  amounts: Record<number, string>,
  today = '2026-10-28',
): MonthlyTotals {
  return {
    year,
    today,
    months: Array.from({ length: 12 }, (_, i) => ({
      month: `${year}-${String(i + 1).padStart(2, '0')}`,
      total: cad(amounts[i + 1] ?? '0.00'),
      spendingCount: amounts[i + 1] ? 1 : 0,
    })),
  };
}

const categories: CategoryTotals = {
  from: '2026-01-01',
  to: '2026-12-31',
  total: cad('3000.10'),
  spendingCount: 3,
  items: [
    {
      category: { id: 'c1', name: 'Rent' },
      total: cad('2150.00'),
      spendingCount: 1,
      color: '#1e5b45',
    },
    {
      category: { id: 'c2', name: 'Groceries' },
      total: cad('850.10'),
      spendingCount: 2,
      color: '#c2410c',
    },
  ],
};

const accounts: AccountTotals = {
  from: '2026-01-01',
  to: '2026-12-31',
  total: cad('3000.10'),
  spendingCount: 3,
  items: [
    {
      account: { id: 'a1', name: 'Visa' },
      total: cad('3000.10'),
      spendingCount: 3,
      color: '#e11d48',
    },
  ],
};

const empty = (from: string, to: string) => ({
  from,
  to,
  total: cad('0.00'),
  spendingCount: 0,
  items: [],
});

describe('parseYear (specs/011 R-002)', () => {
  const today = '2026-10-28';

  it('uses ?year, else the year of ?month, else the current year', () => {
    expect(parseYear({ year: '2025', month: '2024-03' }, today, 2020)).toBe(
      2025,
    );
    expect(parseYear({ month: '2024-03' }, today, 2020)).toBe(2024);
    expect(parseYear({}, today, 2020)).toBe(2026);
  });

  it('falls back to the default for values that are not a year', () => {
    expect(parseYear({ year: 'abc', month: '2024-03' }, today, 2020)).toBe(
      2024,
    );
    expect(parseYear({ year: '20255' }, today, 2020)).toBe(2026);
    expect(parseYear({ month: 'nope' }, today, 2020)).toBe(2026);
    expect(parseYear({ year: ['2025', '2024'] }, today, 2020)).toBe(2026);
  });

  it('clamps to [minYear, currentYear]', () => {
    expect(parseYear({ year: '2999' }, today, 2020)).toBe(2026);
    expect(parseYear({ year: '1999' }, today, 2020)).toBe(2020);
    expect(parseYear({ year: '2024' }, today, 2026)).toBe(2026);
  });
});

describe('buildOverview (specs/011 data-model.md)', () => {
  it('sums the current year to date, with no figures for future months', () => {
    const data = buildOverview({
      year: 2026,
      today: '2026-10-28',
      minYear: 2024,
      month: '2026-03',
      spendMonthly: monthly(2026, { 1: '100.10', 3: '2900.00' }),
      incomeMonthly: monthly(2026, { 1: '5000.00', 10: '6100.05' }),
      categoryTotals: categories,
      accountTotals: accounts,
    });

    expect(data.year).toBe(2026);
    expect(data.currentYear).toBe(2026);
    expect(data.monthsElapsed).toBe(10);
    expect(data.minYear).toBe(2024);
    expect(data.month).toBe('2026-03');
    expect(data.currency).toBe('CAD');
    expect(data.totals).toEqual({
      earnedCents: 1110005,
      spentCents: 300010,
      savedCents: 809995,
    });
    expect(data.months).toHaveLength(12);
    expect(data.months[0]).toEqual({
      month: 1,
      earnedCents: 500000,
      spentCents: 10010,
      netCents: 489990,
    });
    expect(data.months[1]).toEqual({
      month: 2,
      earnedCents: 0,
      spentCents: 0,
      netCents: 0,
    });
    expect(data.months[2]?.netCents).toBe(-290000);
    expect(data.months[10]).toEqual({
      month: 11,
      earnedCents: null,
      spentCents: null,
      netCents: null,
    });
  });

  it('keeps the API order of breakdowns and adds shares of total spent', () => {
    const data = buildOverview({
      year: 2026,
      today: '2026-10-28',
      minYear: 2026,
      month: null,
      spendMonthly: monthly(2026, { 1: '100.10', 3: '2900.00' }),
      incomeMonthly: monthly(2026, {}),
      categoryTotals: categories,
      accountTotals: accounts,
    });
    expect(data.byCategory.map((r) => r.name)).toEqual(['Rent', 'Groceries']);
    expect(data.byCategory[0]).toMatchObject({ id: 'c1', cents: 215000 });
    expect(data.byCategory[0]?.share).toBeCloseTo((215000 / 300010) * 100);
    expect(data.byCategory.reduce((sum, r) => sum + r.cents, 0)).toBe(
      data.totals.spentCents,
    );
    expect(data.byAccount).toEqual([
      { id: 'a1', name: 'Visa', cents: 300010, share: 100 },
    ]);
    expect(data.totals.savedCents).toBe(-300010);
    expect(data.month).toBeNull();
  });

  it('counts all twelve months of a past year', () => {
    const data = buildOverview({
      year: 2025,
      today: '2026-10-28',
      minYear: 2025,
      month: null,
      spendMonthly: monthly(2025, { 12: '10.00' }),
      incomeMonthly: monthly(2025, { 12: '20.00' }),
      categoryTotals: empty('2025-01-01', '2025-12-31'),
      accountTotals: empty('2025-01-01', '2025-12-31'),
    });
    expect(data.monthsElapsed).toBe(12);
    expect(data.months[11]).toEqual({
      month: 12,
      earnedCents: 2000,
      spentCents: 1000,
      netCents: 1000,
    });
  });

  it('gives zero shares when nothing was spent', () => {
    const data = buildOverview({
      year: 2026,
      today: '2026-10-28',
      minYear: 2026,
      month: null,
      spendMonthly: monthly(2026, {}),
      incomeMonthly: monthly(2026, {}),
      categoryTotals: {
        ...categories,
        items: [{ ...categories.items[0]!, total: cad('0.00') }],
      },
      accountTotals: empty('2026-01-01', '2026-12-31'),
    });
    expect(data.byCategory[0]?.share).toBe(0);
    expect(data.totals).toEqual({
      earnedCents: 0,
      spentCents: 0,
      savedCents: 0,
    });
  });
});
