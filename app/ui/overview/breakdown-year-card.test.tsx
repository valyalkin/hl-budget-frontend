import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import BreakdownYearCard from '@/app/ui/overview/breakdown-year-card';
import { overviewData } from '@/app/ui/overview/test-support';

vi.mock('@/app/ui/charts/echart', () => ({
  default: ({ label }: { label: string }) => (
    <div role="img" aria-label={label} />
  ),
}));

afterEach(() => window.localStorage.clear());

describe('BreakdownYearCard (specs/011 US3)', () => {
  it('Spent by category: the year’s total, a ranked chart, then a table with shares', async () => {
    render(<BreakdownYearCard kind="category" data={overviewData()} />);
    const card = screen.getByRole('region', { name: 'Spent by category' });
    expect(within(card).getByText('$48,240')).toBeInTheDocument();
    expect(within(card).getByText('total spent in 2026')).toBeInTheDocument();
    expect(
      within(card).getByRole('img', {
        name: 'Bar chart of 2026 spending by category. Largest is Rent at $25,800.',
      }),
    ).toBeInTheDocument();

    await userEvent.click(within(card).getByRole('button', { name: 'Table' }));
    expect(window.localStorage.getItem('hlb.overview.categoryView')).toBe(
      'table',
    );
    const table = within(card).getByRole('table');
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((th) => th.textContent),
    ).toEqual(['Category', 'Spent', 'Share']);
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows.map((r) => r.textContent)).toEqual([
      'Rent$25,80053%',
      'Groceries$22,44047%',
    ]);
  });

  it('Spent by account: says where the money came from and keeps its own choice', async () => {
    window.localStorage.setItem('hlb.overview.categoryView', 'table');
    render(<BreakdownYearCard kind="account" data={overviewData()} />);
    const card = screen.getByRole('region', { name: 'Spent by account' });
    expect(
      within(card).getByText('Where the $48,240 came from'),
    ).toBeInTheDocument();
    expect(within(card).getByRole('button', { name: 'Chart' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await userEvent.click(within(card).getByRole('button', { name: 'Table' }));
    expect(window.localStorage.getItem('hlb.overview.accountView')).toBe(
      'table',
    );
    expect(within(card).getAllByRole('columnheader')[0]).toHaveTextContent(
      'Account',
    );
    expect(within(card).getAllByRole('row')[1]).toHaveTextContent(
      'Visa$40,00083%',
    );
  });

  it('says when nothing was spent in the year', () => {
    render(
      <BreakdownYearCard
        kind="category"
        data={overviewData({
          totals: { earnedCents: 5000, spentCents: 0, savedCents: 5000 },
          byCategory: [],
        })}
      />,
    );
    expect(screen.getByText('No spendings in 2026.')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
