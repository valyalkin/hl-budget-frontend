import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import CategoryBreakdown from '@/app/ui/phone/category-breakdown';
import { renderPhone } from '@/app/ui/phone/test-support';

const items = [
  'Rent',
  'Groceries',
  'Bills',
  'Car',
  'Pet',
  'Health',
  'Taxi',
  'Sport',
].map((name, i) => ({ id: name, name, cents: (8 - i) * 1000 }));
const total = items.reduce((sum, item) => sum + item.cents, 0);

function setup(list = items) {
  renderPhone(
    <CategoryBreakdown
      label="October 2026"
      currency="CAD"
      totalCents={total}
      items={list}
    />,
  );
}

describe('CategoryBreakdown', () => {
  it('Table lists every category with its share, and a total row', () => {
    setup();
    const table = screen.getByRole('table', { name: 'Spending by category' });
    const rows = within(table).getAllByRole('row');
    expect(rows).toHaveLength(1 + 8 + 1);
    expect(rows[1]).toHaveTextContent('Rent$80.0022%');
    expect(rows[9]).toHaveTextContent('Total$360.00100%');
  });

  it('Pie shows the 6 largest plus Everything else, with a legend', async () => {
    setup();
    await userEvent.click(screen.getByRole('button', { name: 'Pie' }));
    expect(
      screen.getByRole('img', {
        name: 'Donut chart of October 2026 spending by category. Values are listed below.',
      }),
    ).toBeInTheDocument();
    const legend = screen.getAllByRole('listitem');
    expect(legend).toHaveLength(7);
    expect(legend[6]).toHaveTextContent('Everything else$30.008%');
  });

  it('says when there is nothing to break down', () => {
    setup([]);
    expect(
      screen.getByText('Nothing to break down in October 2026.'),
    ).toBeInTheDocument();
  });
});
