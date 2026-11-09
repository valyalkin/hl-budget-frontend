'use client';

import clsx from 'clsx';
import type { ReactNode } from 'react';
import {
  useViewChoice,
  type ViewChoice,
} from '@/app/ui/overview/use-view-choice';

/**
 * An Overview card (specs/011): a heading block, optional extras beside it, and the Chart / Table
 * switch whose choice is remembered under `storageKey` (FR-023). Renders `empty` instead of either
 * view when there is nothing to show (FR-025).
 */
export default function ChartCard({
  headingId,
  heading,
  extras,
  storageKey,
  empty,
  chart,
  table,
}: {
  headingId: string;
  /** The h2 and what goes under it. */
  heading: ReactNode;
  /** Beside the switch, such as a legend. */
  extras?: ReactNode;
  storageKey: string;
  /** A message shown in place of the chart and table, or null. */
  empty: string | null;
  chart: () => ReactNode;
  table: () => ReactNode;
}) {
  const [view, setView] = useViewChoice(storageKey);

  const option = (value: ViewChoice, label: string) => (
    <button
      type="button"
      aria-pressed={view === value}
      onClick={() => setView(value)}
      className={clsx(
        'min-h-11 rounded-lg px-3.5 text-sm font-semibold text-ink focus-visible:outline-2 focus-visible:outline-brand sm:min-h-[38px]',
        view === value ? 'bg-surface shadow-sm' : 'bg-transparent',
      )}
    >
      {label}
    </button>
  );

  return (
    <section
      aria-labelledby={headingId}
      className="flex min-w-0 flex-col gap-4 rounded-[14px] border border-line bg-surface p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">{heading}</div>
        <div className="flex flex-wrap items-center gap-4">
          {extras}
          <div
            role="group"
            aria-label="Show as"
            className="flex gap-0.5 rounded-[10px] bg-line-soft p-[3px]"
          >
            {option('chart', 'Chart')}
            {option('table', 'Table')}
          </div>
        </div>
      </div>
      {empty ? (
        <p className="py-6 text-center text-muted">{empty}</p>
      ) : view === 'chart' ? (
        chart()
      ) : (
        table()
      )}
    </section>
  );
}

/** The shared look of the Overview tables (the design's 12px uppercase headers, mono numbers). */
export const tableStyles = {
  wrap: 'overflow-x-auto',
  table: 'w-full min-w-[20rem] border-collapse text-sm',
  th: 'border-b border-line px-2.5 py-2 text-xs font-semibold tracking-[0.05em] text-muted uppercase',
  td: 'border-b border-line-soft px-2.5 py-[7px]',
  num: 'border-b border-line-soft px-2.5 py-[7px] text-right font-mono tabular-nums',
};
