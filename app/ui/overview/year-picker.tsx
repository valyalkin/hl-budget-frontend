import clsx from 'clsx';
import Link from 'next/link';

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

const arrow =
  'inline-flex size-11 items-center justify-center rounded-lg focus-visible:outline-2 focus-visible:outline-brand';

/**
 * The year arrows (specs/011 US4, FR-005, FR-006; contracts §2). Each is a link that changes only
 * `?year=` and keeps `?month=`, replacing the history entry so Back never steps through years.
 * An arrow that would leave `[minYear, currentYear]` is shown disabled.
 */
export default function YearPicker({
  year,
  minYear,
  currentYear,
  month,
}: {
  year: number;
  minYear: number;
  currentYear: number;
  month: string | null;
}) {
  const href = (target: number) =>
    month
      ? `/overview?month=${month}&year=${target}`
      : `/overview?year=${target}`;

  const control = (
    label: string,
    direction: 'left' | 'right',
    target: number,
    enabled: boolean,
  ) =>
    enabled ? (
      <Link
        href={href(target)}
        replace
        scroll={false}
        aria-label={label}
        className={clsx(arrow, 'text-ink-2 hover:bg-line-soft')}
      >
        <Chevron direction={direction} />
      </Link>
    ) : (
      <span
        role="link"
        aria-label={label}
        aria-disabled="true"
        className={clsx(arrow, 'cursor-not-allowed text-disabled')}
      >
        <Chevron direction={direction} />
      </span>
    );

  return (
    <div
      role="group"
      aria-label="Choose year"
      className="flex items-center gap-0.5 rounded-[14px] border border-line bg-surface p-1.5"
    >
      {control('Previous year', 'left', year - 1, year > minYear)}
      <span
        aria-live="polite"
        className="min-w-16 text-center font-display text-[1.375rem] font-bold tabular-nums"
      >
        {year}
      </span>
      {control('Next year', 'right', year + 1, year < currentYear)}
    </div>
  );
}
