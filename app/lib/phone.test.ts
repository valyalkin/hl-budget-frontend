import { describe, expect, it } from 'vitest';
import type { Draft } from '@/app/lib/draft';
import {
  clampMonth,
  EVERYTHING_ELSE,
  firstPhoneProblem,
  importAddLabel,
  importBanner,
  importRowDisplay,
  monthOptions,
  PHONE_FIELDS,
  topCategories,
  yearOptions,
} from '@/app/lib/phone';

const TODAY = '2026-10-31';
const good: Draft = {
  date: '2026-10-27',
  merchant: 'Corner Bakery',
  category: 'Groceries',
  account: 'Visa',
  amount: '12.40',
};
const row = (patch: Partial<Draft> = {}, key = 'r1') => ({
  key,
  draft: { ...good, ...patch },
});

describe('monthOptions', () => {
  it('lists January to December and disables months after today in today’s year', () => {
    const options = monthOptions(2026, TODAY);
    expect(options).toHaveLength(12);
    expect(options[0]).toEqual({ value: 1, label: 'January', disabled: false });
    expect(options[9]?.disabled).toBe(false);
    expect(options[10]).toEqual({
      value: 11,
      label: 'November',
      disabled: true,
    });
  });

  it('enables every month of a past year', () => {
    expect(monthOptions(2025, TODAY).every((m) => !m.disabled)).toBe(true);
  });
});

describe('yearOptions', () => {
  it('runs newest first from today’s year to the earliest year with a spending', () => {
    expect(yearOptions(TODAY, 2024, 2026)).toEqual([2026, 2025, 2024]);
  });

  it('is at least the current year when there are no spendings', () => {
    expect(yearOptions(TODAY, null, 2026)).toEqual([2026]);
  });

  it('always includes the year being shown', () => {
    expect(yearOptions(TODAY, null, 2025)).toEqual([2026, 2025]);
  });
});

describe('clampMonth', () => {
  it('turns a future month of the current year into today’s month', () => {
    expect(clampMonth({ year: 2026, month: 12 }, TODAY)).toEqual({
      year: 2026,
      month: 10,
    });
  });

  it('keeps past and current months', () => {
    expect(clampMonth({ year: 2025, month: 12 }, TODAY)).toEqual({
      year: 2025,
      month: 12,
    });
    expect(clampMonth({ year: 2026, month: 10 }, TODAY)).toEqual({
      year: 2026,
      month: 10,
    });
  });
});

describe('firstPhoneProblem', () => {
  it('uses the phone field order: amount first', () => {
    expect(PHONE_FIELDS).toEqual([
      'amount',
      'date',
      'merchant',
      'category',
      'account',
    ]);
    const empty = {
      date: '',
      merchant: '',
      category: '',
      account: '',
      amount: '',
    };
    expect(firstPhoneProblem(empty, TODAY)).toEqual({
      field: 'amount',
      message: 'Enter an amount greater than zero.',
    });
  });

  it('reports a future date with the desktop message', () => {
    expect(firstPhoneProblem({ ...good, date: '2026-11-02' }, TODAY)).toEqual({
      field: 'date',
      message: 'Pick a date that is today or earlier.',
    });
  });

  it('is null for a complete draft', () => {
    expect(firstPhoneProblem(good, TODAY)).toBeNull();
  });
});

describe('topCategories', () => {
  const items = [
    ['a', 800],
    ['b', 700],
    ['c', 600],
    ['d', 500],
    ['e', 400],
    ['f', 300],
    ['g', 200],
    ['h', 100],
  ].map(([name, cents]) => ({
    id: String(name),
    name: String(name),
    cents: Number(cents),
  }));

  it('keeps the 6 largest and sums the rest as Everything else', () => {
    const slices = topCategories(items, 3600);
    expect(slices.map((s) => s.name)).toEqual([
      'a',
      'b',
      'c',
      'd',
      'e',
      'f',
      EVERYTHING_ELSE,
    ]);
    expect(slices[6]).toMatchObject({
      cents: 300,
      share: 8,
      color: 'var(--color-muted)',
    });
    expect(slices[0]).toMatchObject({ share: 22, color: 'var(--color-cat-1)' });
  });

  it('has no Everything else with 6 or fewer categories', () => {
    expect(
      topCategories(items.slice(0, 6), 3300).map((s) => s.name),
    ).not.toContain(EVERYTHING_ELSE);
  });

  it('ranks by amount whatever order the items come in', () => {
    const slices = topCategories([...items].reverse(), 3600);
    expect(slices[0]?.name).toBe('a');
  });
});

describe('importRowDisplay', () => {
  it('shows a complete row as is', () => {
    expect(importRowDisplay(row(), TODAY, 'CAD')).toEqual({
      merchant: { text: 'Corner Bakery', warn: false },
      date: { text: 'Oct 27', warn: false },
      category: { text: 'Groceries', warn: false },
      account: { text: 'Visa', warn: false },
      amount: { text: '$12.40', warn: false },
      needsAttention: false,
    });
  });

  it('names missing parts in amber', () => {
    const view = importRowDisplay(
      row({ date: '', merchant: '', category: '', account: '', amount: '' }),
      TODAY,
      'CAD',
    );
    expect(view.merchant).toEqual({ text: 'Merchant missing', warn: true });
    expect(view.date).toEqual({ text: 'No date', warn: true });
    expect(view.category).toEqual({ text: 'No category', warn: true });
    expect(view.account).toEqual({ text: 'No account', warn: true });
    expect(view.amount).toEqual({ text: 'No amount', warn: true });
    expect(view.needsAttention).toBe(true);
  });

  it('keeps a future date’s text but marks it', () => {
    expect(
      importRowDisplay(row({ date: '2026-11-03' }), TODAY, 'CAD').date,
    ).toEqual({
      text: 'Nov 3',
      warn: true,
    });
  });
});

describe('importBanner and importAddLabel', () => {
  it('counts rows that need attention and blocks the add', () => {
    const rows = [row({ category: '' }, 'r1'), row({}, 'r2')];
    expect(importBanner(rows, TODAY)).toEqual({
      text: '1 row needs attention',
      ok: false,
    });
    expect(importAddLabel(rows, TODAY)).toEqual({
      label: 'Add spendings',
      disabled: true,
    });
  });

  it('says all rows look good and offers to add them', () => {
    const rows = [row({}, 'r1'), row({}, 'r2')];
    expect(importBanner(rows, TODAY)).toEqual({
      text: 'All rows look good',
      ok: true,
    });
    expect(importAddLabel(rows, TODAY)).toEqual({
      label: 'Add 2 spendings',
      disabled: false,
    });
    expect(importAddLabel([row()], TODAY).label).toBe('Add 1 spending');
  });

  it('blocks the add when no rows remain', () => {
    expect(importAddLabel([], TODAY)).toEqual({
      label: 'Add spendings',
      disabled: true,
    });
  });
});
