'use client';

import { nothingToBreakDown } from '@/app/lib/messages';
import { topCategories } from '@/app/lib/phone';
import { donutArcs, formatCents, sharePercent } from '@/app/lib/utils';
import { usePhoneUi } from '@/app/ui/phone/phone-ui-provider';
import Segmented from '@/app/ui/phone/segmented';

type Item = { id: string; name: string; cents: number };

/**
 * By category (FR-030 – FR-034): Table lists every category with its share and a total row; Pie
 * is a donut of the 6 largest plus "Everything else", with a legend that carries the values.
 */
export default function CategoryBreakdown({
  label,
  currency,
  totalCents,
  items,
}: {
  label: string;
  currency: string;
  totalCents: number;
  items: readonly Item[];
}) {
  const ui = usePhoneUi();
  const money = (cents: number) => formatCents(cents, currency);

  return (
    <div className="flex flex-col gap-4 px-4 pt-4 pb-8">
      <Segmented
        label="Show as"
        value={ui.chart}
        onChange={ui.setChart}
        options={[
          { value: 'table', label: 'Table' },
          { value: 'pie', label: 'Pie' },
        ]}
      />
      {items.length === 0 ? (
        <p className="rounded-2xl bg-surface px-4 py-8 text-center text-muted">
          {nothingToBreakDown(label)}
        </p>
      ) : ui.chart === 'table' ? (
        <table
          aria-label="Spending by category"
          className="w-full table-fixed overflow-hidden rounded-2xl bg-surface text-sm ring-1 ring-line"
        >
          <thead>
            <tr className="text-left text-xs text-muted">
              <th scope="col" className="px-4 py-2 font-semibold">
                Category
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
                  <td className="truncate px-4">{item.name}</td>
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
  label,
  money,
  totalCents,
  items,
}: {
  label: string;
  money: (cents: number) => string;
  totalCents: number;
  items: readonly Item[];
}) {
  const slices = topCategories(items, totalCents);
  const arcs = donutArcs(slices, { r: 92, inner: 60 });
  return (
    <div className="flex flex-col items-center gap-5 rounded-2xl bg-surface p-4 ring-1 ring-line">
      <div className="relative size-52">
        <svg
          viewBox="0 0 200 200"
          className="size-full"
          role="img"
          aria-label={`Donut chart of ${label} spending by category. Values are listed below.`}
        >
          {arcs.map((arc, index) => (
            <path
              key={slices[index]?.key ?? index}
              d={arc.path}
              fill={slices[index]?.color}
              stroke="#FFFFFF"
              strokeWidth="2"
            />
          ))}
        </svg>
        <div
          aria-hidden="true"
          className="absolute inset-0 flex flex-col items-center justify-center"
        >
          <span className="text-xs text-muted">Total</span>
          <span className="font-mono text-base font-medium tabular-nums">
            {money(totalCents)}
          </span>
        </div>
      </div>
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
