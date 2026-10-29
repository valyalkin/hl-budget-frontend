import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ByCategoryCard from '@/app/ui/spendings/by-category-card';
import { sliceColors } from '@/app/ui/spendings/category-colors';

const items = Array.from({ length: 12 }, (_, i) => ({
  id: `id-${i}`,
  name: `Category ${i + 1}`,
  cents: (12 - i) * 1000,
}));
const total = items.reduce((sum, item) => sum + item.cents, 0);

function renderCard(list = items) {
  render(
    <ByCategoryCard
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

describe('ByCategoryCard', () => {
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
      <ByCategoryCard
        label="October 2026"
        currency="CAD"
        totalCents={total}
        items={items}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Pie' }));
    // One slice per category, each naming itself with its amount and share.
    expect(
      within(screen.getByRole('img')).getAllByText(/^Category \d+: \$/),
    ).toHaveLength(12);
    expect(screen.queryByText(/Everything else/)).not.toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAccessibleName(
      /12 categories, largest Category 1/,
    );
    expect(
      within(screen.getByRole('list', { name: 'Legend' })).getAllByRole(
        'listitem',
      ),
    ).toHaveLength(12);
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

describe('sliceColors', () => {
  it('never gives neighbours the same colour, including last and first', () => {
    for (const count of [2, 12, 13, 24, 25]) {
      const colors = sliceColors(count);
      colors.forEach((color, i) => {
        expect(color).not.toBe(colors[(i + 1) % count]);
      });
    }
  });
});
