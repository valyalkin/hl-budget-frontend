import { describe, expect, it } from 'vitest';
import { type Draft, draftProblem, draftProblems } from '@/app/lib/draft';

const TODAY = '2026-10-29';
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
    expect(draftProblems(valid, TODAY)).toEqual({});
  });

  it('reports every field of an empty draft', () => {
    expect(draftProblems(empty, TODAY)).toEqual({
      date: 'Pick a date.',
      merchant: 'Add a merchant name.',
      category: 'Choose or type a category.',
      account: 'Choose or type an account.',
      amount: 'Enter an amount greater than zero.',
    });
  });

  it('refuses a future date', () => {
    expect(draftProblems({ ...valid, date: '2026-10-30' }, TODAY)).toEqual({
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
      ),
    ).toEqual({});
  });
});

describe('draftProblem', () => {
  it('returns the first problem in field order', () => {
    expect(draftProblem(empty, TODAY)).toEqual({
      field: 'date',
      message: 'Pick a date.',
    });
    expect(draftProblem({ ...valid, account: '', amount: '0' }, TODAY)).toEqual(
      { field: 'account', message: 'Choose or type an account.' },
    );
  });

  it('returns null for a valid draft', () => {
    expect(draftProblem(valid, TODAY)).toBeNull();
  });
});
