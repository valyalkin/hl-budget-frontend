import { describe, expect, it } from 'vitest';
import {
  checkFile,
  MAX_FILE_BYTES,
  MAX_ROWS,
  mapColumns,
  normaliseName,
  parseImportAmount,
  parseImportDate,
  readImport,
  rowsFromCsv,
} from '@/app/lib/csv-import';

const lookups = {
  categories: [{ name: 'Groceries' }, { name: 'Car' }, { name: 'Coffee' }],
  accounts: [{ name: 'Visa' }, { name: 'Chequing' }],
};

describe('mapColumns', () => {
  it('finds the five columns by name', () => {
    expect(
      mapColumns(['Date', 'Description', 'Category', 'Account', 'Amount']),
    ).toEqual({ date: 0, merchant: 1, category: 2, account: 3, amount: 4 });
  });

  it('finds columns in any order and letter case', () => {
    expect(mapColumns(['AMOUNT', 'Payee', 'Posted Date'])).toEqual({
      date: 2,
      merchant: 1,
      category: -1,
      account: -1,
      amount: 0,
    });
  });

  it('sends "Account name" to account, not merchant', () => {
    expect(mapColumns(['Account name', 'Merchant', 'Date'])).toMatchObject({
      account: 0,
      merchant: 1,
      date: 2,
    });
  });

  it('ignores headers that match nothing', () => {
    expect(
      mapColumns(['Reference', 'Date', 'Notes', 'Amount', 'Merchant']),
    ).toEqual({ date: 1, merchant: 4, category: -1, account: -1, amount: 3 });
  });

  it('returns null when fewer than two columns are recognised', () => {
    expect(mapColumns(['2026-10-01', 'Corner Bakery', '12.40'])).toBeNull();
    expect(mapColumns(['Amount', 'x', 'y'])).toBeNull();
  });
});

describe('parseImportDate', () => {
  it.each([
    ['2026-10-28', '2026-10-28'],
    ['2026/10/28', '2026-10-28'],
    ['2026.10.28', '2026-10-28'],
    ['2026-1-5', '2026-01-05'],
    ['28/10/2026', '2026-10-28'],
    ['03/04/2026', '2026-04-03'],
    ['3-4-2026', '2026-04-03'],
    ['3.4.2026', '2026-04-03'],
    ['2026-10-28 14:03', '2026-10-28'],
    ['2026-10-28T14:03:00', '2026-10-28'],
    [' 28/10/2026 ', '2026-10-28'],
    ['2027-01-01', '2027-01-01'],
  ])('reads %s as %s', (text, expected) => {
    expect(parseImportDate(text)).toBe(expected);
  });

  it.each([
    '10/27/2026',
    '2026-02-30',
    '2026-13-01',
    'yesterday',
    '',
    '26-10-28',
  ])('leaves %s empty', (text) => {
    expect(parseImportDate(text)).toBe('');
  });
});

describe('parseImportAmount', () => {
  it.each([
    ['12.40', '12.40'],
    ['12.4', '12.40'],
    ['5', '5.00'],
    ['-18.90', '18.90'],
    ['18.90-', '18.90'],
    ['(18.90)', '18.90'],
    ['$1,041.18', '1041.18'],
    ['1,041.18', '1041.18'],
    ['CAD 5', '5.00'],
    ['5 CAD', '5.00'],
    ['€ 7.25', '7.25'],
    ['6.755', '6.76'],
    ['6.754', '6.75'],
    ['0.005', '0.01'],
    [' 3.35 ', '3.35'],
  ])('reads %s as %s', (text, expected) => {
    expect(parseImportAmount(text)).toBe(expected);
  });

  it.each(['0', '0.00', '0.004', 'abc', '', '1.2.3', '--5', '1e3'])(
    'leaves %s empty',
    (text) => {
      expect(parseImportAmount(text)).toBe('');
    },
  );
});

describe('normaliseName', () => {
  it('trims and collapses inner spaces', () => {
    expect(normaliseName('  Corner   Bakery \t ')).toBe('Corner Bakery');
    expect(normaliseName('')).toBe('');
  });
});

