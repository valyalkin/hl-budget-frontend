import type { ImportRow } from '@/app/lib/csv-import';
import type { Draft } from '@/app/lib/draft';
import { ids, TODAY } from '@/mocks/fixtures';
import type { ImportLookups } from '@/app/ui/import/import-provider';

/** Shared data for the import component tests. */
export const lookups: ImportLookups = {
  categories: [
    { id: ids.groceries, name: 'Groceries', count: 10 },
    { id: ids.gifts, name: 'Gifts', count: 1 },
    { id: ids.coffee, name: 'Coffee', count: 3 },
  ],
  accounts: [
    { id: ids.visa, name: 'Visa', count: 12 },
    { id: ids.cash, name: 'Cash', count: 2 },
  ],
  merchants: [
    {
      name: 'Neighbourhood Market',
      count: 12,
      lastCategory: { id: ids.groceries, name: 'Groceries' },
      lastAccount: { id: ids.visa, name: 'Visa' },
    },
  ],
  today: TODAY,
  currency: 'CAD',
};

export function draft(overrides: Partial<Draft> = {}): Draft {
  return {
    date: '2026-10-20',
    merchant: 'Corner Bakery',
    category: 'Groceries',
    account: 'Visa',
    amount: '12.40',
    ...overrides,
  };
}

export function rows(...drafts: Partial<Draft>[]): ImportRow[] {
  return drafts.map((overrides, index) => ({
    key: `r${index + 1}`,
    draft: draft(overrides),
  }));
}
