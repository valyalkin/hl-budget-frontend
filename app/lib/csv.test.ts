import { describe, expect, it } from 'vitest';
import { parseCsv } from '@/app/lib/csv';

describe('parseCsv', () => {
  it('splits rows and cells', () => {
    expect(parseCsv('a,b\n1,2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('accepts \\r\\n and \\r line endings', () => {
    expect(parseCsv('a,b\r\n1,2\r3,4')).toEqual([
      ['a', 'b'],
      ['1', '2'],
      ['3', '4'],
    ]);
  });

  it('keeps commas inside quoted values', () => {
    expect(parseCsv('x,"Lakeshore Fuel, Hwy 7",y')).toEqual([
      ['x', 'Lakeshore Fuel, Hwy 7', 'y'],
    ]);
  });

  it('turns a doubled quote inside quotes into one quote', () => {
    expect(parseCsv('"5"" pipe",b')).toEqual([['5" pipe', 'b']]);
  });

  it('keeps line breaks inside quoted values', () => {
    expect(parseCsv('"line one\nline two",b\nc,d')).toEqual([
      ['line one\nline two', 'b'],
      ['c', 'd'],
    ]);
  });

  it('skips blank and whitespace-only lines', () => {
    expect(parseCsv('a,b\n\n   \n1,2\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('strips a leading byte-order mark', () => {
    expect(parseCsv('﻿Date,Amount\n2026-10-01,5')).toEqual([
      ['Date', 'Amount'],
      ['2026-10-01', '5'],
    ]);
  });

  it('adds no empty row for a trailing newline', () => {
    expect(parseCsv('a,b\n1,2\n')).toHaveLength(2);
    expect(parseCsv('a,b\r\n1,2\r\n')).toHaveLength(2);
  });

  it('keeps empty cells', () => {
    expect(parseCsv('a,,c')).toEqual([['a', '', 'c']]);
    expect(parseCsv('a,b,')).toEqual([['a', 'b', '']]);
  });

  it('returns no rows for empty text', () => {
    expect(parseCsv('')).toEqual([]);
  });
});
