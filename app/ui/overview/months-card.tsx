'use client';

import type { OverviewData } from '@/app/lib/overview';
import {
  EARNED,
  monthDescription,
  monthsOption,
  monthsSummary,
  SPENT,
} from '@/app/lib/overview-charts';
import { formatWholeDollars, monthShort } from '@/app/lib/utils';
import EChart from '@/app/ui/charts/echart';
import ChartCard, { tableStyles as t } from '@/app/ui/overview/chart-card';

function Legend() {
  return (
    <ul aria-label="Legend" className="m-0 flex list-none gap-4 p-0 text-sm">
      {[
        ['Earned', EARNED],
        ['Spent', SPENT],
      ].map(([name, color]) => (
        <li key={name} className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="inline-block size-3 rounded-[3px]"
            style={{ background: color }}
          />
          {name}
        </li>
      ))}
    </ul>
  );
}

/** Earned vs spent, month by month (specs/011 US2, FR-012 – FR-015). */
export default function MonthsCard({ data }: { data: OverviewData }) {
  const { year, months, monthsElapsed, currency, totals } = data;
  const money = (cents: number) => formatWholeDollars(cents, currency);
  const nothing = totals.earnedCents === 0 && totals.spentCents === 0;

  return (
    <ChartCard
      headingId="earned-vs-spent"
      heading={
        <>
          <h2
            id="earned-vs-spent"
            className="m-0 font-display text-xl font-bold"
          >
            Earned vs spent
          </h2>
          <p className="mt-0.5 text-sm text-muted">Month by month, {year}</p>
        </>
      }
      extras={<Legend />}
      storageKey="hlb.overview.monthsView"
      empty={nothing ? `Nothing recorded in ${year}.` : null}
      chart={() => (
        <EChart
          label={monthsSummary(data)}
          itemsLabel="Months"
          count={12}
          dataKey={`${year}:${JSON.stringify(months)}`}
          buildOption={({ narrow, reducedMotion }) =>
            monthsOption(months, { narrow, reducedMotion, currency })
          }
          describe={(index) => monthDescription(months, index, currency)}
          height={320}
          phoneHeight={260}
        />
      )}
      table={() => (
        <div className={t.wrap}>
          <table className={t.table}>
            <thead>
              <tr>
                <th scope="col" className={`${t.th} text-left`}>
                  Month
                </th>
                <th scope="col" className={`${t.th} text-right`}>
                  Earned
                </th>
                <th scope="col" className={`${t.th} text-right`}>
                  Spent
                </th>
                <th scope="col" className={`${t.th} text-right`}>
                  Net
                </th>
              </tr>
            </thead>
            <tbody>
              {months.slice(0, monthsElapsed).map((row) => (
                <tr key={row.month}>
                  <td className={t.td}>{monthShort(row.month)}</td>
                  <td className={t.num}>{money(row.earnedCents ?? 0)}</td>
                  <td className={t.num}>{money(row.spentCents ?? 0)}</td>
                  <td className={t.num}>{money(row.netCents ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    />
  );
}
