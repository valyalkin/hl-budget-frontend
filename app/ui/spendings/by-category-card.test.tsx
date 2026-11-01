import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ByCategoryCard from '@/app/ui/spendings/by-category-card';

const items = Array.from({ length: 12 }, (_, i) => ({
  id: `id-${i}`,
  name: `Category ${i + 1}`,
  cents: (12 - i) * 1000,
  color: `#a0b0${String(i).padStart(2, '0')}`,
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
