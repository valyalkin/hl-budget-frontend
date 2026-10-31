import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PhoneApp from '@/app/ui/phone/phone-app';
import { phoneData, renderPhone } from '@/app/ui/phone/test-support';

vi.mock('@/app/lib/actions', () => ({
  saveSpending: vi.fn(),
  deleteSpending: vi.fn(async () => ({ status: 'ok' })),
  importSpendings: vi.fn(),
  createCategory: vi.fn(),
  deleteCategory: vi.fn(),
  createAccount: vi.fn(),
  deleteAccount: vi.fn(),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

beforeEach(() => window.history.replaceState(null, '', '/spendings'));

describe('PhoneApp', () => {
  it('shows the month with its list, and By category on demand', async () => {
    renderPhone(<PhoneApp data={phoneData()} />);
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 1, name: 'October 2026' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /^Oct 27, Neighbourhood Market/ }),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'By category' }));
    expect(
      screen.getByRole('table', { name: 'Spending by category' }),
    ).toBeInTheDocument();
  });

  it('opens a spending prefilled, and deletes it through the sheet', async () => {
    renderPhone(<PhoneApp data={phoneData()} />);
    await userEvent.click(
      screen.getByRole('button', { name: /^Oct 27, Neighbourhood Market/ }),
    );
    expect(screen.getByRole('textbox', { name: 'Amount (CAD)' })).toHaveValue(
      '84.37',
    );
    expect(screen.getByRole('combobox', { name: 'Merchant' })).toHaveValue(
      'Neighbourhood Market',
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Delete spending' }),
    );
    const sheet = screen.getByRole('alertdialog', {
      name: 'Delete this spending?',
    });
    await userEvent.click(
      within(sheet).getByRole('button', { name: 'Delete spending' }),
    );
    expect(
      await screen.findByText('Deleted Neighbourhood Market · $84.37'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens a new spending dated today in the current month', async () => {
    renderPhone(<PhoneApp data={phoneData()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Add spending' }));
    expect(
      screen.getByRole('dialog', { name: 'New spending' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Date/ })).toHaveAccessibleName(
      'Date Oct 28, 2026',
    );
  });

  it('dates a new spending on the 1st when a past month is shown', async () => {
    renderPhone(
      <PhoneApp
        data={phoneData({ ym: { year: 2026, month: 9 }, spendings: [] })}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Add spending' }));
    expect(screen.getByRole('button', { name: /^Date/ })).toHaveAccessibleName(
      'Date Sep 1, 2026',
    );
  });

  it('goes from the menu to Settings and back to the list', async () => {
    renderPhone(<PhoneApp data={phoneData()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Account menu' }));
    await userEvent.click(screen.getByRole('button', { name: 'Settings' }));
    expect(
      screen.getByRole('dialog', { name: 'Settings' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('dialog', { name: 'Account menu' }),
    ).not.toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Close settings' }),
    );
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
  });

  it('fixes an import row and removes another before adding', async () => {
    renderPhone(<PhoneApp data={phoneData()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Account menu' }));
    await userEvent.click(screen.getByRole('button', { name: 'Import CSV' }));
    const file = new File(
      [
        'Date,Merchant,Category,Account,Amount\n2026-10-27,Dr. Patel Dental,,Visa,185.00\n2026-10-24,Thrift & Co.,Clothes,Visa,\n',
      ],
      'oct.csv',
      { type: 'text/csv' },
    );
    await userEvent.upload(screen.getByLabelText('Choose a CSV file'), file);
    expect(
      await screen.findByRole('dialog', { name: 'Review import' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      '2 rows need attention',
    );

    await userEvent.click(
      screen.getByRole('button', { name: /^Dr\. Patel Dental/ }),
    );
    await userEvent.type(
      screen.getByRole('combobox', { name: 'Category' }),
      'Health',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Save row' }));
    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: 'Fix row' }),
      ).not.toBeInTheDocument(),
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      '1 row needs attention',
    );

    await userEvent.click(
      screen.getByRole('button', { name: /^Thrift & Co\./ }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Remove row' }));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'All rows look good',
      ),
    );
    expect(
      screen.getByRole('button', { name: 'Add 1 spending' }),
    ).toBeEnabled();
  });
});
