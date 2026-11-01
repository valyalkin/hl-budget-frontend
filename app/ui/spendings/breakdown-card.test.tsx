import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import BreakdownCard from '@/app/ui/spendings/breakdown-card';

const items = Array.from({ length: 12 }, (_, i) => ({
  id: `id-${i}`,
  name: `Category ${i + 1}`,
  cents: (12 - i) * 1000,
  color: `#a0b0${String(i).padStart(2, '0')}`,
}));
const total = items.reduce((sum, item) => sum + item.cents, 0);

function renderCard(list = items) {
  render(
    <BreakdownCard
      kind="category"
      label="October 2026"
      currency="CAD"
      totalCents={total}
      items={list}
    />,
  );
}

beforeEach(() => {
  window.localStorage.clear();
});

describe('BreakdownCard, by category', () => {
  it('starts as a table of every category with amount and share, and a total', () => {
    renderCard(items.slice(0, 2));
    expect(screen.getByRole('button', { name: 'Table' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    const rows = screen.getAllByRole('row');
    expect(within(rows[1]!).getByText('Category 1')).toBeInTheDocument();
    expect(within(rows[1]!).getByText('$120.00')).toBeInTheDocument();
    expect(within(rows[1]!).getByText('15%')).toBeInTheDocument();
    expect(
      screen.getByRole('rowheader', { name: 'Total' }),
    ).toBeInTheDocument();
  });

  it('as a pie shows one slice per category with no cap and no “Everything else”', async () => {
    render(
      <BreakdownCard
        kind="category"
        label="October 2026"
        currency="CAD"
        totalCents={total}
        items={items}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Pie' }));
    const chart = screen.getByRole('group', {
      name: /12 categories, largest Category 1/,
    });
    // One slice per category, each naming itself with its amount and share.
    const slices = within(chart).getAllByRole('img');
    expect(slices).toHaveLength(12);
    expect(slices[0]).toHaveAccessibleName('Category 1: $120.00, 15%');
    expect(screen.queryByText(/Everything else/)).not.toBeInTheDocument();
    expect(
      within(screen.getByRole('list', { name: 'Legend' })).getAllByRole(
        'listitem',
      ),
    ).toHaveLength(12);
  });

  it('draws every slice, legend swatch and table swatch in its category’s colour (specs/007)', async () => {
    renderCard();
    await userEvent.click(screen.getByRole('button', { name: 'Table' }));
    const tableSwatches = screen.getAllByTestId('category-swatch');
    expect(tableSwatches).toHaveLength(12);
    expect(tableSwatches[3]).toHaveStyle({ backgroundColor: '#a0b003' });

    await userEvent.click(screen.getByRole('button', { name: 'Pie' }));
    const slices = within(
      screen.getByRole('group', { name: /^Spending by category/ }),
    ).getAllByRole('img');
    const legend = screen.getAllByTestId('legend-swatch');
    items.forEach((item, i) => {
      expect(slices[i]).toHaveAttribute('fill', item.color);
      expect(legend[i]).toHaveStyle({ backgroundColor: item.color });
    });
    expect(document.body.innerHTML).not.toContain('var(--color-cat');
  });

  it('names a hovered slice’s category in the centre (specs/007 US2)', async () => {
    renderCard();
    await userEvent.click(screen.getByRole('button', { name: 'Pie' }));
    await userEvent.hover(screen.getByRole('img', { name: /^Category 3:/ }));
    expect(screen.getByTestId('donut-centre')).toHaveTextContent(
      'Category 3$100.00 · 13%',
    );
  });

  it('keeps the chosen view after a remount, even when storage throws', async () => {
    renderCard();
    await userEvent.click(screen.getByRole('button', { name: 'Pie' }));
    expect(window.localStorage.getItem('hlb.byCategoryView')).toBe('pie');

    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('private mode');
    });
    await userEvent.click(screen.getByRole('button', { name: 'Table' }));
    expect(screen.getByRole('button', { name: 'Table' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('says nothing was spent in an empty month', () => {
    renderCard([]);
    expect(
      screen.getByText('Nothing spent in October 2026.'),
    ).toBeInTheDocument();
  });
});

const accounts = [
  { id: 'debit', name: 'Debit card', cents: 215000, color: '#e11d48' },
  { id: 'amex', name: 'Amex', cents: 17644, color: '#0891b2' },
  { id: 'cash', name: 'Cash', cents: 2000, color: '#a855f7' },
];
const accountsTotal = accounts.reduce((sum, item) => sum + item.cents, 0);

function renderAccountCard(list = accounts) {
  render(
    <BreakdownCard
      kind="account"
      label="October 2026"
      currency="CAD"
      totalCents={accountsTotal}
      items={list}
    />,
  );
}

describe('BreakdownCard, by account (specs/008 US1)', () => {
  it('is headed By account and lists each account with amount, share and a total', () => {
    renderAccountCard();
    expect(
      screen.getByRole('region', { name: 'By account' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'Account' }),
    ).toBeInTheDocument();
    const rows = screen.getAllByRole('row');
    expect(rows).toHaveLength(1 + 3 + 1);
    expect(rows[1]).toHaveTextContent('Debit card$2,150.0092%');
    expect(rows[2]).toHaveTextContent('Amex$176.448%');
    expect(rows[4]).toHaveTextContent('Total$2,346.44100%');
  });

  it('as a pie shows one slice per account with no “Everything else”', async () => {
    renderAccountCard();
    await userEvent.click(screen.getByRole('button', { name: 'Pie' }));
    const chart = screen.getByRole('group', {
      name: 'Spending by account: 3 accounts, largest Debit card at 92%',
    });
    expect(within(chart).getAllByRole('img')).toHaveLength(3);
    expect(screen.queryByText(/Everything else/)).not.toBeInTheDocument();
    expect(
      within(screen.getByRole('list', { name: 'Legend' })).getAllByRole(
        'listitem',
      ),
    ).toHaveLength(3);
  });

  it('says nothing was spent in an empty month', () => {
    renderAccountCard([]);
    expect(
      screen.getByText('Nothing spent in October 2026.'),
    ).toBeInTheDocument();
  });

  it('keeps its own Table / Pie choice, apart from By category', async () => {
    render(
      <>
        <BreakdownCard
          kind="category"
          label="October 2026"
          currency="CAD"
          totalCents={total}
          items={items}
        />
        <BreakdownCard
          kind="account"
          label="October 2026"
          currency="CAD"
          totalCents={accountsTotal}
          items={accounts}
        />
      </>,
    );
    const accountCard = screen.getByRole('region', { name: 'By account' });
    const categoryCard = screen.getByRole('region', { name: 'By category' });
    await userEvent.click(
      within(accountCard).getByRole('button', { name: 'Pie' }),
    );

    expect(window.localStorage.getItem('hlb.byAccountView')).toBe('pie');
    expect(window.localStorage.getItem('hlb.byCategoryView')).toBeNull();
    expect(
      within(accountCard).getByRole('button', { name: 'Pie' }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      within(categoryCard).getByRole('button', { name: 'Table' }),
    ).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('BreakdownCard, by account: colours and slice labels (specs/008 US2)', () => {
  it('draws each account’s slice, legend swatch and table swatch in its own colour', async () => {
    renderAccountCard();
    // The choice is remembered in memory between tests, so pick Table explicitly.
    await userEvent.click(screen.getByRole('button', { name: 'Table' }));
    const tableSwatches = screen.getAllByTestId('account-swatch');
    expect(screen.queryAllByTestId('category-swatch')).toHaveLength(0);
    accounts.forEach((account, i) => {
      expect(tableSwatches[i]).toHaveStyle({ backgroundColor: account.color });
    });

    await userEvent.click(screen.getByRole('button', { name: 'Pie' }));
    const slices = within(
      screen.getByRole('group', { name: /^Spending by account/ }),
    ).getAllByRole('img');
    const legend = screen.getAllByTestId('account-legend-swatch');
    accounts.forEach((account, i) => {
      expect(slices[i]).toHaveAttribute('fill', account.color);
      expect(legend[i]).toHaveStyle({ backgroundColor: account.color });
    });
  });

  it('names a hovered slice’s account, amount and share in the centre', async () => {
    renderAccountCard();
    await userEvent.click(screen.getByRole('button', { name: 'Pie' }));
    await userEvent.hover(screen.getByRole('img', { name: /^Amex:/ }));
    expect(screen.getByTestId('donut-centre')).toHaveTextContent(
      'Amex$176.44 · 8%',
    );
  });

  it('gives a focused slice the same text for assistive technology', async () => {
    renderAccountCard();
    await userEvent.click(screen.getByRole('button', { name: 'Pie' }));
    const slice = screen.getByRole('img', { name: 'Cash: $20.00, 1%' });
    act(() => slice.focus());
    expect(slice).toHaveFocus();
    expect(screen.getByTestId('donut-centre')).toHaveTextContent(
      'Cash$20.00 · 1%',
    );
  });
});
