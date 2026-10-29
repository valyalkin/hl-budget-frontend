import { describe, expect, it } from 'vitest';
import {
  addMonths,
  bestCompletion,
  calendarWeeks,
  centsToAmount,
  donutArcs,
  exactMatch,
  formatMoney,
  isFutureMonth,
  longDate,
  defaultDateFor,
  monthBounds,
  monthLabel,
  parseAmountInput,
  parseDateInput,
  parseMonthParam,
  plural,
  rankSuggestions,
  sharePercent,
  shortDate,
  toCents,
  yearOfParam,
} from '@/app/lib/utils';

describe('money in cents', () => {
  it('parses decimal strings into integer cents', () => {
    expect(toCents('84.37')).toBe(8437);
    expect(toCents('0.00')).toBe(0);
    expect(toCents('2150')).toBe(215000);
    expect(toCents('6.5')).toBe(650);
  });

  it.each(['abc', '1.234', '-1', '', '1.'])('refuses %j', (bad) => {
    expect(() => toCents(bad)).toThrow();
  });

  it('turns cents back into a decimal string', () => {
    expect(centsToAmount(8437)).toBe('84.37');
    expect(centsToAmount(5)).toBe('0.05');
    expect(centsToAmount(215000)).toBe('2150.00');
  });

  it('adds without floating-point drift', () => {
    const sum = ['0.10', '0.20'].map(toCents).reduce((a, b) => a + b, 0);
    expect(centsToAmount(sum)).toBe('0.30');
  });

  it('formats in the given currency, optionally in whole units', () => {
    expect(formatMoney({ amount: '84.37', currency: 'CAD' })).toBe('$84.37');
    expect(
      formatMoney({ amount: '2748.42', currency: 'CAD' }, { wholeUnits: true }),
    ).toBe('$2,748');
  });

  it('computes whole-number shares, and 0 of nothing', () => {
    expect(sharePercent(215000, 274842)).toBe(78);
    expect(sharePercent(1, 3)).toBe(33);
    expect(sharePercent(5, 0)).toBe(0);
  });

  it('reads what the user typed as an amount', () => {
    expect(parseAmountInput('12.5')).toBe('12.50');
    expect(parseAmountInput(' 12,50 ')).toBe('12.50');
    expect(parseAmountInput('99999999.99')).toBe('99999999.99');
    expect(parseAmountInput('0')).toBeNull();
    expect(parseAmountInput('0.00')).toBeNull();
    expect(parseAmountInput('-5')).toBeNull();
    expect(parseAmountInput('abc')).toBeNull();
    expect(parseAmountInput('1.234')).toBeNull();
    expect(parseAmountInput('123456789')).toBeNull();
  });
});

describe('months and dates', () => {
  const today = '2026-10-28';

  it('reads the month param, falling back to today’s month', () => {
    expect(parseMonthParam('2026-10', today)).toEqual({
      year: 2026,
      month: 10,
    });
    expect(parseMonthParam('2025-02', today)).toEqual({ year: 2025, month: 2 });
    for (const bad of [
      undefined,
      null,
      '2026-13',
      'abc',
      '2026-11',
      '2031-01',
    ]) {
      expect(parseMonthParam(bad, today)).toEqual({ year: 2026, month: 10 });
    }
  });

  it('gives the year of a valid param only', () => {
    expect(yearOfParam('2024-03')).toBe(2024);
    expect(yearOfParam('2024-13')).toBeUndefined();
    expect(yearOfParam(undefined)).toBeUndefined();
  });

  it('tells future months apart', () => {
    expect(isFutureMonth({ year: 2026, month: 11 }, today)).toBe(true);
    expect(isFutureMonth({ year: 2027, month: 1 }, today)).toBe(true);
    expect(isFutureMonth({ year: 2026, month: 10 }, today)).toBe(false);
  });

  it('knows the first and last day of a month, leap years included', () => {
    expect(monthBounds({ year: 2026, month: 2 })).toEqual({
      from: '2026-02-01',
      to: '2026-02-28',
    });
    expect(monthBounds({ year: 2028, month: 2 }).to).toBe('2028-02-29');
    expect(monthBounds({ year: 2026, month: 12 }).to).toBe('2026-12-31');
  });

  it('a new spending starts today in the current month, else on the 1st of the shown month', () => {
    expect(defaultDateFor({ year: 2026, month: 10 }, '2026-10-28')).toBe(
      '2026-10-28',
    );
    expect(defaultDateFor({ year: 2026, month: 8 }, '2026-10-28')).toBe(
      '2026-08-01',
    );
    expect(defaultDateFor({ year: 2025, month: 10 }, '2026-10-28')).toBe(
      '2025-10-01',
    );
  });

  it('labels months and dates', () => {
    expect(monthLabel({ year: 2026, month: 10 })).toBe('October 2026');
    expect(shortDate('2026-10-07')).toBe('Oct 7');
    expect(longDate('2026-10-28')).toBe('Oct 28, 2026');
  });

  it('reads typed dates in two formats', () => {
    expect(parseDateInput('2026-10-12')).toBe('2026-10-12');
    expect(parseDateInput('12/10/2026')).toBe('2026-10-12');
    expect(parseDateInput('2/3/2026')).toBe('2026-03-02');
    expect(parseDateInput('2026-02-30')).toBeNull();
    expect(parseDateInput('soon')).toBeNull();
  });

  it('builds a Sunday-first calendar grid', () => {
    const weeks = calendarWeeks({ year: 2026, month: 10 });
    // 1 October 2026 is a Thursday.
    expect(weeks[0]).toEqual([
      null,
      null,
      null,
      null,
      '2026-10-01',
      '2026-10-02',
      '2026-10-03',
    ]);
    expect(weeks.every((week) => week.length === 7)).toBe(true);
    expect(weeks.flat().filter(Boolean)).toHaveLength(31);
  });

  it('steps across year boundaries', () => {
    expect(addMonths({ year: 2026, month: 12 }, 1)).toEqual({
      year: 2027,
      month: 1,
    });
    expect(addMonths({ year: 2026, month: 1 }, -1)).toEqual({
      year: 2025,
      month: 12,
    });
  });
});

