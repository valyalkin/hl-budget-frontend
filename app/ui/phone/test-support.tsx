import { render } from '@testing-library/react';
import { type ReactElement, useEffect } from 'react';
import type { Spending } from '@/app/lib/definitions';
import type { PhoneData } from '@/app/ui/phone/phone-data';
import PhoneUiProvider, {
  type PhoneUi,
  usePhoneUi,
} from '@/app/ui/phone/phone-ui-provider';
import { ids, spendings, TODAY } from '@/mocks/fixtures';

/** Shared data for the phone component tests. */
export const categories = [
  { id: ids.groceries, name: 'Groceries', count: 10, isDefault: true },
  { id: ids.rent, name: 'Rent', count: 1, isDefault: true },
  { id: ids.gifts, name: 'Gifts', count: 1, isDefault: false },
  { id: ids.coffee, name: 'Coffee', count: 0, isDefault: false },
];
export const accounts = [
  { id: ids.visa, name: 'Visa', count: 12 },
  { id: ids.cash, name: 'Cash', count: 0 },
];
export const merchants = [
  {
    name: 'Neighbourhood Market',
    count: 12,
    lastCategory: { id: ids.groceries, name: 'Groceries' },
    lastAccount: { id: ids.visa, name: 'Visa' },
  },
];

export function phoneData(overrides: Partial<PhoneData> = {}): PhoneData {
  return {
    ym: { year: 2026, month: 10 },
    today: TODAY,
    currency: 'CAD',
    monthTotal: '2234.37',
    count: 2,
    spendings: spendings as Spending[],
    categoryTotals: {
      totalCents: 223437,
      items: [
        { id: ids.rent, name: 'Rent', cents: 215000 },
        { id: ids.groceries, name: 'Groceries', cents: 8437 },
      ],
    },
    categories,
    accounts,
    merchants,
    earliestYear: 2025,
    ...overrides,
  };
}

/** Renders inside the phone state provider, as the page does. */
export function renderPhone(ui: ReactElement) {
  return render(<PhoneUiProvider>{ui}</PhoneUiProvider>);
}

/** Waits for the history traversal jsdom runs after back() / go(). */
export function nextPopState(): Promise<void> {
  return new Promise((resolve) => {
    window.addEventListener('popstate', () => setTimeout(resolve, 0), {
      once: true,
    });
  });
}

/**
 * Hands the test the phone state after every render, and prints the open layers
 * (`edit>confirm-delete`, or `list`) and the notice as `layers|notice`.
 */
export function UiProbe({ onUi }: { onUi: (ui: PhoneUi) => void }) {
  const ui = usePhoneUi();
  useEffect(() => {
    onUi(ui);
  });
  return (
    <p data-testid="state">
      {ui.layers.map((layer) => layer.kind).join('>') || 'list'}|{ui.notice}
    </p>
  );
}
