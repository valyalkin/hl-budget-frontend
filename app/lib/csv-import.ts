import { parseCsv } from '@/app/lib/csv';
import type { Draft } from '@/app/lib/draft';
import {
  centsToAmount,
  exactMatch,
  isValidDate,
  toCents,
} from '@/app/lib/utils';

/**
 * Turns a CSV file's text into review rows (specs/004-csv-import research R-003 – R-005, R-012).
 * Runs in the browser; the file never leaves it. Values that cannot be read are left empty for
 * the user to fill in on the review (FR-015).
 */

/** At most 1 MB (1,048,576 bytes) and 1,000 data rows per import (FR-010). */
export const MAX_FILE_BYTES = 1_048_576;
export const MAX_ROWS = 1000;

/** One row of the review: a stable key and the values as the entry row's draft. */
export type ImportRow = { key: string; draft: Draft };

/** The user's names, so `visa` in a file is shown as their `Visa` (FR-014). */
export type ImportLookups = {
  categories: readonly { name: string }[];
  accounts: readonly { name: string }[];
};

/** Why a file was refused; each is a key of `MESSAGES`. */
export type ImportRefusal = 'notCsv' | 'tooLarge' | 'noRows' | 'unreadable';

type Column = keyof Draft;
export type ColumnMap = Record<Column, number>;

/**
 * Header patterns, checked in this order; each field takes the first unused matching column.
 * Merchant is last, so "Account name" goes to account (R-003).
 */
const PATTERNS: readonly (readonly [Column, RegExp])[] = [
  ['date', /date|posted|day/],
  ['category', /categ/],
  ['account', /account|card|source/],
  ['amount', /amount|total|value|debit|price|cost/],
  ['merchant', /merchant|description|payee|vendor|name|memo|store|details/],
];

/** The order of columns in a file without a header row. */
const FIXED: ColumnMap = {
  date: 0,
  merchant: 1,
  category: 2,
  account: 3,
  amount: 4,
};

/** Column indexes for the five fields (-1 when missing), or null when the row is not a header. */
export function mapColumns(header: readonly string[]): ColumnMap | null {
  const names = header.map((cell) => cell.trim().toLowerCase());
  const used = new Set<number>();
  const map: ColumnMap = {
    date: -1,
    merchant: -1,
    category: -1,
    account: -1,
    amount: -1,
  };
  for (const [field, pattern] of PATTERNS) {
    const index = names.findIndex(
      (name, i) => !used.has(i) && pattern.test(name),
    );
    if (index >= 0) {
      map[field] = index;
      used.add(index);
    }
  }
  return used.size >= 2 ? map : null;
}

function pad(value: string): string {
  return value.padStart(2, '0');
}

/**
 * `YYYY-MM-DD` (also `/` or `.`) or day-first `DD/MM/YYYY` (also `-` or `.`), read day first
 * always (clarification Q2). A time after the date is ignored. Anything else, or an impossible
 * date, is `''`. A future date is returned as read; validation flags it.
 */
export function parseImportDate(text: string): string {
  const date = text.trim().split(/[ T]/)[0] ?? '';
  const ymd = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(date);
  const dmy = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/.exec(date);
  const iso = ymd
    ? `${ymd[1]}-${pad(ymd[2] ?? '')}-${pad(ymd[3] ?? '')}`
    : dmy
      ? `${dmy[3]}-${pad(dmy[2] ?? '')}-${pad(dmy[1] ?? '')}`
      : '';
  return isValidDate(iso) ? iso : '';
}

/**
 * A money amount as a canonical decimal string (`"18.90"`), or `''`. Currency symbols and codes,
 * spaces and thousands separators are ignored; a negative amount is a spending of that size;
 * more than 2 decimals round half up. All on the string: no floating point (R-005).
 */
export function parseImportAmount(text: string): string {
  let value = text
    .replace(/[$€£¥]/g, '')
    .replace(/\b[A-Za-z]{3}\b/g, '')
    .replace(/[\s,]/g, '');
  const paren = /^\((.*)\)$/.exec(value);
  if (paren) {
    value = paren[1] ?? '';
  } else if (value.startsWith('-')) {
    value = value.slice(1);
  } else if (value.endsWith('-')) {
    value = value.slice(0, -1);
  }
  const match = /^(\d{1,12})(?:\.(\d+))?$/.exec(value);
  if (!match) {
    return '';
  }
  const fraction = match[2] ?? '';
  const roundUp = (fraction[2] ?? '0') >= '5' ? 1 : 0;
  const cents = toCents(`${match[1]}.${fraction.slice(0, 2) || '0'}`) + roundUp;
  return cents > 0 ? centsToAmount(cents) : '';
}

/** Trims and collapses runs of spaces inside a name. */
export function normaliseName(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

function matchName(text: string, items: readonly { name: string }[]): string {
  const name = normaliseName(text);
  return exactMatch(name, items)?.name ?? name;
}

/** Every data row of the file, in file order, as review rows. */
export function rowsFromCsv(text: string, lookups: ImportLookups): ImportRow[] {
  const grid = parseCsv(text);
  const header = grid[0];
  if (!header) {
    return [];
  }
  const mapped = mapColumns(header);
  const columns = mapped ?? FIXED;
  const data = mapped ? grid.slice(1) : grid;
  return data.map((cells, index) => {
    const cell = (field: Column) => {
      const column = columns[field];
      return column >= 0 ? (cells[column] ?? '') : '';
    };
    return {
      key: `r${index + 1}`,
      draft: {
        date: parseImportDate(cell('date')),
        merchant: normaliseName(cell('merchant')),
        category: matchName(cell('category'), lookups.categories),
        account: matchName(cell('account'), lookups.accounts),
        amount: parseImportAmount(cell('amount')),
      },
    };
  });
}

const CSV_TYPES = new Set(['text/csv', 'application/vnd.ms-excel']);

/** Refuses a file before reading it: not a CSV by name or type, or over 1 MB. */
export function checkFile(file: {
  name: string;
  type: string;
  size: number;
}): ImportRefusal | null {
  if (!/\.csv$/i.test(file.name) && !CSV_TYPES.has(file.type)) {
    return 'notCsv';
  }
  return file.size > MAX_FILE_BYTES ? 'tooLarge' : null;
}

/** The review rows of a file's text, or why it cannot be imported. */
export function readImport(
  text: string,
  lookups: ImportLookups,
): { rows: ImportRow[] } | { error: ImportRefusal } {
  const rows = rowsFromCsv(text, lookups);
  if (rows.length === 0) {
    return { error: 'noRows' };
  }
  return rows.length > MAX_ROWS ? { error: 'tooLarge' } : { rows };
}
