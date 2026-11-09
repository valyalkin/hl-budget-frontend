import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LedgerTabs from '@/app/ui/ledger-tabs';

const search = { month: null as string | null };

vi.mock('next/navigation', () => ({
  useSearchParams: () =>
    new URLSearchParams(search.month ? `month=${search.month}` : ''),
}));

function links() {
  const nav = screen.getByRole('navigation', { name: 'Main' });
  return within(nav).getAllByRole('link');
}

describe('LedgerTabs (specs/011 R-003)', () => {
  beforeEach(() => {
    search.month = null;
  });

  it.each(['nav', 'segmented'] as const)(
    '%s: Spendings, Income and Overview, in that order',
    (variant) => {
      render(<LedgerTabs current="spendings" variant={variant} />);
      expect(links().map((link) => link.textContent)).toEqual([
        'Spendings',
        'Income',
        'Overview',
      ]);
    },
  );

  it('marks Overview as the page being shown', () => {
    render(<LedgerTabs current="overview" variant="nav" />);
    expect(screen.getByRole('link', { name: 'Overview' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('link', { name: 'Spendings' })).not.toHaveAttribute(
      'aria-current',
    );
  });

  it('keeps ?month= on every tab, Overview included', () => {
    search.month = '2026-03';
    render(<LedgerTabs current="income" variant="segmented" />);
    expect(links().map((link) => link.getAttribute('href'))).toEqual([
      '/spendings?month=2026-03',
      '/income?month=2026-03',
      '/overview?month=2026-03',
    ]);
  });

  it('links to the bare routes without a month', () => {
    render(<LedgerTabs current="income" variant="nav" />);
    expect(links().map((link) => link.getAttribute('href'))).toEqual([
      '/spendings',
      '/income',
      '/overview',
    ]);
  });
});
