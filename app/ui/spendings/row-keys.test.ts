import type { KeyboardEvent } from 'react';
import { describe, expect, it } from 'vitest';
import type { MerchantOption } from '@/app/lib/definitions';
import type { Draft } from '@/app/lib/draft';
import { ids } from '@/mocks/fixtures';
import {
  arrowStep,
  merchantFillIn,
  nextField,
} from '@/app/ui/spendings/row-keys';

function keyOn(
  element: HTMLElement,
  key: string,
  modifiers: Partial<
    Record<'shiftKey' | 'altKey' | 'ctrlKey' | 'metaKey', boolean>
  > = {},
): KeyboardEvent<HTMLElement> {
  return {
    key,
    shiftKey: false,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    ...modifiers,
    currentTarget: element,
  } as unknown as KeyboardEvent<HTMLElement>;
}

function input(value: string, start: number, end = start) {
  const element = document.createElement('input');
  element.value = value;
  element.setSelectionRange(start, end);
  return element;
}

describe('arrowStep', () => {
  it('leaves a button in either direction', () => {
    const button = document.createElement('button');
    expect(arrowStep(keyOn(button, 'ArrowRight'))).toBe(1);
    expect(arrowStep(keyOn(button, 'ArrowLeft'))).toBe(-1);
  });

  it('leaves a text field only from the matching end or a full selection', () => {
    expect(arrowStep(keyOn(input('Visa', 4), 'ArrowRight'))).toBe(1);
    expect(arrowStep(keyOn(input('Visa', 0), 'ArrowLeft'))).toBe(-1);
    expect(arrowStep(keyOn(input('Visa', 2), 'ArrowRight'))).toBe(0);
    expect(arrowStep(keyOn(input('Visa', 0), 'ArrowRight'))).toBe(0);
    expect(arrowStep(keyOn(input('Visa', 0, 4), 'ArrowLeft'))).toBe(-1);
  });

  it('ignores other keys and modified arrows', () => {
    const button = document.createElement('button');
    expect(arrowStep(keyOn(button, 'Enter'))).toBe(0);
    expect(arrowStep(keyOn(button, 'ArrowRight', { shiftKey: true }))).toBe(0);
    expect(arrowStep(keyOn(button, 'ArrowLeft', { metaKey: true }))).toBe(0);
  });
});

describe('nextField', () => {
  it('follows the order date, merchant, category, account, amount', () => {
    expect(nextField('date', 1)).toBe('merchant');
    expect(nextField('account', 1)).toBe('amount');
    expect(nextField('amount', 1)).toBeUndefined();
    expect(nextField('merchant', -1)).toBe('date');
    expect(nextField('date', -1)).toBeUndefined();
  });
});

describe('merchantFillIn', () => {
  const merchants: MerchantOption[] = [
    {
      name: 'Neighbourhood Market',
      count: 12,
      lastCategory: { id: ids.groceries, name: 'Groceries' },
      lastAccount: { id: ids.visa, name: 'Visa' },
    },
  ];
  const draft: Draft = {
    date: '2026-10-20',
    merchant: 'Neighbourhood Market',
    category: '',
    account: '',
    amount: '',
  };

  it('fills an empty category and account from the merchant’s latest spending', () => {
    expect(merchantFillIn(draft, 'neighbourhood market', merchants)).toEqual({
      category: 'Groceries',
      account: 'Visa',
    });
  });

  it('never replaces a value that is already there', () => {
    expect(
      merchantFillIn(
        { ...draft, category: 'Gifts', account: ' Cash ' },
        'Neighbourhood Market',
        merchants,
      ),
    ).toEqual({});
    expect(
      merchantFillIn(
        { ...draft, category: 'Gifts' },
        'Neighbourhood Market',
        merchants,
      ),
    ).toEqual({ account: 'Visa' });
  });

  it('fills nothing for a merchant never recorded', () => {
    expect(merchantFillIn(draft, 'New Shop', merchants)).toEqual({});
  });
});
