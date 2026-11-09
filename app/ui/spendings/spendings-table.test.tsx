import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
  vi.clearAllMocks();
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
});

describe('SpendingsTable undo for delete (specs/010 US2)', () => {
  const props = {
    monthTotal: { amount: '2234.37', currency: 'CAD' },
    ym: { year: 2026, month: 10 },
    today: TODAY,
    currency: 'CAD',
    categories: [{ id: ids.groceries, name: 'Groceries', count: 10 }],
    accounts: [{ id: ids.visa, name: 'Visa', count: 12 }],
    merchants: [],
  };
  const market = 'Remove Neighbourhood Market on Oct 27';
  const rent = 'Remove Rent — Unit 4B on Oct 1';
  const status = () => screen.getByRole('status');
  const rowWith = (text: string) =>
    screen.getAllByRole('row').find((r) => within(r).queryByText(text))!;

  function setup() {
    vi.useFakeTimers();
    const view = render(<SpendingsTable spendings={spendings} {...props} />);
    return view;
  }

  const click = (element: HTMLElement) => fireEvent.click(element);

  async function advance(ms: number) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ms);
    });
  }

  afterEach(() => {
    vi.useRealTimers();
  });

  it('remove fades the row with Undo focused and announces it; nothing is sent yet', async () => {
    setup();
    click(screen.getByRole('button', { name: market }));
    const row = rowWith('Neighbourhood Market');
    expect(row).toHaveAttribute('data-pending', 'true');
    expect(within(row).getByRole('button', { name: 'Undo' })).toHaveFocus();
    expect(status()).toHaveTextContent(
      'Neighbourhood Market on Oct 27 removed. Undo available for 5 seconds.',
    );
    expect(deleteSpending).not.toHaveBeenCalled();
    // Totals still count it.
    expect(screen.getByText('$2,234.37')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('Undo restores the row, focuses Remove, and never deletes', async () => {
    setup();
    click(screen.getByRole('button', { name: market }));
    click(screen.getByRole('button', { name: 'Undo' }));
    const row = rowWith('Neighbourhood Market');
    expect(row).not.toHaveAttribute('data-pending');
    expect(screen.getByRole('button', { name: market })).toHaveFocus();
    expect(status()).toHaveTextContent(
      'Neighbourhood Market on Oct 27 restored.',
    );
    await advance(10_000);
    expect(deleteSpending).not.toHaveBeenCalled();
  });

  it('after 5 seconds the delete is sent once; the row leaves when the list refreshes', async () => {
    const { rerender } = setup();
    click(screen.getByRole('button', { name: market }));
    await advance(4999);
    expect(deleteSpending).not.toHaveBeenCalled();
    await advance(1);
    expect(deleteSpending).toHaveBeenCalledTimes(1);
    expect(deleteSpending).toHaveBeenCalledWith(ids.spending1, 'spendings');
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
    expect(status()).toHaveTextContent(
      'Neighbourhood Market on Oct 27 deleted.',
    );

    rerender(<SpendingsTable spendings={spendings.slice(1)} {...props} />);
    expect(screen.queryByText('Neighbourhood Market')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull();
  });

  it('two rows can wait at once, each on its own timer', async () => {
    setup();
    click(screen.getByRole('button', { name: market }));
    await advance(1000);
    click(screen.getByRole('button', { name: rent }));
    expect(screen.getAllByRole('button', { name: 'Undo' })).toHaveLength(2);
    await advance(4000);
    expect(deleteSpending).toHaveBeenCalledTimes(1);
    await advance(1000);
    expect(deleteSpending).toHaveBeenCalledTimes(2);
  });

  it('a failed delete brings the row back and says why', async () => {
    deleteSpending.mockResolvedValueOnce({
      status: 'error',
      message: 'Couldn’t reach the server. Your changes weren’t saved.',
    });
    setup();
    click(screen.getByRole('button', { name: market }));
    await advance(5000);
    expect(
      screen.getByText(
        'Couldn’t reach the server. Your changes weren’t saved.',
      ),
    ).toBeInTheDocument();
    expect(rowWith('Neighbourhood Market')).not.toHaveAttribute('data-pending');
  });

  it('a lost session leaves the page', async () => {
    deleteSpending.mockResolvedValueOnce({ status: 'signed-out' });
    setup();
    click(screen.getByRole('button', { name: rent }));
    await advance(5000);
    expect(replace).toHaveBeenCalledWith('/');
  });

  it('leaving the month (the table unmounts) sends waiting deletes at once', async () => {
    const { unmount } = setup();
    click(screen.getByRole('button', { name: market }));
    unmount();
    await advance(0);
    expect(deleteSpending).toHaveBeenCalledWith(ids.spending1, 'spendings');
  });

  it('Undo stays usable while a new row is open', async () => {
    setup();
    click(screen.getByRole('button', { name: market }));
    click(screen.getByRole('button', { name: 'Add a spending row' }));
    expect(screen.getByRole('button', { name: 'Undo' })).toBeEnabled();
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

  it('removes an income through the income ledger, after the undo wait (specs/010)', async () => {
    vi.useFakeTimers();
    renderIncome();
    const row = screen.getAllByRole('row')[1]!;
    fireEvent.click(within(row).getByRole('button', { name: /^Remove / }));
    expect(screen.getByRole('status')).toHaveTextContent(
      'Neighbourhood Market on Oct 27 removed. Undo available for 5 seconds.',
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(deleteSpending).toHaveBeenCalledWith(ids.spending1, 'income');
    vi.useRealTimers();
  });
});
