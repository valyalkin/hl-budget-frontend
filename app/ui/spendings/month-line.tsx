import Link from 'next/link';
import type { MonthlyTotals } from '@/app/lib/definitions';
import {
  formatMoney,
  isFutureMonth,
  monthOf,
  monthParam,
  monthShort,
  type YearMonth,
} from '@/app/lib/utils';

const arrowClass =
  'inline-flex size-9 items-center justify-center rounded-lg text-ink-2 hover:bg-line-soft focus-visible:outline-2 focus-visible:outline-brand disabled:text-disabled disabled:hover:bg-transparent';
const cellClass =
  'flex min-h-14 flex-col items-start justify-center gap-0.5 rounded-lg px-2.5 py-1.5 text-left';

function Chevron({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d={direction === 'left' ? 'M10 3L5 8l5 5' : 'M6 3l5 5-5 5'}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * The year and its twelve months, each with its total (FR-010). Future months are disabled
 * (FR-011); the next-year arrow is disabled while today's year is shown. Months are links to
 * `?month=`, so the choice survives reload and Back.
 */
export default function MonthLine({
  totals,
  selected,
  today,
}: {
  totals: MonthlyTotals;
  selected: YearMonth;
  today: string;
}) {
  const year = totals.year;
  const thisYear = monthOf(today).year;
  const nextYear: YearMonth =
    year + 1 >= thisYear ? monthOf(today) : { year: year + 1, month: 12 };

  return (
    <section aria-label="Choose month" className="flex flex-col gap-3">
      <div className="flex items-center gap-1">
        <Link
          href={`/spendings?month=${year - 1}-12`}
          aria-label="Previous year"
          className={arrowClass}
        >
          <Chevron direction="left" />
        </Link>
        <span className="min-w-14 text-center font-display text-lg font-bold">
          {year}
        </span>
        {year >= thisYear ? (
          <button
            type="button"
            aria-label="Next year"
            disabled
            className={arrowClass}
          >
            <Chevron direction="right" />
          </button>
        ) : (
          <Link
            href={`/spendings?month=${monthParam(nextYear)}`}
            aria-label="Next year"
            className={arrowClass}
          >
            <Chevron direction="right" />
          </Link>
        )}
      </div>
      <ol className="grid grid-cols-3 gap-1.5 sm:grid-cols-6 lg:grid-cols-12">
        {totals.months.map((entry, index) => {
          const ym = { year, month: index + 1 };
          const label = monthShort(ym.month);
          const total =
            entry.spendingCount > 0
              ? formatMoney(entry.total, { wholeUnits: true })
              : '—';
          const isSelected =
            ym.year === selected.year && ym.month === selected.month;
          if (isFutureMonth(ym, today)) {
            return (
              <li key={entry.month}>
                <button
                  type="button"
                  disabled
                  aria-disabled="true"
                  className={`${cellClass} w-full text-disabled`}
                >
                  <span className="text-sm font-medium">{label}</span>
                  <span className="text-xs">&nbsp;</span>
                </button>
              </li>
            );
          }
          return (
            <li key={entry.month}>
              <Link
                href={`/spendings?month=${monthParam(ym)}`}
                aria-current={isSelected ? 'date' : undefined}
                className={`${cellClass} ${
                  isSelected
                    ? 'bg-brand-tint text-brand-strong ring-1 ring-brand'
                    : 'bg-surface text-ink-2 hover:bg-line-soft'
                } focus-visible:outline-2 focus-visible:outline-brand`}
              >
                <span className="text-sm font-semibold">{label}</span>
                <span className="font-mono text-xs text-muted tabular-nums">
                  {total}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
