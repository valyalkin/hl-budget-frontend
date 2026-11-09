import type { BreakdownRow, MonthRow, OverviewData } from '@/app/lib/overview';
import {
  formatCents,
  formatShare,
  formatWholeDollars,
  monthShort,
} from '@/app/lib/utils';

/**
 * The Overview's chart options and text alternatives (specs/011 research R-005, R-006), built as
 * plain objects so they are unit tested without a browser. The look follows the design canvas's
 * Overview artboard.
 */

/** Earned and Spent, as in the design: the tiles' swatches, the legend and the bars. */
export const EARNED = '#2a78d6';
export const SPENT = '#eb6834';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

const INK = '#17191A';
const MUTED = '#5C625E';
const GRID = '#E1E0D9';
const AXIS = '#C3C2B7';
const FONT = "'IBM Plex Sans', system-ui, sans-serif";

/** What the chart's look depends on besides the data. */
export type ChartContext = {
  /** The chart is narrower than 480px: shorter labels, fewer ticks (R-005). */
  narrow: boolean;
  reducedMotion: boolean;
  currency: string;
};

/** One item of an axis tooltip, as ECharts passes it to the formatter. */
type TipItem = { dataIndex: number; seriesName?: string; marker?: unknown };

const tooltipStyle = {
  confine: true,
  backgroundColor: INK,
  borderWidth: 0,
  padding: 10,
  textStyle: { color: '#FFFFFF', fontFamily: FONT, fontSize: 13 },
};

const axisLabel = { color: MUTED, fontFamily: FONT, fontSize: 13 };

function motion(reducedMotion: boolean) {
  return reducedMotion
    ? { animation: false as const }
    : { animation: true as const, animationDuration: 250 };
}

/** `$5k`, `$2.5k`, `$500`, `$0`: the money scale, in dollars. */
function thousands(value: number): string {
  return Math.abs(value) >= 1000 ? `$${value / 1000}k` : `$${value}`;
}

function dollarsOrNull(cents: number | null): number | null {
  return cents === null ? null : cents / 100;
}

/** The Earned vs spent column chart (FR-013, FR-014; the design's `ov-c1`). */
export function monthsOption(rows: readonly MonthRow[], context: ChartContext) {
  const { narrow, reducedMotion, currency } = context;
  const amount = (cents: number | null) =>
    cents === null ? '—' : formatCents(cents, currency);
  const column = (name: string, color: string, data: (number | null)[]) => ({
    name,
    type: 'bar' as const,
    data,
    barMaxWidth: 28,
    itemStyle: { color, borderRadius: [4, 4, 0, 0] },
  });
  return {
    ...motion(reducedMotion),
    aria: { enabled: false },
    grid: { left: 8, right: 8, top: 12, bottom: 4, containLabel: true },
    tooltip: {
      ...tooltipStyle,
      trigger: 'axis' as const,
      axisPointer: { type: 'shadow' as const },
      formatter: (value: unknown) => {
        const items = value as TipItem[];
        const index = items[0]?.dataIndex ?? 0;
        const row = rows[index];
        const lines = items.map((item) => {
          const cents =
            item.seriesName === 'Earned' ? row?.earnedCents : row?.spentCents;
          return `${String(item.marker ?? '')} ${item.seriesName ?? ''}  ${amount(cents ?? null)}`;
        });
        return [MONTHS[index] ?? '', ...lines].join('<br>');
      },
    },
    xAxis: {
      type: 'category' as const,
      data: MONTHS.map((name, index) =>
        narrow ? name.charAt(0) : monthShort(index + 1),
      ),
      axisTick: { show: false },
      axisLine: { lineStyle: { color: AXIS } },
      axisLabel: { ...axisLabel, interval: 0 },
    },
    yAxis: {
      type: 'value' as const,
      splitNumber: narrow ? 3 : 5,
      axisLabel: { ...axisLabel, formatter: thousands },
      splitLine: { lineStyle: { color: GRID } },
    },
    series: [
      column(
        'Earned',
        EARNED,
        rows.map((r) => dollarsOrNull(r.earnedCents)),
      ),
      column(
        'Spent',
        SPENT,
        rows.map((r) => dollarsOrNull(r.spentCents)),
      ),
    ],
  };
}

