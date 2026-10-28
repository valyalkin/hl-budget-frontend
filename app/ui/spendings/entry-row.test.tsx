import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ids, TODAY } from '@/mocks/fixtures';
import EntryRow, { type EntryRowProps } from '@/app/ui/spendings/entry-row';

const { saveSpending, replace } = vi.hoisted(() => ({
  saveSpending: vi.fn(),
  replace: vi.fn(),
}));
vi.mock('@/app/lib/actions', () => ({ saveSpending }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
}));

const categories = [
  { id: ids.groceries, name: 'Groceries', count: 10 },
  { id: ids.gifts, name: 'Gifts', count: 1 },
];
const accounts = [{ id: ids.visa, name: 'Visa', count: 12 }];
const merchants = [
  {
    name: 'Neighbourhood Market',
    count: 12,
    lastCategory: { id: ids.groceries, name: 'Groceries' },
    lastAccount: { id: ids.visa, name: 'Visa' },
  },
];

function renderRow(props: Partial<EntryRowProps> = {}) {
  const handlers = { onSaved: vi.fn(), onCancel: vi.fn(), onGone: vi.fn() };
  render(
    <table>
      <tbody>
        <EntryRow
          mode="add"
          initial={{
            date: TODAY,
            merchant: '',
            category: '',
            account: '',
            amount: '',
          }}
          today={TODAY}
          currency="CAD"
          categories={categories}
          accounts={accounts}
          merchants={merchants}
          {...handlers}
          {...props}
        />
      </tbody>
    </table>,
  );
  return handlers;
}

const field = (name: string) =>
  screen.getByRole('combobox', { name }) as HTMLInputElement;
const amount = () =>
  screen.getByRole('textbox', { name: 'Amount in CAD' }) as HTMLInputElement;

beforeEach(() => {
  saveSpending.mockResolvedValue({ status: 'ok', month: '2026-10' });
});

