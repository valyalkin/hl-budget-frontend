import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ids, spendings, TODAY } from '@/mocks/fixtures';
import SpendingsTable from '@/app/ui/spendings/spendings-table';

const { deleteSpending, saveSpending, push, replace } = vi.hoisted(() => ({
  deleteSpending: vi.fn(),
  saveSpending: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
}));
vi.mock('@/app/lib/actions', () => ({ deleteSpending, saveSpending }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, replace }) }));

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
    await userEvent.tab();
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

  it('remove deletes at once, with no confirmation', async () => {
    renderTable();
    await userEvent.click(
      screen.getByRole('button', {
        name: 'Remove Neighbourhood Market on Oct 27',
      }),
    );
    expect(deleteSpending).toHaveBeenCalledWith(ids.spending1);
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
