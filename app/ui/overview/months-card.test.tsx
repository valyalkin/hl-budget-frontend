import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import MonthsCard from '@/app/ui/overview/months-card';
import { monthRows, overviewData } from '@/app/ui/overview/test-support';

vi.mock('@/app/ui/charts/echart', () => ({
  default: ({ label }: { label: string }) => (
    <div role="img" aria-label={label} />
  ),
}));

const KEY = 'hlb.overview.monthsView';

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe('MonthsCard (specs/011 US2)', () => {
  it('shows the chart by default, with its legend and summary', () => {
    render(<MonthsCard data={overviewData()} />);
    const card = screen.getByRole('region', { name: 'Earned vs spent' });
    expect(within(card).getByText('Month by month, 2026')).toBeInTheDocument();
    const legend = within(card).getByRole('list', { name: 'Legend' });
    expect(
      within(legend)
        .getAllByRole('listitem')
        .map((li) => li.textContent?.trim()),
    ).toEqual(['Earned', 'Spent']);
    const group = within(card).getByRole('group', { name: 'Show as' });
    expect(
      within(group).getByRole('button', { name: 'Chart' }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      within(card).getByRole('img', {
        name: /^Column chart of money earned and spent/,
      }),
    ).toBeInTheDocument();
  });

  it('switches to a table by month with Net, and remembers the choice', async () => {
    render(<MonthsCard data={overviewData()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Table' }));
    expect(screen.getByRole('button', { name: 'Table' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(window.localStorage.getItem(KEY)).toBe('table');
    const table = screen.getByRole('table');
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((th) => th.textContent),
    ).toEqual(['Month', 'Earned', 'Spent', 'Net']);
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(10);
    expect(rows[0]).toHaveTextContent('Jan$6,100$4,800$1,300');
    expect(rows[1]).toHaveTextContent('Feb$0$0$0');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('shows a negative Net with a minus sign', async () => {
    window.localStorage.setItem(KEY, 'table');
    render(
      <MonthsCard
        data={overviewData({
          months: monthRows({ 1: [10000, 25000] }, 2),
          monthsElapsed: 2,
        })}
      />,
    );
    await screen.findByRole('table');
    expect(screen.getAllByRole('row')[1]).toHaveTextContent('−$150');
  });

  it('reads the remembered choice on mount', async () => {
    window.localStorage.setItem(KEY, 'table');
    render(<MonthsCard data={overviewData()} />);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Table' })).toHaveAttribute(
        'aria-pressed',
        'true',
      ),
    );
  });

  it('still works when storage is blocked', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    render(<MonthsCard data={overviewData()} />);
    expect(screen.getByRole('img')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Table' }));
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('says when nothing is recorded in the year', () => {
    render(
      <MonthsCard
        data={overviewData({
          totals: { earnedCents: 0, spentCents: 0, savedCents: 0 },
          months: monthRows({}, 10),
        })}
      />,
    );
    expect(screen.getByText('Nothing recorded in 2026.')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
