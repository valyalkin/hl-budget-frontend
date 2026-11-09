import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import MonthYearPicker from '@/app/ui/phone/month-year-picker';
import PhoneHeader from '@/app/ui/phone/phone-header';
import { LedgerProvider } from '@/app/ui/ledger-context';
import { renderPhone } from '@/app/ui/phone/test-support';
import { TODAY } from '@/mocks/fixtures';

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams('month=2026-09'),
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

  it('switches between Spendings and Income, keeping the month (specs/009)', () => {
    renderPhone(
      <LedgerProvider ledger="income">
        <PhoneHeader />
      </LedgerProvider>,
    );
    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(within(nav).getByRole('link', { name: 'Income' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(
      within(nav).getByRole('link', { name: 'Spendings' }),
    ).toHaveAttribute('href', '/spendings?month=2026-09');
  });

  it('offers Overview third and marks it current when told to (specs/011)', () => {
    renderPhone(<PhoneHeader current="overview" />);
    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(
      within(nav)
        .getAllByRole('link')
        .map((l) => l.textContent),
    ).toEqual(['Spendings', 'Income', 'Overview']);
    expect(within(nav).getByRole('link', { name: 'Overview' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(nav).getByRole('link', { name: 'Overview' })).toHaveAttribute(
      'href',
      '/overview?month=2026-09',
    );
  });
});

describe('MonthYearPicker for income (specs/009)', () => {
  it('counts entries and offers the Income view', () => {
    renderPhone(
      <LedgerProvider ledger="income">
        <MonthYearPicker
          ym={{ year: 2026, month: 10 }}
          today={TODAY}
          earliestYear={2025}
          monthTotal="5120.25"
          currency="CAD"
          count={2}
        />
      </LedgerProvider>,
    );
    expect(screen.getByText('2 entries')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Income' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
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

  it('offers By account as the third option of the switch (specs/008 FR-015)', async () => {
    renderPicker();
    const view = screen.getByRole('group', { name: 'View' });
    expect(
      within(view)
        .getAllByRole('button')
        .map((button) => button.textContent),
    ).toEqual(['Spendings', 'By category', 'By account']);
    const byAccount = within(view).getByRole('button', { name: 'By account' });
    await userEvent.click(byAccount);
    expect(byAccount).toHaveAttribute('aria-pressed', 'true');
    expect(
      within(view).getByRole('button', { name: 'By category' }),
    ).toHaveAttribute('aria-pressed', 'false');
  });

  it('uses 16px text in both dropdowns (no zoom on iOS)', () => {
    renderPicker();
    for (const name of ['Month', 'Year']) {
      expect(screen.getByRole('combobox', { name })).toHaveClass('text-base');
    }
  });
});
