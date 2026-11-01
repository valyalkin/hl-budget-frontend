'use client';

import { nothingToBreakDown } from '@/app/lib/messages';
import { topSlices } from '@/app/lib/phone';
import { formatCents, sharePercent } from '@/app/lib/utils';
import DonutChart from '@/app/ui/charts/donut-chart';
import Segmented from '@/app/ui/phone/segmented';
import {
  BREAKDOWN,
  type BreakdownItem,
  type BreakdownKind,
} from '@/app/ui/spendings/breakdown-kind';
import { useLedger } from '@/app/ui/ledger-context';

type Item = BreakdownItem;
export type ChartView = 'table' | 'pie';

/**
 * By category (FR-030 – FR-034) or By account (specs/008 US3): Table lists every item with its
 * share and a total row; Pie is a donut of the 6 largest plus "Everything else", with a legend
 * that carries the values. The Table / Pie choice belongs to the caller, so each breakdown keeps
 * its own (specs/008 FR-002).
 */
export default function Breakdown({
  kind,
  value,
  onChange,
  label,
  currency,
  totalCents,
  items,
}: {
  kind: BreakdownKind;
  value: ChartView;
  onChange: (value: ChartView) => void;
  label: string;
  currency: string;
  totalCents: number;
  items: readonly Item[];
}) {
  const { text } = useLedger();
  const { column, singular, swatchTestId } = BREAKDOWN[kind];
  const money = (cents: number) => formatCents(cents, currency);

  return (
    <div className="flex flex-col gap-4 px-4 pt-4 pb-8">
      <Segmented
        label="Show as"
        value={value}
        onChange={onChange}
        options={[
          { value: 'table', label: 'Table' },
          { value: 'pie', label: 'Pie' },
        ]}
      />
      {items.length === 0 ? (
        <p className="rounded-2xl bg-surface px-4 py-8 text-center text-muted">
          {nothingToBreakDown(label)}
        </p>
      ) : value === 'table' ? (
        <table
          aria-label={`${text.breakdownNoun} by ${singular}`}
          className="w-full table-fixed overflow-hidden rounded-2xl bg-surface text-sm ring-1 ring-line"
        >
          <thead>
            <tr className="text-left text-xs text-muted">
              <th scope="col" className="px-4 py-2 font-semibold">
                {column}
              </th>
              <th
                scope="col"
                className="w-28 px-2 py-2 text-right font-semibold"
              >
                Amount
              </th>
              <th
                scope="col"
                className="w-16 py-2 pr-4 pl-2 text-right font-semibold"
              >
                Share
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line-soft border-t border-line-soft">
            {[...items]
              .sort((a, b) => b.cents - a.cents)
              .map((item) => (
                <tr key={item.id} className="h-12">
                  <td className="px-4">
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        aria-hidden="true"
                        data-testid={swatchTestId}
                        className="size-3 shrink-0 rounded-sm"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="truncate">{item.name}</span>
                    </span>
                  </td>
                  <td className="px-2 text-right font-mono tabular-nums">
                    {money(item.cents)}
                  </td>
                  <td className="pr-4 pl-2 text-right text-muted tabular-nums">
                    {sharePercent(item.cents, totalCents)}%
                  </td>
                </tr>
              ))}
          </tbody>
          <tfoot className="border-t border-line font-semibold">
            <tr className="h-12">
              <td className="px-4">Total</td>
              <td className="px-2 text-right font-mono tabular-nums">
                {money(totalCents)}
              </td>
              <td className="pr-4 pl-2 text-right tabular-nums">100%</td>
            </tr>
          </tfoot>
        </table>
      ) : (
        <Pie
          noun={text.breakdownNoun}
          singular={singular}
          label={label}
          money={money}
          totalCents={totalCents}
          items={items}
        />
      )}
    </div>
  );
}

function Pie({
  noun,
  singular,
  label,
  money,
  totalCents,
  items,
}: {
  noun: string;
  singular: string;
  label: string;
  money: (cents: number) => string;
  totalCents: number;
  items: readonly Item[];
}) {
  const slices = topSlices(items, totalCents);
  return (
    <div className="flex flex-col items-center gap-5 rounded-2xl bg-surface p-4 ring-1 ring-line">
      <DonutChart
        summary={`Donut chart of ${label} ${noun.toLowerCase()} by ${singular}. Values are listed below.`}
        totalText={money(totalCents)}
        radius={92}
        inner={60}
        className="size-52"
        slices={slices.map((slice) => ({
          key: slice.key,
          label: slice.name,
          cents: slice.cents,
          amountText: money(slice.cents),
          shareText: `${slice.share}%`,
          color: slice.color,
        }))}
      />
      <ul className="w-full divide-y divide-line-soft">
        {slices.map((slice) => (
          <li
            key={slice.key}
            className="grid min-h-11 grid-cols-[minmax(0,1fr)_auto_3rem] items-center gap-3 text-sm"
          >
            <span className="flex min-w-0 items-center gap-2">
              <span
                aria-hidden="true"
                className="size-3 shrink-0 rounded-sm"
                style={{ background: slice.color }}
              />
              <span className="truncate">{slice.name}</span>
            </span>
            <span className="font-mono tabular-nums">{money(slice.cents)}</span>
            <span className="text-right text-muted tabular-nums">
              {slice.share}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
