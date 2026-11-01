import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import Breakdown, { type ChartView } from '@/app/ui/phone/breakdown';
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
].map((name, i) => ({
  id: name,
  name,
  cents: (8 - i) * 1000,
  color: `#10203${i}`,
}));

function Harness({
  kind,
  list,
}: {
  kind: 'category' | 'account';
  list: typeof items;
}) {
  const [view, setView] = useState<ChartView>('table');
  return (
    <Breakdown
      kind={kind}
      value={view}
      onChange={setView}
      label="October 2026"
      currency="CAD"
      totalCents={list.reduce((sum, item) => sum + item.cents, 0)}
      items={list}
    />
  );
}

function setup(list = items, kind: 'category' | 'account' = 'category') {
  renderPhone(<Harness kind={kind} list={list} />);
}

describe('Breakdown, by category', () => {
  it('Table lists every category with its share, and a total row', () => {
    setup();
    const table = screen.getByRole('table', { name: 'Spending by category' });
    const rows = within(table).getAllByRole('row');
    expect(rows).toHaveLength(1 + 8 + 1);
    expect(rows[1]).toHaveTextContent('Rent$80.0022%');
    expect(rows[9]).toHaveTextContent('Total$360.00100%');
    expect(within(rows[1]!).getByTestId('category-swatch')).toHaveStyle({
      backgroundColor: '#102030',
    });
  });

  it('Pie shows the 6 largest plus Everything else, with a legend', async () => {
    setup();
    await userEvent.click(screen.getByRole('button', { name: 'Pie' }));
    const chart = screen.getByRole('group', {
      name: 'Donut chart of October 2026 spending by category. Values are listed below.',
    });
    const slices = within(chart).getAllByRole('img');
    expect(slices).toHaveLength(7);
    // Each category in its own colour; the rest in grey (specs/007).
    expect(slices[0]).toHaveAttribute('fill', '#102030');
    expect(slices[0]).toHaveAccessibleName('Rent: $80.00, 22%');
    expect(slices[6]).toHaveAttribute('fill', '#8a908b');
    const legend = screen.getAllByRole('listitem');
    expect(legend).toHaveLength(7);
    expect(legend[6]).toHaveTextContent('Everything else$30.008%');
  });

  it('a tapped slice names its category in the centre', async () => {
    setup();
    await userEvent.click(screen.getByRole('button', { name: 'Pie' }));
    await userEvent.click(screen.getByRole('img', { name: /^Groceries:/ }));
    expect(screen.getByTestId('donut-centre')).toHaveTextContent(
      'Groceries$70.00 · 19%',
    );
  });

  it('says when there is nothing to break down', () => {
    setup([]);
    expect(
      screen.getByText('Nothing to break down in October 2026.'),
    ).toBeInTheDocument();
  });
});
