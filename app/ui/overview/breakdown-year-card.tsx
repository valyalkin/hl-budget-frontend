'use client';

import type { OverviewData } from '@/app/lib/overview';
import {
  breakdownDescription,
  breakdownHeight,
  breakdownOption,
  breakdownSummary,
} from '@/app/lib/overview-charts';
import { formatShare, formatWholeDollars } from '@/app/lib/utils';
import EChart from '@/app/ui/charts/echart';
import ChartCard, { tableStyles as t } from '@/app/ui/overview/chart-card';

const KIND = {
  category: {
    heading: 'Spent by category',
    headingId: 'spent-by-category',
    column: 'Category',
    storageKey: 'hlb.overview.categoryView',
  },
  account: {
    heading: 'Spent by account',
    headingId: 'spent-by-account',
    column: 'Account',
    storageKey: 'hlb.overview.accountView',
  },
} as const;

/**
 * Where the year's money went, by category or by account (specs/011 US3, FR-016 – FR-021): a
 * ranked bar chart or a table with shares. Spendings only; income never counts here.
 */
export default function BreakdownYearCard({
  kind,
  data,
}: {
  kind: 'category' | 'account';
  data: OverviewData;
}) {
  const { year, currency, totals } = data;
  const rows = kind === 'category' ? data.byCategory : data.byAccount;
  const { heading, headingId, column, storageKey } = KIND[kind];
  const spent = formatWholeDollars(totals.spentCents, currency);

  return (
    <ChartCard
      headingId={headingId}
      heading={
        <>
          <h2 id={headingId} className="m-0 font-display text-xl font-bold">
            {heading}
          </h2>
          {kind === 'category' ? (
            <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2.5">
              <span className="font-display text-[2.25rem] leading-none font-bold tracking-tight tabular-nums sm:text-[2.75rem]">
                {spent}
              </span>
              <span className="text-sm text-muted">total spent in {year}</span>
            </div>
          ) : (
            <p className="mt-0.5 text-sm text-muted">
              Where the {spent} came from
            </p>
          )}
        </>
      }
      storageKey={storageKey}
      empty={
        totals.spentCents === 0 || rows.length === 0
          ? `No spendings in ${year}.`
          : null
      }
      chart={() => (
        <EChart
          label={breakdownSummary(kind, year, rows, currency)}
          itemsLabel={kind === 'category' ? 'Categories' : 'Accounts'}
          count={rows.length}
          dataKey={`${year}:${JSON.stringify(rows)}`}
          buildOption={({ narrow, reducedMotion }) =>
            breakdownOption(rows, totals.spentCents, {
              narrow,
              reducedMotion,
              currency,
            })
          }
          describe={(index) =>
            breakdownDescription(rows, totals.spentCents, index, currency)
          }
          height={breakdownHeight(kind, rows.length)}
        />
      )}
      table={() => (
        <div className={t.wrap}>
          <table className={t.table}>
            <thead>
              <tr>
                <th scope="col" className={`${t.th} text-left`}>
                  {column}
                </th>
                <th scope="col" className={`${t.th} text-right`}>
                  Spent
                </th>
                <th scope="col" className={`${t.th} text-right`}>
                  Share
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className={t.td}>{row.name}</td>
                  <td className={t.num}>
                    {formatWholeDollars(row.cents, currency)}
                  </td>
                  <td className={t.num}>
                    {formatShare(row.cents, totals.spentCents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    />
  );
}
