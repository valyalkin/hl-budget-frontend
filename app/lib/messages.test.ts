import { describe, expect, it } from 'vitest';
import {
  ApiError,
  ApiUnavailableError,
  UnauthenticatedError,
} from '@/app/lib/definitions';
import {
  added,
  addLabel,
  fieldFor,
  MESSAGES,
  messageFor,
  needAttention,
  rowCount,
} from '@/app/lib/messages';

const problem = (
  status: number,
  extras: ConstructorParameters<typeof ApiError>[3] = {},
) => new ApiError(status, undefined, undefined, extras);

describe('messageFor', () => {
  it('words duplicate names with the name', () => {
    expect(
      messageFor(
        problem(409, {
          reason: 'duplicate-name',
          details: { reason: 'duplicate-name', name: 'Coffee' },
        }),
      ),
    ).toBe('“Coffee” already exists.');
  });

  it('words in-use refusals for categories and accounts, with the count', () => {
    const used = (n: number) =>
      problem(409, {
        reason: 'in-use',
        details: { reason: 'in-use', spendingCount: n },
      });
    expect(messageFor(used(3), { resource: 'category', name: 'Coffee' })).toBe(
      'Coffee is used by 3 spendings, so it can’t be removed.',
    );
    expect(messageFor(used(1), { resource: 'category', name: 'Coffee' })).toBe(
      'Coffee is used by 1 spending, so it can’t be removed.',
    );
    expect(messageFor(used(3), { resource: 'account', name: 'Visa' })).toBe(
      'Visa has 3 spendings, so it can’t be removed.',
    );
  });

  it('words the last-account and default-category rules', () => {
    expect(messageFor(problem(422, { reason: 'last-account' }))).toBe(
      'You need at least one account.',
    );
    expect(messageFor(problem(422, { reason: 'default-category' }))).toBe(
      'Default categories can’t be removed.',
    );
  });

  it('words a refused date', () => {
    expect(
      messageFor(
        problem(422, {
          errors: [{ field: 'date', message: 'must be today or earlier' }],
        }),
      ),
    ).toBe('Pick a date that is today or earlier.');
  });

  it('says an item no longer exists on 404', () => {
    expect(messageFor(problem(404))).toBe('This item no longer exists.');
  });

  it('says the server could not be reached otherwise', () => {
    for (const error of [
      new ApiUnavailableError(),
      problem(500),
      problem(503),
      new Error('boom'),
      new UnauthenticatedError(),
    ]) {
      expect(messageFor(error)).toBe(
        'Couldn’t reach the server. Your changes weren’t saved.',
      );
    }
  });

  it('keeps the local validation wording', () => {
    expect(MESSAGES).toMatchObject({
      pickDate: 'Pick a date.',
      merchant: 'Add a merchant name.',
      category: 'Choose or type a category.',
      account: 'Choose or type an account.',
      amount: 'Enter an amount greater than zero.',
      categoryName: 'Type a name for the category.',
      accountName: 'Type a name for the account.',
    });
  });
});

describe('fieldFor', () => {
  it('names the form field of the first invalid one', () => {
    expect(
      fieldFor(problem(422, { errors: [{ field: 'date', message: 'x' }] })),
    ).toBe('date');
    expect(
      fieldFor(
        problem(422, { errors: [{ field: 'amount.amount', message: 'x' }] }),
      ),
    ).toBe('amount');
    expect(
      fieldFor(
        problem(422, { errors: [{ field: 'categoryName', message: 'x' }] }),
      ),
    ).toBe('category');
    expect(fieldFor(new Error('x'))).toBeUndefined();
  });
});

describe('import messages', () => {
  it('words the file refusals as in the spec', () => {
    expect(MESSAGES.notCsv).toBe(
      'That doesn’t look like a CSV file. Choose a .csv export.',
    );
    expect(MESSAGES.unreadable).toBe('The file couldn’t be read. Try again.');
    expect(MESSAGES.noRows).toBe(
      'No spendings found in that file. Check that it is a CSV with a header row and at least one data row.',
    );
    expect(MESSAGES.tooLarge).toBe(
      'That file is too large. Import at most 1 MB and 1,000 rows at a time.',
    );
    expect(MESSAGES.alreadyImported).toBe(
      'These spendings were already added.',
    );
  });

  it('counts rows that need attention', () => {
    expect(needAttention(1)).toBe('1 row needs attention');
    expect(needAttention(4)).toBe('4 rows need attention');
  });

  it('confirms what was added', () => {
    expect(added(12, 'oct.csv')).toBe('Added 12 spendings from oct.csv');
    expect(added(1, 'one.csv')).toBe('Added 1 spending from one.csv');
  });

  it('labels the add button', () => {
    expect(addLabel(0)).toBe('Add spendings');
    expect(addLabel(1)).toBe('Add 1 spending');
    expect(addLabel(10)).toBe('Add 10 spendings');
  });

  it('counts rows with a thousands separator', () => {
    expect(rowCount(1)).toBe('1 row');
    expect(rowCount(10)).toBe('10 rows');
    expect(rowCount(1000)).toBe('1,000 rows');
  });
});
