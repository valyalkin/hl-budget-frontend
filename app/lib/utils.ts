/**
 * Pure helpers: money in integer cents, months, dates, suggestion ranking and donut geometry.
 *
 * Money rule (research R-008): amounts arrive as decimal strings. They are parsed only by
 * `toCents` into integer cents, and summed or divided only as cents. Never `parseFloat` money.
 */

/** A money value as the API sends it: an exact decimal string and an ISO 4217 code. */
export type MoneyValue = { amount: string; currency: string };

/** A calendar month. */
export type YearMonth = { year: number; month: number };

const LOCALE = 'en-CA';
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

// ---------------------------------------------------------------------------------------------
// Money

/** `"84.37"` → `8437`. Throws on anything that is not a non-negative decimal with ≤ 2 places. */
export function toCents(amount: string): number {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(amount);
  if (!match) {
    throw new Error(`Not a money amount: ${amount}`);
  }
  const whole = Number.parseInt(match[1] ?? '0', 10);
  const fraction = Number.parseInt((match[2] ?? '').padEnd(2, '0'), 10);
  return whole * 100 + fraction;
}

/** `8437` → `"84.37"`. */
export function centsToAmount(cents: number): string {
  const whole = Math.floor(cents / 100);
  const fraction = String(cents % 100).padStart(2, '0');
  return `${whole}.${fraction}`;
}

/** `$84.37` (or `$2,748` with `wholeUnits`), in the money's own currency. */
export function formatMoney(
  money: MoneyValue,
  options: { wholeUnits?: boolean } = {},
): string {
  return formatCents(toCents(money.amount), money.currency, options);
}

/** Formats integer cents; division happens only here, at display time. */
export function formatCents(
  cents: number,
  currency: string,
  { wholeUnits = false }: { wholeUnits?: boolean } = {},
): string {
  return new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency,
    minimumFractionDigits: wholeUnits ? 0 : 2,
    maximumFractionDigits: wholeUnits ? 0 : 2,
  }).format(cents / 100);
}

/** Whole-number share of a total: `(215000, 274842)` → `78`; 0 when the total is 0. */
export function sharePercent(partCents: number, totalCents: number): number {
  if (totalCents <= 0) {
    return 0;
  }
  return Math.round((partCents * 100) / totalCents);
}

/**
 * What the user typed in the amount field, as the API's decimal string: `"12,5"` → `"12.50"`.
 * Null when it is not a positive amount with at most 8 digits and 2 decimals.
 */
export function parseAmountInput(text: string): string | null {
  const trimmed = text.trim();
  if (!/^\d{1,8}([.,]\d{1,2})?$/.test(trimmed)) {
    return null;
  }
  const cents = toCents(trimmed.replace(',', '.'));
  return cents > 0 ? centsToAmount(cents) : null;
}

// ---------------------------------------------------------------------------------------------
// Months and dates (dates are always `YYYY-MM-DD` strings; no Date maths across time zones)

function ymOfDate(date: string): YearMonth {
  return {
    year: Number.parseInt(date.slice(0, 4), 10),
    month: Number.parseInt(date.slice(5, 7), 10),
  };
}

/** `"2026-10"` for October 2026. */
export function monthParam({ year, month }: YearMonth): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

/** The month of a `YYYY-MM-DD` date. */
export function monthOf(date: string): YearMonth {
  return ymOfDate(date);
}

/** Whether `ym` is after the month of `today`. */
export function isFutureMonth(ym: YearMonth, today: string): boolean {
  const now = ymOfDate(today);
  return ym.year > now.year || (ym.year === now.year && ym.month > now.month);
}

/**
 * The `?month=` value as a month. A missing, malformed or future value falls back to the month
 * of `today` (FR-012).
 */
export function parseMonthParam(
  value: string | null | undefined,
  today: string,
): YearMonth {
  const match = /^(\d{4})-(\d{2})$/.exec(value ?? '');
  if (match) {
    const ym = {
      year: Number.parseInt(match[1] ?? '', 10),
      month: Number.parseInt(match[2] ?? '', 10),
    };
    if (ym.month >= 1 && ym.month <= 12 && !isFutureMonth(ym, today)) {
      return ym;
    }
  }
  return ymOfDate(today);
}

/** The year of a valid `YYYY-MM` param, else undefined. */
export function yearOfParam(
  value: string | null | undefined,
): number | undefined {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(value ?? '');
  return match ? Number.parseInt(match[1] ?? '', 10) : undefined;
}

function daysInMonth({ year, month }: YearMonth): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** First and last day of the month: `{ from: "2026-02-01", to: "2026-02-28" }`. */
export function monthBounds(ym: YearMonth): { from: string; to: string } {
  const prefix = monthParam(ym);
  return {
    from: `${prefix}-01`,
    to: `${prefix}-${String(daysInMonth(ym)).padStart(2, '0')}`,
  };
}

/** `"October 2026"`. */
export function monthLabel({ year, month }: YearMonth): string {
  return `${MONTH_NAMES[month - 1] ?? ''} ${year}`;
}

/** `"Oct"`. */
export function monthShort(month: number): string {
  return (MONTH_NAMES[month - 1] ?? '').slice(0, 3);
}

/** `"2026-10-27"` → `"Oct 27"`. */
export function shortDate(date: string): string {
  const { month } = ymOfDate(date);
  return `${monthShort(month)} ${Number.parseInt(date.slice(8, 10), 10)}`;
}

/** `"2026-10-27"` → `"Oct 27, 2026"`. */
export function longDate(date: string): string {
  return `${shortDate(date)}, ${date.slice(0, 4)}`;
}

