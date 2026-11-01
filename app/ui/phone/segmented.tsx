'use client';

import clsx from 'clsx';

/**
 * A two-or-more option switch of pressed buttons (Spendings | By category | By account, Table | Pie,
 * tabs). With three or more options the padding narrows and a label may wrap to two lines, so the
 * switch fits a 320px screen without scrolling sideways (specs/008 research R-008).
 */
export default function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="grid auto-cols-fr grid-flow-col gap-1 rounded-xl bg-line-soft p-1"
    >
      {options.map((option) => {
        const pressed = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={pressed}
            onClick={() => onChange(option.value)}
            className={clsx(
              'min-h-11 rounded-lg text-sm leading-tight font-semibold focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand',
              options.length >= 3 ? 'px-2' : 'px-3',
              pressed ? 'bg-surface text-ink shadow-sm' : 'text-ink-2',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
