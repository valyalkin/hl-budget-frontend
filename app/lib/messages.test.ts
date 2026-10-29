import { describe, expect, it } from 'vitest';
import {
  ApiError,
  ApiUnavailableError,
  UnauthenticatedError,
} from '@/app/lib/definitions';
import { fieldFor, MESSAGES, messageFor } from '@/app/lib/messages';

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