describe('EntryRow', () => {
  it('fills a past merchant’s category and account, then saves from the keyboard alone', async () => {
    const { onSaved } = renderRow();
    await userEvent.click(field('Merchant'));
    await userEvent.keyboard('nei');
    expect(field('Merchant').value).toBe('neighbourhood Market');

    await userEvent.tab();
    expect(field('Merchant').value).toBe('Neighbourhood Market');
    expect(field('Category').value).toBe('Groceries');
    expect(field('Account').value).toBe('Visa');
    expect(field('Category')).toHaveFocus();

    await userEvent.tab();
    await userEvent.tab();
    expect(amount()).toHaveFocus();
    await userEvent.keyboard('9.99{Enter}');

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith('2026-10'));
    expect(saveSpending).toHaveBeenCalledOnce();
    expect(saveSpending.mock.calls[0]?.[0]).toMatchObject({
      mode: 'add',
      date: TODAY,
      merchant: 'Neighbourhood Market',
      category: { id: ids.groceries },
      account: { id: ids.visa },
      amount: '9.99',
      currency: 'CAD',
    });
  });

  it('never overwrites a category already chosen, and fills nothing for a new merchant', async () => {
    renderRow({
      initial: {
        date: TODAY,
        merchant: '',
        category: 'Gifts',
        account: '',
        amount: '',
      },
    });
    await userEvent.click(field('Merchant'));
    await userEvent.keyboard('Neighbourhood Market');
    await userEvent.tab();
    expect(field('Category').value).toBe('Gifts');
    expect(field('Account').value).toBe('Visa');
  });

  it('a new merchant fills nothing', async () => {
    renderRow();
    await userEvent.click(field('Merchant'));
    await userEvent.keyboard('Bakery');
    await userEvent.tab();
    expect(field('Category').value).toBe('');
  });

  it('Enter moves on while a field is empty, and saves once all are complete', async () => {
    renderRow();
    await userEvent.click(field('Merchant'));
    await userEvent.keyboard('Bakery{Enter}');
    expect(field('Category')).toHaveFocus();
    await userEvent.keyboard('gro{Enter}');
    expect(field('Account')).toHaveFocus();
    expect(saveSpending).not.toHaveBeenCalled();
  });

  it('Shift+Tab goes back', async () => {
    renderRow();
    await userEvent.click(field('Category'));
    await userEvent.tab({ shift: true });
    expect(field('Merchant')).toHaveFocus();
  });

  it('Tab on amount with an empty field shows the first problem and focuses it', async () => {
    renderRow();
    await userEvent.click(amount());
    await userEvent.keyboard('5');
    await userEvent.tab();
    expect(screen.getByText('Add a merchant name.')).toBeInTheDocument();
    expect(field('Merchant')).toHaveFocus();
    expect(field('Merchant')).toHaveAttribute('aria-invalid', 'true');
    expect(saveSpending).not.toHaveBeenCalled();
  });

  it('a zero amount is refused with the spec’s message', async () => {
    renderRow({
      initial: {
        date: TODAY,
        merchant: 'Bakery',
        category: 'Gifts',
        account: 'Visa',
        amount: '0',
      },
    });
    await userEvent.click(
      screen.getByRole('button', { name: 'Save spending' }),
    );
    expect(
      screen.getByText('Enter an amount greater than zero.'),
    ).toBeInTheDocument();
    expect(saveSpending).not.toHaveBeenCalled();
  });

  it('sends a typed new name as a name, and saves once however often Save is pressed', async () => {
    let finish: (value: unknown) => void = () => {};
    saveSpending.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    renderRow({
      initial: {
        date: TODAY,
        merchant: 'Café',
        category: 'coffee ',
        account: 'visa',
        amount: '6.75',
      },
    });
    const save = screen.getByRole('button', { name: 'Save spending' });
    await userEvent.click(save);
    await userEvent.click(save);
    expect(saveSpending).toHaveBeenCalledOnce();
    expect(saveSpending.mock.calls[0]?.[0]).toMatchObject({
      category: { name: 'coffee' },
      account: { id: ids.visa },
    });
    expect(saveSpending.mock.calls[0]?.[0].idempotencyKey).toMatch(
      /^[0-9a-f-]{36}$/,
    );
    finish({ status: 'ok', month: '2026-10' });
  });

  it('shows a server refusal and keeps what was typed', async () => {
    saveSpending.mockResolvedValue({
      status: 'error',
      field: 'date',
      message: 'Pick a date that is today or earlier.',
    });
    renderRow({
      initial: {
        date: TODAY,
        merchant: 'Bakery',
        category: 'Gifts',
        account: 'Visa',
        amount: '3',
      },
    });
    await userEvent.click(
      screen.getByRole('button', { name: 'Save spending' }),
    );
    expect(
      await screen.findByText('Pick a date that is today or earlier.'),
    ).toBeInTheDocument();
    expect(field('Merchant').value).toBe('Bakery');
  });

  it('closes on a gone edit, and leaves on a lost session', async () => {
    saveSpending.mockResolvedValueOnce({
      status: 'error',
      gone: true,
      message: 'This item no longer exists.',
    });
    const { onGone } = renderRow({
      mode: 'edit',
      spendingId: ids.spending1,
      initial: {
        date: TODAY,
        merchant: 'Bakery',
        category: 'Gifts',
        account: 'Visa',
        amount: '3',
      },
    });
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() =>
      expect(onGone).toHaveBeenCalledWith('This item no longer exists.'),
    );

    saveSpending.mockResolvedValueOnce({ status: 'signed-out' });
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/'));
  });

  it('Escape and X cancel without saving', async () => {
    const { onCancel } = renderRow();
    await userEvent.click(amount());
    await userEvent.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalledOnce();
    await userEvent.click(
      screen.getByRole('button', { name: 'Cancel new spending' }),
    );
    expect(onCancel).toHaveBeenCalledTimes(2);
    expect(saveSpending).not.toHaveBeenCalled();
  });
});
