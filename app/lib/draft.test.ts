import { describe, expect, it } from 'vitest';
import { type Draft, draftProblem, draftProblems } from '@/app/lib/draft';

const TODAY = '2026-10-29';
const LOOKUPS = {
  categories: [{ name: 'Groceries' }, { name: 'Car' }],
  accounts: [{ name: 'Visa' }, { name: 'Amex' }],
};
const valid: Draft = {
  date: '2026-10-20',
  merchant: 'Corner Bakery',
  category: 'Groceries',
  account: 'Visa',
  amount: '12.40',
};
const empty: Draft = {
  date: '',
  merchant: '',
  category: '',
  account: '',
  amount: '',
};

describe('draftProblems', () => {
  it('finds nothing wrong with a valid draft', () => {
    expect(draftProblems(valid, TODAY, LOOKUPS)).toEqual({});
  });

  it('reports every field of an empty draft', () => {
    expect(draftProblems(empty, TODAY, LOOKUPS)).toEqual({
      date: 'Pick a date.',
      merchant: 'Add a merchant name.',
      category: 'Choose or type a category.',
      account: 'Choose or type an account.',
      amount: 'Enter an amount greater than zero.',
    });
  });

  it('refuses a future date', () => {
    expect(
      draftProblems({ ...valid, date: '2026-10-30' }, TODAY, LOOKUPS),
    ).toEqual({
      date: 'Pick a date that is today or earlier.',
    });
  });

  it('refuses names over their length limits', () => {
    const problems = draftProblems(
      {
        ...valid,
        merchant: 'm'.repeat(256),
        category: 'c'.repeat(51),
        account: 'a'.repeat(51),
      },
      TODAY,
      LOOKUPS,
    );
    expect(Object.keys(problems)).toEqual(['merchant', 'category', 'account']);
  });

  it('accepts names exactly at their limits', () => {
    expect(
      draftProblems(
        {
          ...valid,
          merchant: 'm'.repeat(255),
          category: 'c'.repeat(50),
          account: 'a'.repeat(50),
        },
        TODAY,
        {
          categories: [{ name: 'c'.repeat(50) }],
          accounts: [{ name: 'a'.repeat(50) }],
        },
      ),
    ).toEqual({});
  });
});

describe('draftProblem', () => {
  it('returns the first problem in field order', () => {
    expect(draftProblem(empty, TODAY, LOOKUPS)).toEqual({
      field: 'date',
      message: 'Pick a date.',
    });
    expect(
      draftProblem({ ...valid, account: '', amount: '0' }, TODAY, LOOKUPS),
    ).toEqual({ field: 'account', message: 'Choose or type an account.' });
  });

  it('returns null for a valid draft', () => {
    expect(draftProblem(valid, TODAY, LOOKUPS)).toBeNull();
  });
});

describe('names must be existing items (specs/007 FR-021, FR-022)', () => {
  it('flags a category that matches none of the user’s categories', () => {
    expect(
      draftProblems({ ...valid, category: 'Groceriess' }, TODAY, LOOKUPS),
    ).toEqual({ category: 'Not one of your categories' });
  });

  it('matches ignoring case and surrounding spaces', () => {
    expect(
      draftProblems(
        { ...valid, category: '  groceries ', account: 'AMEX' },
        TODAY,
        LOOKUPS,
      ),
    ).toEqual({});
  });

  it('flags an account that matches none of the user’s accounts', () => {
    expect(
      draftProblems({ ...valid, account: 'Visa Gold' }, TODAY, LOOKUPS),
    ).toEqual({ account: 'Not one of your accounts' });
  });

  it('keeps the empty and too-long messages', () => {
    expect(
      draftProblems(
        { ...valid, category: '', account: 'a'.repeat(51) },
        TODAY,
        LOOKUPS,
      ),
    ).toEqual({
      category: 'Choose or type a category.',
      account: 'Choose or type an account.',
    });
  });

  it('flags every account when the user has none', () => {
    expect(draftProblems(valid, TODAY, { ...LOOKUPS, accounts: [] })).toEqual({
      account: 'Not one of your accounts',
    });
  });

  it('draftProblem returns the first problem in field order', () => {
    expect(
      draftProblem(
        { ...valid, category: 'Coffee', account: 'Cash' },
        TODAY,
        LOOKUPS,
      ),
    ).toEqual({ field: 'category', message: 'Not one of your categories' });
  });
});