/** The Earned vs spent chart's text alternative (FR-024). */
export function monthsSummary({
  year,
  totals,
  currency,
}: OverviewData): string {
  return (
    `Column chart of money earned and spent in each month of ${year}. ` +
    `Earned ${formatWholeDollars(totals.earnedCents, currency)}, ` +
    `spent ${formatWholeDollars(totals.spentCents, currency)}.`
  );
}

/** Longest name drawn in full beside a bar on a narrow chart; the tooltip always has it all. */
const SHORT_NAME = 14;

function shortName(name: string): string {
  return name.length > SHORT_NAME
    ? `${name.slice(0, SHORT_NAME - 1).trimEnd()}…`
    : name;
}

/** Spent by category or by account: one ranked bar per row (FR-017, FR-018; `ov-c2`, `ov-c3`). */
export function breakdownOption(
  rows: readonly BreakdownRow[],
  spentCents: number,
  context: ChartContext,
) {
  const { narrow, reducedMotion, currency } = context;
  return {
    ...motion(reducedMotion),
    aria: { enabled: false },
    grid: { left: 8, right: 24, top: 8, bottom: 4, containLabel: true },
    tooltip: {
      ...tooltipStyle,
      trigger: 'axis' as const,
      axisPointer: { type: 'shadow' as const },
      formatter: (value: unknown) => {
        const index = (value as TipItem[])[0]?.dataIndex ?? 0;
        const row = rows[index];
        if (!row) {
          return '';
        }
        return `${row.name}<br>${formatCents(row.cents, currency)} · ${formatShare(row.cents, spentCents)} of spent`;
      },
    },
    xAxis: {
      type: 'value' as const,
      splitNumber: narrow ? 2 : 4,
      axisLabel: { ...axisLabel, formatter: thousands },
      splitLine: { lineStyle: { color: GRID } },
    },
    yAxis: {
      type: 'category' as const,
      inverse: true,
      data: rows.map((row) => row.name),
      axisTick: { show: false },
      axisLine: { lineStyle: { color: AXIS } },
      axisLabel: {
        color: INK,
        fontFamily: FONT,
        fontSize: 13,
        interval: 0,
        formatter: (name: string) => (narrow ? shortName(name) : name),
      },
    },
    series: [
      {
        type: 'bar' as const,
        data: rows.map((row) => row.cents / 100),
        barWidth: '65%',
        itemStyle: { color: SPENT, borderRadius: [0, 4, 4, 0] },
      },
    ],
  };
}

/** Tall enough that every category or account name stays readable (the design's sizing). */
export function breakdownHeight(
  kind: 'category' | 'account',
  rowCount: number,
): number {
  return kind === 'category'
    ? Math.max(220, rowCount * 30 + 40)
    : rowCount * 48 + 40;
}

/** A breakdown chart's text alternative (FR-024). */
export function breakdownSummary(
  kind: 'category' | 'account',
  year: number,
  rows: readonly BreakdownRow[],
  currency: string,
): string {
  const top = rows[0];
  const base = `Bar chart of ${year} spending by ${kind}.`;
  return top
    ? `${base} Largest is ${top.name} at ${formatWholeDollars(top.cents, currency)}.`
    : base;
}

/** One bar, read out when it is highlighted with the keyboard (R-006). */
export function breakdownDescription(
  rows: readonly BreakdownRow[],
  spentCents: number,
  index: number,
  currency: string,
): string {
  const row = rows[index];
  return row
    ? `${row.name}: ${formatCents(row.cents, currency)}, ${formatShare(row.cents, spentCents)} of spent`
    : '';
}

/** One month, read out when it is highlighted with the keyboard (R-006). */
export function monthDescription(
  rows: readonly MonthRow[],
  index: number,
  currency: string,
): string {
  const row = rows[index];
  const name = MONTHS[index] ?? '';
  if (!row || row.earnedCents === null || row.spentCents === null) {
    return `${name}: nothing yet`;
  }
  return `${name}: earned ${formatCents(row.earnedCents, currency)}, spent ${formatCents(row.spentCents, currency)}`;
}
