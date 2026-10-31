'use client';

import clsx from 'clsx';

/** A two-or-more option switch of pressed buttons (Spendings | By category, Table | Pie, tabs). */
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
              'min-h-11 rounded-lg px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand',
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
