import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { monthlyTotals, TODAY } from '@/mocks/fixtures';
import MonthLine from '@/app/ui/spendings/month-line';

describe('MonthLine', () => {
  it('shows twelve months with totals, the selected one current and future ones disabled', () => {
    render(
      <MonthLine
        totals={monthlyTotals()}
        selected={{ year: 2026, month: 10 }}
        today={TODAY}
      />,
    );
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(12);
    const october = within(items[9]!).getByRole('link');
    expect(october).toHaveAttribute('aria-current', 'date');
    expect(october).toHaveTextContent('Oct$2,234');
    expect(within(items[0]!).getByRole('link')).toHaveTextContent('Jan—');
    expect(within(items[0]!).getByRole('link')).toHaveAttribute(
      'href',
      '/spendings?month=2026-01',
    );
    expect(within(items[10]!).getByRole('button')).toBeDisabled();
    expect(within(items[11]!).queryByRole('link')).not.toBeInTheDocument();
  });

  it('goes back a year, but not past today’s year', () => {
    render(
      <MonthLine
        totals={monthlyTotals()}
        selected={{ year: 2026, month: 10 }}
        today={TODAY}
      />,
    );
    expect(screen.getByRole('link', { name: 'Previous year' })).toHaveAttribute(
      'href',
      '/spendings?month=2025-12',
    );
    expect(screen.getByRole('button', { name: 'Next year' })).toBeDisabled();
  });

  it('from an earlier year, next year leads back toward today', () => {
    render(
      <MonthLine
        totals={monthlyTotals(2025)}
        selected={{ year: 2025, month: 3 }}
        today={TODAY}
      />,
    );
    expect(screen.getByRole('link', { name: 'Next year' })).toHaveAttribute(
      'href',
      '/spendings?month=2026-10',
    );
    expect(screen.queryAllByRole('button', { name: /^(?!Next)/ })).toHaveLength(
      0,
    );
  });
});
