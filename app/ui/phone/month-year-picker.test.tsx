import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import MonthYearPicker from '@/app/ui/phone/month-year-picker';
import PhoneHeader from '@/app/ui/phone/phone-header';
import { renderPhone } from '@/app/ui/phone/test-support';

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
}));

function renderPicker(ym = { year: 2026, month: 10 }) {
  renderPhone(
    <MonthYearPicker
      ym={ym}
      today="2026-10-28"
      earliestYear={2025}
      monthTotal="2234.37"
      currency="CAD"
      count={2}
    />,
  );
}

describe('PhoneHeader', () => {
  it('shows the app name and an Account menu button', () => {
    renderPhone(<PhoneHeader />);
    expect(screen.getByText('HL-Budget')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Account menu' }),
    ).toHaveAttribute('aria-haspopup', 'dialog');
  });
});

describe('MonthYearPicker', () => {
  it('shows the month and year, the total and the count', () => {
    renderPicker();
    expect(screen.getByRole('combobox', { name: 'Month' })).toHaveValue('10');
    expect(screen.getByRole('combobox', { name: 'Year' })).toHaveValue('2026');
    expect(screen.getByText('$2,234.37')).toBeInTheDocument();
    expect(screen.getByText('2 spendings')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'November' })).toBeDisabled();
    expect(
      screen
        .getAllByRole('option', { name: /^20\d\d$/ })
        .map((o) => o.textContent),
    ).toEqual(['2026', '2025']);
  });

  it('navigates to the chosen month', async () => {
    renderPicker();
    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: 'Month' }),
      '9',
    );
    expect(push).toHaveBeenCalledWith('/spendings?month=2026-09', {
      scroll: false,
    });
  });

  it('a later month in a past year becomes today’s month in the current year', async () => {
    renderPicker({ year: 2025, month: 12 });
    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: 'Year' }),
      '2026',
    );
    expect(push).toHaveBeenCalledWith('/spendings?month=2026-10', {
      scroll: false,
    });
  });

  it('switches between Spendings and By category', async () => {
    renderPicker();
    const byCategory = screen.getByRole('button', { name: 'By category' });
    expect(screen.getByRole('button', { name: 'Spendings' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await userEvent.click(byCategory);
    expect(byCategory).toHaveAttribute('aria-pressed', 'true');
  });

  it('uses 16px text in both dropdowns (no zoom on iOS)', () => {
    renderPicker();
    for (const name of ['Month', 'Year']) {
      expect(screen.getByRole('combobox', { name })).toHaveClass('text-base');
    }
  });
});
