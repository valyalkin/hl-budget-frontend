/**
 * A small RFC 4180 reader for CSV imports (specs/004-csv-import research R-002). Comma only.
 * Quoted values may hold commas, line breaks and doubled quotes. Accepts `\n`, `\r\n` and `\r`
 * line endings, skips blank lines and ignores a leading byte-order mark.
 */
export function parseCsv(text: string): string[][] {
  const source = text.startsWith('﻿') ? text.slice(1) : text;
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  const endRow = () => {
    row.push(cell);
    if (row.some((value) => value.trim() !== '')) {
      rows.push(row);
    }
    row = [];
    cell = '';
  };

  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (quoted) {
      if (ch !== '"') {
        cell += ch;
      } else if (source[i + 1] === '"') {
        cell += '"';
        i++;
      } else {
        quoted = false;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && source[i + 1] === '\n') {
        i++;
      }
      endRow();
    } else {
      cell += ch;
    }
  }
  if (cell !== '' || row.length > 0) {
    endRow();
  }
  return rows;
}
