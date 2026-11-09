import { describe, expect, it } from 'vitest';
import {
  breakdownDescription,
  breakdownHeight,
  breakdownOption,
  breakdownSummary,
  EARNED,
  monthDescription,
  monthsOption,
  monthsSummary,
  SPENT,
} from '@/app/lib/overview-charts';
import { monthRows, overviewData } from '@/app/ui/overview/test-support';

type Series = {
  name: string;
  type: string;
  data: (number | null)[];
  barMaxWidth: number;
  itemStyle: { color: string; borderRadius: number[] };
};
type Formatter = (value: unknown) => string;

const rows = monthRows({ 1: [610000, 480000], 3: [610000, 421537] }, 10);
const wide = { narrow: false, reducedMotion: false, currency: 'CAD' };

describe('monthsOption (specs/011 R-005)', () => {
  it('draws twelve months of earned and spent columns, none after today', () => {
    const option = monthsOption(rows, wide);
    expect(option.xAxis.data).toEqual([
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ]);
    const [earned, spent] = option.series as Series[];
    expect(earned).toMatchObject({
      name: 'Earned',
      type: 'bar',
      barMaxWidth: 28,
      itemStyle: { color: EARNED, borderRadius: [4, 4, 0, 0] },
    });
    expect(spent?.name).toBe('Spent');
    expect(spent?.itemStyle.color).toBe(SPENT);
    expect(earned?.data.slice(0, 3)).toEqual([6100, 0, 6100]);
    expect(spent?.data[2]).toBeCloseTo(4215.37);
    expect(earned?.data.slice(10)).toEqual([null, null]);
    expect(spent?.data.slice(10)).toEqual([null, null]);
  });

  it('uses one-letter months and fewer ticks when narrow', () => {
    const option = monthsOption(rows, { ...wide, narrow: true });
    expect(option.xAxis.data).toEqual([
      'J',
      'F',
      'M',
      'A',
      'M',
      'J',
      'J',
      'A',
      'S',
      'O',
      'N',
      'D',
    ]);
    expect(option.yAxis.splitNumber).toBe(3);
    expect(monthsOption(rows, wide).yAxis.splitNumber).toBe(5);
  });

  it('labels the money scale in thousands', () => {
    const format = monthsOption(rows, wide).yAxis.axisLabel
      .formatter as Formatter;
    expect(format(5000)).toBe('$5k');
    expect(format(2500)).toBe('$2.5k');
    expect(format(500)).toBe('$500');
    expect(format(0)).toBe('$0');
  });

  it('animates briefly, or not at all with reduced motion, and leaves aria to the page', () => {
    expect(monthsOption(rows, wide).animationDuration).toBe(250);
    expect(monthsOption(rows, { ...wide, reducedMotion: true }).animation).toBe(
      false,
    );
    expect(monthsOption(rows, wide).aria).toEqual({ enabled: false });
  });

  it('names the full month and both amounts to the cent in the tooltip', () => {
    const format = monthsOption(rows, wide).tooltip.formatter as Formatter;
    expect(
      format([
        { dataIndex: 2, seriesName: 'Earned', marker: '●' },
        { dataIndex: 2, seriesName: 'Spent', marker: '●' },
      ]),
    ).toBe('March<br>● Earned  $6,100.00<br>● Spent  $4,215.37');
    expect(format([{ dataIndex: 11, seriesName: 'Earned', marker: '●' }])).toBe(
      'December<br>● Earned  —',
    );
  });

  it('keeps the tooltip inside the chart, in the design’s dark style', () => {
    const { tooltip } = monthsOption(rows, wide);
    expect(tooltip).toMatchObject({
      trigger: 'axis',
      confine: true,
      backgroundColor: '#17191A',
      borderWidth: 0,
    });
  });
});

describe('Earned vs spent text alternatives (specs/011 R-006)', () => {
  it('summarises the year', () => {
    expect(monthsSummary(overviewData())).toBe(
      'Column chart of money earned and spent in each month of 2026. Earned $61,000, spent $48,240.',
    );
  });

  it('describes one month for the live region', () => {
    expect(monthDescription(rows, 2, 'CAD')).toBe(
      'March: earned $6,100.00, spent $4,215.37',
    );
    expect(monthDescription(rows, 10, 'CAD')).toBe('November: nothing yet');
  });
});

describe('breakdownOption (specs/011 R-005)', () => {
  const rows = [
    { id: 'c1', name: 'Rent', cents: 2580000, share: 53.48 },
    { id: 'c2', name: 'Entertainment and fun', cents: 2244000, share: 46.52 },
  ];

  type Bars = {
    type: string;
    data: number[];
    barWidth: string;
    itemStyle: { color: string; borderRadius: number[] };
  };

  it('draws one bar per row, largest at the top, all in the Spent colour', () => {
    const option = breakdownOption(rows, 4824000, wide);
    expect(option.yAxis).toMatchObject({
      type: 'category',
      inverse: true,
      data: ['Rent', 'Entertainment and fun'],
    });
    expect(option.yAxis.axisLabel.interval).toBe(0);
    const [bars] = option.series as Bars[];
    expect(bars).toMatchObject({
      type: 'bar',
      barWidth: '65%',
      itemStyle: { color: SPENT, borderRadius: [0, 4, 4, 0] },
    });
    expect(bars?.data).toEqual([25800, 22440]);
    expect(option.aria).toEqual({ enabled: false });
  });

  it('shortens long names when narrow; the tooltip keeps the full name', () => {
    const narrowOption = breakdownOption(rows, 4824000, {
      ...wide,
      narrow: true,
    });
    const format = narrowOption.yAxis.axisLabel.formatter as Formatter;
    expect(format('Entertainment and fun')).toBe('Entertainment…');
    expect(format('Rent')).toBe('Rent');
    const wideFormat = breakdownOption(rows, 4824000, wide).yAxis.axisLabel
      .formatter as Formatter;
    expect(wideFormat('Entertainment and fun')).toBe('Entertainment and fun');
    const tip = narrowOption.tooltip.formatter as Formatter;
    expect(tip([{ dataIndex: 1 }])).toBe(
      'Entertainment and fun<br>$22,440.00 · 47% of spent',
    );
  });

  it('thins the money scale on a narrow chart, so its labels never overlap', () => {
    expect(breakdownOption(rows, 4824000, wide).xAxis.splitNumber).toBe(4);
    expect(
      breakdownOption(rows, 4824000, { ...wide, narrow: true }).xAxis
        .splitNumber,
    ).toBe(2);
  });

  it('labels the money scale in dollars and thousands', () => {
    const format = breakdownOption(rows, 4824000, wide).xAxis.axisLabel
      .formatter as Formatter;
    expect(format(800)).toBe('$800');
    expect(format(2000)).toBe('$2k');
  });

  it('grows tall enough for every name', () => {
    expect(breakdownHeight('category', 2)).toBe(220);
    expect(breakdownHeight('category', 17)).toBe(17 * 30 + 40);
    expect(breakdownHeight('account', 3)).toBe(3 * 48 + 40);
  });

  it('summarises and describes rows', () => {
    expect(breakdownSummary('category', 2026, rows, 'CAD')).toBe(
      'Bar chart of 2026 spending by category. Largest is Rent at $25,800.',
    );
    expect(breakdownSummary('account', 2026, [], 'CAD')).toBe(
      'Bar chart of 2026 spending by account.',
    );
    expect(breakdownDescription(rows, 4824000, 0, 'CAD')).toBe(
      'Rent: $25,800.00, 53% of spent',
    );
  });
});