describe('suggestions', () => {
  const items = [
    { name: 'Gifts', count: 1 },
    { name: 'Groceries', count: 10 },
    { name: 'Eating out', count: 4 },
    { name: 'Gas', count: 4 },
  ];

  it('puts prefix matches first, each group by use then name, ignoring case', () => {
    expect(rankSuggestions('g', items).map((i) => i.name)).toEqual([
      'Groceries',
      'Gas',
      'Gifts',
      'Eating out',
    ]);
    expect(rankSuggestions('GI', items).map((i) => i.name)).toEqual(['Gifts']);
  });

  it('returns everything by use for empty input', () => {
    expect(rankSuggestions('  ', items).map((i) => i.name)).toEqual([
      'Groceries',
      'Eating out',
      'Gas',
      'Gifts',
    ]);
  });

  it('completes with the first prefix match only', () => {
    expect(bestCompletion('g', rankSuggestions('g', items))?.name).toBe(
      'Groceries',
    );
    expect(bestCompletion('out', rankSuggestions('out', items))).toBeNull();
    expect(bestCompletion('', items)).toBeNull();
  });

  it('never replaces a complete name with a longer one', () => {
    const withShort = [...items, { name: 'Gro', count: 0 }];
    expect(
      bestCompletion('gro ', rankSuggestions('gro', withShort)),
    ).toBeNull();
  });

  it('finds exact matches ignoring case and spaces', () => {
    expect(exactMatch(' groceries ', items)?.name).toBe('Groceries');
    expect(exactMatch('groc', items)).toBeUndefined();
  });
});

describe('donutArcs', () => {
  const box = { r: 84, inner: 54 };

  it('splits the circle by cents, clockwise from the top', () => {
    const arcs = donutArcs([{ cents: 300 }, { cents: 100 }], box);
    expect(arcs).toHaveLength(2);
    expect(arcs[0]?.start).toBeCloseTo(-Math.PI / 2);
    expect(arcs[1]?.end).toBeCloseTo((3 * Math.PI) / 2);
    expect((arcs[0]?.end ?? 0) - (arcs[0]?.start ?? 0)).toBeCloseTo(
      (3 * Math.PI) / 2,
    );
  });

  it('flags arcs over half the circle as large', () => {
    const [big, small] = donutArcs([{ cents: 300 }, { cents: 100 }], box);
    expect(big?.path).toMatch(/A 84 84 0 1 1/);
    expect(small?.path).toMatch(/A 84 84 0 0 1/);
  });

  it('draws one item as a full ring and nothing as nothing', () => {
    const [ring] = donutArcs([{ cents: 5 }], box);
    expect(ring?.path.match(/M /g)).toHaveLength(2);
    expect(donutArcs([], box)).toEqual([]);
  });
});

it('pluralises', () => {
  expect(plural(1, 'spending', 'spendings')).toBe('1 spending');
  expect(plural(14, 'spending', 'spendings')).toBe('14 spendings');
});
