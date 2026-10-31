'use client';

import clsx from 'clsx';
import { useState } from 'react';
import {
  addMonths,
  calendarWeeks,
  isValidDate,
  monthLabel,
  monthOf,
} from '@/app/lib/utils';
import { ChevronLeftIcon, ChevronRightIcon } from '@/app/ui/phone/icons';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] as const;
const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

/** `"2026-10-27"` → `"Tuesday, October 27, 2026"`. */
export function dayLabel(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  const weekday = new Date(
    Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1),
  ).getUTCDay();
  const name = monthLabel({ year: year ?? 0, month: month ?? 1 }).split(' ')[0];
  return `${WEEKDAY_NAMES[weekday] ?? ''}, ${name} ${day}, ${year}`;
}

const navButton =
  'inline-flex size-11 items-center justify-center rounded-full text-ink-2 focus-visible:outline-2 focus-visible:outline-brand active:bg-line-soft';

/**
 * The inline calendar of the spending form (FR-044, research R-009): previous and next month,
 * 44px days, no days after today, a Today shortcut and Close. Picking a day reports it; the form
 * closes the calendar.
 */
export default function PhoneCalendar({
  value,
  today,
  onPick,
  onClose,
}: {
  value: string;
  today: string;
  onPick: (date: string) => void;
  onClose: () => void;
}) {
  const [shown, setShown] = useState(() =>
    monthOf(isValidDate(value) ? value : today),
  );
  const atToday =
    shown.year * 12 + shown.month >=
    monthOf(today).year * 12 + monthOf(today).month;

  return (
    <div
      role="group"
      aria-label="Choose date"
      className="rounded-2xl bg-surface p-3 ring-1 ring-line"
    >
      <div className="flex items-center justify-between">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => setShown(addMonths(shown, -1))}
          className={navButton}
        >
          <ChevronLeftIcon />
        </button>
        <span aria-live="polite" className="font-semibold">
          {monthLabel(shown)}
        </span>
        <button
          type="button"
          aria-label="Next month"
          disabled={atToday}
          onClick={() => setShown(addMonths(shown, 1))}
          className={clsx(navButton, 'disabled:opacity-40')}
        >
          <ChevronRightIcon />
        </button>
      </div>
      <div
        aria-hidden="true"
        className="mt-2 grid grid-cols-7 text-center text-xs font-medium text-muted"
      >
        {WEEKDAYS.map((day) => (
          <span key={day} className="py-1">
            {day}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1">
        {calendarWeeks(shown)
          .flat()
          .map((date, index) =>
            date === null ? (
              <span key={`blank-${index}`} />
            ) : (
              <button
                key={date}
                type="button"
                aria-label={dayLabel(date)}
                aria-pressed={date === value}
                disabled={date > today}
                onClick={() => onPick(date)}
                className={clsx(
                  'mx-auto inline-flex size-11 items-center justify-center rounded-full text-base tabular-nums focus-visible:outline-2 focus-visible:outline-brand disabled:text-disabled disabled:opacity-60',
                  date === value
                    ? 'bg-brand font-semibold text-white'
                    : date === today
                      ? 'font-semibold text-brand ring-1 ring-brand'
                      : 'text-ink active:bg-line-soft',
                )}
              >
                {Number(date.slice(8, 10))}
              </button>
            ),
          )}
      </div>
      <div className="mt-2 flex justify-between gap-3">
        <button
          type="button"
          onClick={() => onPick(today)}
          className="min-h-11 rounded-lg px-4 font-semibold text-brand focus-visible:outline-2 focus-visible:outline-brand active:bg-brand-tint"
        >
          Today
        </button>
        <button
          type="button"
          onClick={onClose}
          className="min-h-11 rounded-lg px-4 font-semibold text-ink-2 focus-visible:outline-2 focus-visible:outline-brand active:bg-line-soft"
        >
          Close
        </button>
      </div>
    </div>
  );
}
