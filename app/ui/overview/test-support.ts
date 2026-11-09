import type { MonthRow, OverviewData } from '@/app/lib/overview';

/** Twelve months: the given [earned, spent] in cents, zeros up to `elapsed`, nulls after. */
export function monthRows(
  values: Record<number, [number, number]>,
  elapsed = 10,
): MonthRow[] {
  return Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    if (month > elapsed) {
      return { month, earnedCents: null, spentCents: null, netCents: null };
    }
    const [earnedCents, spentCents] = values[month] ?? [0, 0];
    return {
      month,
      earnedCents,
      spentCents,
      netCents: earnedCents - spentCents,
    };
  });
}

/** An Overview of 2026 seen on 2026-10-28, unless overridden. */
export function overviewData(
  overrides: Partial<OverviewData> = {},
): OverviewData {
  return {
    year: 2026,
    currentYear: 2026,
    monthsElapsed: 10,
    minYear: 2025,
    month: '2026-10',
    currency: 'CAD',
    totals: { earnedCents: 6100000, spentCents: 4824000, savedCents: 1276000 },
    months: monthRows({ 1: [610000, 480000], 3: [610000, 421537] }),
    byCategory: [
      { id: 'c1', name: 'Rent', cents: 2580000, share: 53.48 },
      { id: 'c2', name: 'Groceries', cents: 2244000, share: 46.52 },
    ],
    byAccount: [
      { id: 'a1', name: 'Visa', cents: 4000000, share: 82.92 },
      { id: 'a2', name: 'Cash', cents: 824000, share: 17.08 },
    ],
    ...overrides,
  };
}
