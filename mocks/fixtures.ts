import type {
  AccountList,
  CategoryList,
  CategoryTotals,
  MerchantList,
  MonthlyTotals,
  Spending,
  SpendingPage,
} from '@/app/lib/definitions';

/** Test data shaped exactly like the API's responses (types come from the generated contract). */
export const TODAY = '2026-10-28';

export const ids = {
  groceries: '2c8e4f6a-1b3d-4e5f-9a7b-8c0d1e2f3a55',
  rent: '5b1e2c3d-4f5a-4b6c-8d7e-9f0a1b2c3d44',
  coffee: '7e4b1c9a-3d2f-4a6e-b8c1-2d9f0e5a6b44',
  gifts: '8f5c2d0b-4e3a-4b7f-9c2d-3e0a1f6b7c55',
  visa: '3f1c5a8e-2b7d-4e0a-9c61-0d2f4b8a7e11',
  cash: '9b2e7c41-6a3f-4d58-8e1b-5c7a0f9d3b22',
  spending1: '8d3a6b1f-4c2e-4f7a-9b0d-1e2c3a4b5c66',
  spending2: '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d',
} as const;

const cad = (amount: string) => ({ amount, currency: 'CAD' });

export function monthlyTotals(year = 2026): MonthlyTotals {
  return {
    year,
    today: TODAY,
    months: Array.from({ length: 12 }, (_, i) => {
      const month = `${year}-${String(i + 1).padStart(2, '0')}`;
      if (year === 2026 && i === 9)
        return { month, total: cad('2234.37'), spendingCount: 2 };
      if (year === 2026 && i === 8)
        return { month, total: cad('2741.10'), spendingCount: 22 };
      return { month, total: cad('0.00'), spendingCount: 0 };
    }),
  };
}

export const spendings: Spending[] = [
  {
    id: ids.spending1,
    date: '2026-10-27',
    merchant: 'Neighbourhood Market',
    amount: cad('84.37'),
    category: { id: ids.groceries, name: 'Groceries' },
    account: { id: ids.visa, name: 'Visa' },
    createdAt: '2026-10-27T14:03:11Z',
    updatedAt: '2026-10-27T14:03:11Z',
  },
  {
    id: ids.spending2,
    date: '2026-10-01',
    merchant: 'Rent — Unit 4B',
    amount: cad('2150.00'),
    category: { id: ids.rent, name: 'Rent' },
    account: { id: ids.cash, name: 'Cash' },
    createdAt: '2026-10-01T09:00:00Z',
    updatedAt: '2026-10-01T09:00:00Z',
  },
];

export function spendingPage(
  items: Spending[] = spendings,
  page = 0,
  totalPages = 1,
): SpendingPage {
  return { items, page, size: 100, totalItems: items.length, totalPages };
}

export const categoryTotals: CategoryTotals = {
  from: '2026-10-01',
  to: '2026-10-31',
  total: cad('2234.37'),
  spendingCount: 2,
  items: [
    {
      category: { id: ids.rent, name: 'Rent' },
      total: cad('2150.00'),
      spendingCount: 1,
    },
    {
      category: { id: ids.groceries, name: 'Groceries' },
      total: cad('84.37'),
      spendingCount: 1,
    },
  ],
};

export const categoryList: CategoryList = {
  items: [
    {
      id: ids.groceries,
      name: 'Groceries',
      isDefault: true,
      spendingCount: 10,
    },
    { id: ids.rent, name: 'Rent', isDefault: true, spendingCount: 1 },
    { id: ids.coffee, name: 'Coffee', isDefault: false, spendingCount: 3 },
    { id: ids.gifts, name: 'Gifts', isDefault: false, spendingCount: 0 },
  ],
};

export const accountList: AccountList = {
  items: [
    { id: ids.visa, name: 'Visa', spendingCount: 12 },
    { id: ids.cash, name: 'Cash', spendingCount: 0 },
  ],
};

export const merchantList: MerchantList = {
  truncated: false,
  items: [
    {
      name: 'Neighbourhood Market',
      spendingCount: 12,
      lastUsedOn: '2026-10-27',
      lastCategory: { id: ids.groceries, name: 'Groceries' },
      lastAccount: { id: ids.visa, name: 'Visa' },
    },
  ],
};
