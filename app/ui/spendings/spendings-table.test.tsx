import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ids, spendings, TODAY } from '@/mocks/fixtures';
import ImportCsvButton from '@/app/ui/import/import-csv-button';
import ImportProvider from '@/app/ui/import/import-provider';
import { lookups } from '@/app/ui/import/test-support';
import SpendingsTable from '@/app/ui/spendings/spendings-table';
import { LedgerProvider } from '@/app/ui/ledger-context';

const { deleteSpending, saveSpending, push, replace } = vi.hoisted(() => ({
  deleteSpending: vi.fn(),
  saveSpending: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
}));
vi.mock('@/app/lib/actions', () => ({ deleteSpending, saveSpending }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace, refresh: vi.fn() }),
}));

function renderTable(rows = spendings) {
  render(
    <SpendingsTable
      spendings={rows}
      monthTotal={{ amount: '2234.37', currency: 'CAD' }}
      ym={{ year: 2026, month: 10 }}
      today={TODAY}
      currency="CAD"
      categories={[{ id: ids.groceries, name: 'Groceries', count: 10 }]}
      accounts={[{ id: ids.visa, name: 'Visa', count: 12 }]}
      merchants={[]}
    />,
  );
}

beforeEach(() => {
  deleteSpending.mockResolvedValue({ status: 'ok' });
  saveSpending.mockResolvedValue({ status: 'ok', month: '2026-10' });
});

