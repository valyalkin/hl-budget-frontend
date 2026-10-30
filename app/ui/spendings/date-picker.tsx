'use client';

import { type KeyboardEvent, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  FLOATING_START,
  useFloating,
  useFloatingRoot,
} from '@/app/ui/spendings/use-floating';
import {
  addMonths,
  calendarWeeks,
  isFutureMonth,
  longDate,
  monthLabel,
  monthOf,
  monthParam,
  type YearMonth,
} from '@/app/lib/utils';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] as const;
const navClass =
  'inline-flex size-9 items-center justify-center rounded-lg text-ink-2 hover:bg-line-soft focus-visible:outline-2 focus-visible:outline-brand disabled:text-disabled disabled:hover:bg-transparent';

/** `YYYY-MM-DD` shifted by whole days, in UTC so no time zone can move it. */
function shiftDay(date: string, days: number): string {
  const base = new Date(`${date}T00:00:00Z`);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

/**
 * The date field from the design: a button showing the date that opens a calendar with previous
 * and next month arrows and a "Today" shortcut (FR-034). Days after `today` cannot be picked;
 * `today` comes from the server, never the browser's clock (research R-008).
 */
export default function DatePicker({
  value,
  today,
  onChange,
  buttonRef,
  autoOpen = false,
  onPicked,
  onKeyDown,
}: {
  value: string;
  today: string;
  onChange: (date: string) => void;
  buttonRef?: (element: HTMLButtonElement | null) => void;
  /** Open the calendar as soon as the field appears (a new spending starts with the date). */
  autoOpen?: boolean;
  /** Called after a day is picked (not on Close or Escape), so the row can move on. */
  onPicked?: () => void;
  /** Keys pressed on the field itself (not inside the calendar), for the row to handle. */
  onKeyDown?: (event: KeyboardEvent<HTMLButtonElement>) => void;
}) {
  const titleId = useId();
  const [open, setOpen] = useState(autoOpen);
  const [shown, setShown] = useState<YearMonth>(() => monthOf(value || today));
  const [focusDay, setFocusDay] = useState(value || today);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const grid = useRef<HTMLTableElement | null>(null);
  const container = useRef<HTMLDivElement | null>(null);
  const panel = useRef<HTMLDivElement | null>(null);

  useFloating(open, trigger, panel);
  const floatingRoot = useFloatingRoot();

  // A press anywhere outside the field and its calendar closes the calendar.
  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (
        !container.current?.contains(target) &&
        !panel.current?.contains(target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  useEffect(() => {
    if (open) {
      grid.current
        ?.querySelector<HTMLButtonElement>(`[data-day="${focusDay}"]`)
        ?.focus();
    }
  }, [open, focusDay, shown]);

  const setTriggerRef = (element: HTMLButtonElement | null) => {
    trigger.current = element;
    buttonRef?.(element);
  };

  const openCalendar = () => {
    const start = value || today;
    setShown(monthOf(start));
    setFocusDay(start);
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    trigger.current?.focus();
  };

  const choose = (date: string) => {
    onChange(date);
    close();
    onPicked?.();
  };

  const moveFocus = (days: number) => {
    const next = shiftDay(focusDay, days);
    if (next > today) {
      return;
    }
    setFocusDay(next);
    setShown(monthOf(next));
  };

  /** Escape closes the calendar from any of its buttons, without reaching the row (FR-056). */
  const onCalendarKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close();
    }
  };

  /** Arrow keys move between days; a step past today does nothing. */
  const onDayKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    onCalendarKeyDown(event);
    const steps: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
    };
    const step = steps[event.key];
    if (step !== undefined) {
      event.preventDefault();
      moveFocus(step);
    }
  };

  const label = value ? longDate(value) : 'Pick a date';
  const atLatestMonth = isFutureMonth(addMonths(shown, 1), today);

  return (
    <div ref={container} className="relative">
      <button
        ref={setTriggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Date ${label}. Open calendar`}
        onClick={() => (open ? close() : openCalendar())}
        onKeyDown={onKeyDown}
        className="flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-line bg-surface px-2.5 text-sm whitespace-nowrap focus-visible:outline-2 focus-visible:outline-brand"
      >
        <span>{label}</span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <rect
            x="2"
            y="3"
            width="12"
            height="11"
            rx="2"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M2 7h12M5 1.5v3M11 1.5v3"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>
      {open && floatingRoot
        ? createPortal(
            <div
              ref={panel}
              role="dialog"
              aria-label="Choose date"
              style={FLOATING_START}
              className="fixed z-30 w-72 rounded-xl bg-surface p-3 shadow-lg ring-1 ring-line"
            >
              <div className="mb-2 flex items-center justify-between">
                <button
                  type="button"
                  aria-label="Previous month"
                  className={navClass}
                  onKeyDown={onCalendarKeyDown}
                  onClick={() => setShown((current) => addMonths(current, -1))}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M10 3L5 8l5 5"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                <span
                  id={titleId}
                  aria-live="polite"
                  className="font-display font-bold"
                >
                  {monthLabel(shown)}
                </span>
                <button
                  type="button"
                  aria-label="Next month"
                  className={navClass}
                  onKeyDown={onCalendarKeyDown}
                  disabled={atLatestMonth}
                  onClick={() => setShown((current) => addMonths(current, 1))}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M6 3l5 5-5 5"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
              <table
                ref={grid}
                aria-labelledby={titleId}
                className="w-full table-fixed border-separate border-spacing-0.5"
              >
                <thead>
                  <tr>
                    {WEEKDAYS.map((day) => (
                      <th
                        key={day}
                        scope="col"
                        className="text-center text-xs font-normal text-muted"
                      >
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {calendarWeeks(shown).map((week, w) => (
                    <tr key={`${monthParam(shown)}-${w}`}>
                      {week.map((day, d) => {
                        if (!day) {
                          return <td key={`blank-${d}`} />;
                        }
                        const future = day > today;
                        const selected = day === value;
                        return (
                          <td key={day}>
                            <button
                              type="button"
                              data-day={day}
                              tabIndex={day === focusDay ? 0 : -1}
                              disabled={future}
                              aria-label={longDate(day)}
                              aria-pressed={selected}
                              onClick={() => choose(day)}
                              onKeyDown={onDayKeyDown}
                              className={`h-9 w-full rounded-lg text-sm tabular-nums focus-visible:outline-2 focus-visible:outline-brand ${
                                selected
                                  ? 'bg-brand font-semibold text-white'
                                  : future
                                    ? 'text-disabled'
                                    : day === today
                                      ? 'font-semibold text-brand ring-1 ring-brand'
                                      : 'text-ink hover:bg-line-soft'
                              }`}
                            >
                              {Number.parseInt(day.slice(8), 10)}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-2 flex justify-between border-t border-line-soft pt-2">
                <button
                  type="button"
                  onClick={() => choose(today)}
                  onKeyDown={onCalendarKeyDown}
                  className="h-9 rounded-lg px-2.5 text-sm font-semibold text-brand hover:bg-brand-tint focus-visible:outline-2 focus-visible:outline-brand"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={close}
                  onKeyDown={onCalendarKeyDown}
                  className="h-9 rounded-lg px-2.5 text-sm text-ink-2 hover:bg-line-soft focus-visible:outline-2 focus-visible:outline-brand"
                >
                  Close
                </button>
              </div>
            </div>,
            floatingRoot,
          )
        : null}
    </div>
  );
}