/** Whether `YYYY-MM-DD` names a real calendar day. */
export function isValidDate(date: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) {
    return false;
  }
  const ym = {
    year: Number.parseInt(match[1] ?? '', 10),
    month: Number.parseInt(match[2] ?? '', 10),
  };
  const day = Number.parseInt(match[3] ?? '', 10);
  return ym.month >= 1 && ym.month <= 12 && day >= 1 && day <= daysInMonth(ym);
}

/** A typed date as `YYYY-MM-DD`: accepts `2026-10-12` or `12/10/2026`. Null when not a date. */
export function parseDateInput(text: string): string | null {
  const trimmed = text.trim();
  const dmy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
  const iso = dmy
    ? `${dmy[3]}-${(dmy[2] ?? '').padStart(2, '0')}-${(dmy[1] ?? '').padStart(2, '0')}`
    : trimmed;
  return isValidDate(iso) ? iso : null;
}

/** The weeks of a month for a calendar grid, Sunday first; null pads the first and last week. */
export function calendarWeeks(ym: YearMonth): (string | null)[][] {
  const firstWeekday = new Date(Date.UTC(ym.year, ym.month - 1, 1)).getUTCDay();
  const days = daysInMonth(ym);
  const cells: (string | null)[] = Array.from(
    { length: firstWeekday },
    () => null,
  );
  for (let day = 1; day <= days; day += 1) {
    cells.push(`${monthParam(ym)}-${String(day).padStart(2, '0')}`);
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}

/** The month before or after. */
export function addMonths(ym: YearMonth, delta: number): YearMonth {
  const index = ym.year * 12 + (ym.month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

// ---------------------------------------------------------------------------------------------
// Suggestions (FR-050, FR-051)

/** Something that can be suggested: a name and how many spendings use it. */
export type Suggestible = { name: string; count: number };

const norm = (text: string) => text.trim().toLocaleLowerCase(LOCALE);
const byName = (a: Suggestible, b: Suggestible) =>
  a.name.localeCompare(b.name, LOCALE, { sensitivity: 'base' });
const byUse = (a: Suggestible, b: Suggestible) =>
  b.count - a.count || byName(a, b);

/**
 * The items matching `typed`, ignoring case: names that start with it first, then names that
 * only contain it; each group by use, most first, then by name. Empty input returns all by use.
 */
export function rankSuggestions<T extends Suggestible>(
  typed: string,
  items: readonly T[],
): T[] {
  const needle = norm(typed);
  if (!needle) {
    return [...items].sort(byUse);
  }
  const prefix = items
    .filter((item) => norm(item.name).startsWith(needle))
    .sort(byUse);
  const contains = items
    .filter(
      (item) =>
        !norm(item.name).startsWith(needle) && norm(item.name).includes(needle),
    )
    .sort(byUse);
  return [...prefix, ...contains];
}

/**
 * The item to autofill for `typed`: the first prefix match in `ranked`, or null. Null as well when
 * `typed` already names an item exactly (ignoring case and surrounding spaces), so a complete name
 * is never replaced by a longer one.
 */
export function bestCompletion<T extends Suggestible>(
  typed: string,
  ranked: readonly T[],
): T | null {
  const needle = norm(typed);
  if (!needle || ranked.some((item) => norm(item.name) === needle)) {
    return null;
  }
  return ranked.find((item) => norm(item.name).startsWith(needle)) ?? null;
}

/** The item whose name equals `typed` ignoring case and surrounding spaces. */
export function exactMatch<T extends { name: string }>(
  typed: string,
  items: readonly T[],
): T | undefined {
  const needle = norm(typed);
  return needle ? items.find((item) => norm(item.name) === needle) : undefined;
}

// ---------------------------------------------------------------------------------------------
// Donut (FR-072)

export type Arc = { start: number; end: number; path: string };

function point(radius: number, angle: number): string {
  const x = 100 + radius * Math.cos(angle);
  const y = 100 + radius * Math.sin(angle);
  return `${x.toFixed(3)} ${y.toFixed(3)}`;
}

function ring(start: number, end: number, r: number, inner: number): string {
  const large = end - start > Math.PI ? 1 : 0;
  return [
    `M ${point(r, start)}`,
    `A ${r} ${r} 0 ${large} 1 ${point(r, end)}`,
    `L ${point(inner, end)}`,
    `A ${inner} ${inner} 0 ${large} 0 ${point(inner, start)}`,
    'Z',
  ].join(' ');
}

/**
 * One SVG path per item in a 200×200 box centred on (100, 100), clockwise from 12 o'clock, with
 * angles from integer cents. A single item is a full ring drawn as two halves.
 */
export function donutArcs(
  items: readonly { cents: number }[],
  { r, inner }: { r: number; inner: number },
): Arc[] {
  const total = items.reduce((sum, item) => sum + item.cents, 0);
  if (items.length === 0 || total <= 0) {
    return [];
  }
  const top = -Math.PI / 2;
  if (items.length === 1) {
    const half = top + Math.PI;
    return [
      {
        start: top,
        end: top + 2 * Math.PI,
        path: `${ring(top, half, r, inner)} ${ring(half, top + 2 * Math.PI, r, inner)}`,
      },
    ];
  }
  let running = 0;
  return items.map((item) => {
    const start = top + (running / total) * 2 * Math.PI;
    running += item.cents;
    const end = top + (running / total) * 2 * Math.PI;
    return { start, end, path: ring(start, end, r, inner) };
  });
}

/** `1 spending`, `3 spendings`. */
export function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}