describe('SpendingsTable', () => {
  it('lists the month in columns, newest first, with a count and total footer', () => {
    renderTable();
    const headers = screen
      .getAllByRole('columnheader')
      .map((h) => h.textContent);
    expect(headers.slice(0, 5)).toEqual([
      'Date',
      'Merchant',
      'Category',
      'Account',
      'Amount',
    ]);
    const rows = screen.getAllByRole('row').slice(1);
    expect(within(rows[0]!).getByText('Oct 27')).toBeInTheDocument();
    expect(within(rows[0]!).getByText('$84.37')).toBeInTheDocument();
    expect(within(rows[1]!).getByTitle('Rent — Unit 4B')).toBeInTheDocument();
    expect(screen.getByText('2 spendings')).toBeInTheDocument();
    expect(screen.getByText('$2,234.37')).toBeInTheDocument();
  });

  it('Enter with nothing focused opens a new row, but not while something has focus', async () => {
    renderTable();
    screen.getByRole('button', { name: 'Add a spending row' }).focus();
    screen.getByRole('button', { name: 'Add a spending row' }).blur();
    await userEvent.keyboard('{Enter}');
    expect(
      screen.getByRole('dialog', { name: 'Choose date' }),
    ).toBeInTheDocument();

    // Cancelling returns to the page, where Enter opens a row again.
    await userEvent.keyboard('{Escape}{Escape}');
    expect(screen.queryByRole('button', { name: 'Save spending' })).toBeNull();
    await userEvent.keyboard('{Enter}');
    expect(
      screen.getByRole('button', { name: 'Save spending' }),
    ).toBeInTheDocument();
  });

  it('Enter on a focused control keeps its own meaning', async () => {
    renderTable();
    const edit = screen.getAllByRole('button', { name: /^Edit / })[0]!;
    edit.focus();
    await userEvent.keyboard('{Enter}');
    expect(
      screen.getByRole('button', { name: 'Save changes' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save spending' })).toBeNull();
  });

  it('shows the empty message and no footer for an empty month', () => {
    renderTable([]);
    expect(
      screen.getByText('No spendings recorded in October 2026.'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/spendings?$/)).not.toBeInTheDocument();
  });

  it('every row has edit and remove buttons that keyboard users reach too', async () => {
    renderTable();
    await userEvent.tab(); // +
    await userEvent.tab(); // the row's date (specs/010)
    expect(screen.getByRole('button', { name: 'Add on Oct 27' })).toHaveFocus();
    await userEvent.tab();
    expect(
      screen.getByRole('button', {
        name: 'Edit Neighbourhood Market on Oct 27',
      }),
    ).toHaveFocus();
    expect(
      screen.getByRole('button', { name: 'Remove Rent — Unit 4B on Oct 1' }),
    ).toBeInTheDocument();
  });

  it('+ opens one row at the top with today, and locks the other actions', async () => {
    renderTable();
    await userEvent.click(
      screen.getByRole('button', { name: 'Add a spending row' }),
    );
    expect(
      screen.getByRole('button', { name: /^Date Oct 28, 2026/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Add a spending row' }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', {
        name: 'Edit Neighbourhood Market on Oct 27',
      }),
    ).toBeDisabled();
    await userEvent.click(
      screen.getByRole('button', { name: 'Cancel new spending' }),
    );
    expect(
      screen.getByRole('button', { name: 'Add a spending row' }),
    ).toBeEnabled();
  });

  it('edit opens the row in place with its values; cancel brings the original back', async () => {
    renderTable();
    await userEvent.click(
      screen.getByRole('button', {
        name: 'Edit Neighbourhood Market on Oct 27',
      }),
    );
    expect(screen.getByRole('combobox', { name: 'Merchant' })).toHaveValue(
      'Neighbourhood Market',
    );
    expect(screen.getByRole('combobox', { name: 'Category' })).toHaveValue(
      'Groceries',
    );
    expect(screen.getByRole('textbox', { name: 'Amount in CAD' })).toHaveValue(
      '84.37',
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Cancel changes' }),
    );
    expect(screen.getByText('Neighbourhood Market')).toBeInTheDocument();
  });

  it('saving into another month goes to that month', async () => {
    saveSpending.mockResolvedValue({ status: 'ok', month: '2026-09' });
    renderTable();
    await userEvent.click(
      screen.getByRole('button', {
        name: 'Edit Neighbourhood Market on Oct 27',
      }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() =>
      expect(push).toHaveBeenCalledWith('/spendings?month=2026-09'),
    );
  });

  it('a row’s date opens one new row on that date, calendar closed, focus in Merchant (specs/010)', async () => {
    renderTable();
    await userEvent.click(screen.getByRole('button', { name: 'Add on Oct 1' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Merchant' })).toHaveFocus();
    const rows = screen.getAllByRole('row');
    expect(
      within(rows[1]!).getByRole('button', { name: /Open calendar$/ }),
    ).toHaveAccessibleName(/Oct 1, 2026/);
    expect(
      screen.getAllByRole('button', { name: 'Save spending' }),
    ).toHaveLength(1);

    // While the row is open no date adds; Escape brings them back.
    expect(screen.queryByRole('button', { name: /^Add on / })).toBeNull();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('button', { name: 'Save spending' })).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Add on Oct 27' }),
    ).toBeInTheDocument();
  });

  it('no date adds while an edit row is open (specs/010)', async () => {
    renderTable();
    await userEvent.click(
      screen.getByRole('button', { name: 'Edit Rent — Unit 4B on Oct 1' }),
    );
    expect(screen.queryByRole('button', { name: /^Add on / })).toBeNull();
  });

  it('remove deletes at once, with no confirmation', async () => {
    renderTable();
    await userEvent.click(
      screen.getByRole('button', {
        name: 'Remove Neighbourhood Market on Oct 27',
      }),
    );
    expect(deleteSpending).toHaveBeenCalledWith(ids.spending1, 'spendings');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('a failed remove keeps the row and says why; a lost session leaves', async () => {
    deleteSpending.mockResolvedValueOnce({
      status: 'error',
      message: 'Couldn’t reach the server. Your changes weren’t saved.',
    });
    renderTable();
    await userEvent.click(
      screen.getByRole('button', {
        name: 'Remove Neighbourhood Market on Oct 27',
      }),
    );
    expect(
      await screen.findByText(
        'Couldn’t reach the server. Your changes weren’t saved.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('Neighbourhood Market')).toBeInTheDocument();

    deleteSpending.mockResolvedValueOnce({ status: 'signed-out' });
    await userEvent.click(
      screen.getByRole('button', { name: 'Remove Rent — Unit 4B on Oct 1' }),
    );
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/'));
  });
});

describe('SpendingsTable and the CSV import', () => {
  it('makes Import CSV unavailable while a row is open', async () => {
    render(
      <ImportProvider>
        <ImportCsvButton lookups={lookups} />
        <SpendingsTable
          spendings={spendings}
          monthTotal={{ amount: '2234.37', currency: 'CAD' }}
          ym={{ year: 2026, month: 10 }}
          today={TODAY}
          currency="CAD"
          categories={[{ id: ids.groceries, name: 'Groceries', count: 10 }]}
          accounts={[{ id: ids.visa, name: 'Visa', count: 12 }]}
          merchants={[]}
        />
      </ImportProvider>,
    );
    const importButton = screen.getByRole('button', { name: 'Import CSV' });
    expect(importButton).toBeEnabled();

    await userEvent.click(
      screen.getByRole('button', { name: 'Add a spending row' }),
    );
    expect(importButton).toBeDisabled();

    await userEvent.click(
      screen.getByRole('button', { name: 'Cancel new spending' }),
    );
    expect(importButton).toBeEnabled();
  });
});

describe('SpendingsTable for income (specs/009)', () => {
  function renderIncome(rows = spendings) {
    render(
      <LedgerProvider ledger="income">
        <SpendingsTable
          spendings={rows}
          monthTotal={{ amount: '5120.25', currency: 'CAD' }}
          ym={{ year: 2026, month: 10 }}
          today={TODAY}
          currency="CAD"
          categories={[{ id: ids.groceries, name: 'Salary', count: 10 }]}
          accounts={[{ id: ids.visa, name: 'Visa', count: 12 }]}
          merchants={[]}
        />
      </LedgerProvider>,
    );
  }

  it('has a Source column, counts entries and says so when a month is empty', () => {
    renderIncome();
    expect(
      screen.getAllByRole('columnheader').map((h) => h.textContent)[1],
    ).toBe('Source');
    expect(screen.getByText('2 entries')).toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: 'Income list' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Add an income row' }),
    ).toBeInTheDocument();
  });

  it('shows the income empty message', () => {
    renderIncome([]);
    expect(
      screen.getByText('No income recorded in October 2026.'),
    ).toBeInTheDocument();
  });

  it('a date opens a new income row on that date, with Source focused (specs/010)', async () => {
    renderIncome();
    await userEvent.click(
      screen.getByRole('button', { name: 'Add on Oct 27' }),
    );
    expect(screen.getByRole('combobox', { name: 'Source' })).toHaveFocus();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('removes an income through the income ledger', async () => {
    renderIncome();
    const row = screen.getAllByRole('row')[1]!;
    await userEvent.hover(row);
    await userEvent.click(
      within(row).getByRole('button', { name: /^Remove / }),
    );
    await waitFor(() =>
      expect(deleteSpending).toHaveBeenCalledWith(ids.spending1, 'income'),
    );
  });
});