describe('rowsFromCsv', () => {
  it('reads every data row in file order', () => {
    const rows = rowsFromCsv(
      [
        'Date,Description,Category,Account,Amount',
        '28/10/2026,Corner Bakery,groceries,visa,12.40',
        '2026-10-27,Harbour  Coffee,Coffee,Visa,-6.75',
      ].join('\n'),
      lookups,
    );
    expect(rows.map((r) => r.draft)).toEqual([
      {
        date: '2026-10-28',
        merchant: 'Corner Bakery',
        category: 'Groceries',
        account: 'Visa',
        amount: '12.40',
      },
      {
        date: '2026-10-27',
        merchant: 'Harbour Coffee',
        category: 'Coffee',
        account: 'Visa',
        amount: '6.75',
      },
    ]);
  });

  it('keeps an unknown name as written', () => {
    const [row] = rowsFromCsv(
      'Date,Merchant,Category,Account,Amount\n2026-10-01,Gym,Sport,Amex,20',
      lookups,
    );
    expect(row?.draft.category).toBe('Sport');
    expect(row?.draft.account).toBe('Amex');
  });

  it('leaves a missing column empty in every row', () => {
    const rows = rowsFromCsv(
      'Date,Merchant,Amount\n2026-10-01,Gym,20\n2026-10-02,Pool,5',
      lookups,
    );
    expect(rows.map((r) => [r.draft.category, r.draft.account])).toEqual([
      ['', ''],
      ['', ''],
    ]);
  });

  it('reads a file without a header in the fixed column order', () => {
    const rows = rowsFromCsv(
      '2026-10-01,Gym,Sport,Visa,20\n2026-10-02,Pool,Sport,Visa,5',
      lookups,
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]?.draft).toEqual({
      date: '2026-10-01',
      merchant: 'Gym',
      category: 'Sport',
      account: 'Visa',
      amount: '20.00',
    });
  });

  it('gives each row a unique, stable key', () => {
    const text = 'Date,Merchant,Amount\n2026-10-01,A,1\n2026-10-01,A,1';
    const keys = rowsFromCsv(text, lookups).map((r) => r.key);
    expect(new Set(keys).size).toBe(2);
    expect(rowsFromCsv(text, lookups).map((r) => r.key)).toEqual(keys);
  });

  it('fills short rows with empty values', () => {
    const [row] = rowsFromCsv(
      'Date,Merchant,Category,Account,Amount\n2026-10-01,Gym',
      lookups,
    );
    expect(row?.draft).toMatchObject({ category: '', account: '', amount: '' });
  });
});

describe('checkFile', () => {
  it('refuses a file that is not a CSV', () => {
    expect(checkFile({ name: 'photo.png', type: 'image/png', size: 10 })).toBe(
      'notCsv',
    );
  });

  it.each([
    { name: 'data.CSV', type: '', size: 10 },
    { name: 'export.txt', type: 'text/csv', size: 10 },
    { name: 'export.csv', type: 'application/vnd.ms-excel', size: 10 },
  ])('accepts $name ($type)', (file) => {
    expect(checkFile(file)).toBeNull();
  });

  it('refuses a file over 1 MB', () => {
    expect(
      checkFile({
        name: 'big.csv',
        type: 'text/csv',
        size: MAX_FILE_BYTES + 1,
      }),
    ).toBe('tooLarge');
    expect(
      checkFile({ name: 'ok.csv', type: 'text/csv', size: MAX_FILE_BYTES }),
    ).toBeNull();
  });
});

describe('readImport', () => {
  const header = 'Date,Merchant,Category,Account,Amount';
  const lines = (n: number) =>
    Array.from({ length: n }, (_, i) => `2026-10-01,Shop ${i},Car,Visa,1`);

  it('refuses an empty or header-only file', () => {
    expect(readImport('', lookups)).toEqual({ error: 'noRows' });
    expect(readImport(`${header}\n`, lookups)).toEqual({ error: 'noRows' });
  });

  it('refuses more than 1,000 data rows', () => {
    expect(
      readImport([header, ...lines(MAX_ROWS + 1)].join('\n'), lookups),
    ).toEqual({ error: 'tooLarge' });
  });

  it('accepts exactly 1,000 data rows', () => {
    const result = readImport([header, ...lines(MAX_ROWS)].join('\n'), lookups);
    expect('rows' in result && result.rows).toHaveLength(MAX_ROWS);
  });
});
