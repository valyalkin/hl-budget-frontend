'use client';

import { useRouter } from 'next/navigation';
import { useOptimistic, useTransition } from 'react';
import { clampMonth, monthOptions, yearOptions } from '@/app/lib/phone';
import {
  formatCents,
  monthParam,
  plural,
  toCents,
  type YearMonth,
} from '@/app/lib/utils';
import { ChevronDownIcon } from '@/app/ui/phone/icons';
import { usePhoneUi } from '@/app/ui/phone/phone-ui-provider';
import Segmented from '@/app/ui/phone/segmented';

const selectClass =
  'h-12 w-full appearance-none rounded-xl bg-surface pr-10 pl-3 text-base font-medium text-ink ring-1 ring-line focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand';

/**
 * Month and Year as native dropdowns (FR-011 – FR-014), the month's total and count (FR-016), and
 * the Spendings | By category switch (FR-017). A change navigates to `?month=`, the same URL the
 * desktop month line uses (research R-003).
 */
export default function MonthYearPicker({
  ym,
  today,
  earliestYear,
  monthTotal,
  currency,
  count,
}: {
  ym: YearMonth;
  today: string;
  earliestYear: number | null;
  monthTotal: string;
  currency: string;
  count: number;
}) {
  const router = useRouter();
  const ui = usePhoneUi();
  const [pending, startTransition] = useTransition();
  const [shown, setShown] = useOptimistic(ym);

  const go = (next: YearMonth) => {
    const target = clampMonth(next, today);
    ui.clearNotice();
    startTransition(() => {
      setShown(target);
      router.push(`/spendings?month=${monthParam(target)}`, { scroll: false });
    });
  };

  return (
    <section
      aria-label="Choose month"
      className="flex flex-col gap-4 px-4 pt-4"
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="relative">
          <select
            aria-label="Month"
            value={String(shown.month)}
            onChange={(event) =>
              go({ year: shown.year, month: Number(event.target.value) })
            }
            className={selectClass}
          >
            {monthOptions(shown.year, today).map((option) => (
              <option
                key={option.value}
                value={String(option.value)}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted" />
        </div>
        <div className="relative">
          <select
            aria-label="Year"
            value={String(shown.year)}
            onChange={(event) =>
              go({ year: Number(event.target.value), month: shown.month })
            }
            className={selectClass}
          >
            {yearOptions(today, earliestYear, shown.year).map((year) => (
              <option key={year} value={String(year)}>
                {year}
              </option>
            ))}
          </select>
          <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted" />
        </div>
      </div>
      <div
        aria-busy={pending}
        className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 transition-opacity aria-busy:opacity-60"
      >
        <span className="font-mono text-[clamp(1.75rem,10vw,2.5rem)] leading-tight font-medium tabular-nums">
          {formatCents(toCents(monthTotal), currency)}
        </span>
        <span className="text-sm text-muted">
          {plural(count, 'spending', 'spendings')}
        </span>
      </div>
      <Segmented
        label="View"
        value={ui.view}
        onChange={ui.setView}
        options={[
          { value: 'spendings', label: 'Spendings' },
          { value: 'by-category', label: 'By category' },
        ]}
      />
    </section>
  );
}
