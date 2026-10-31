import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Draft } from '@/app/lib/draft';
import SpendingForm, {
  type SpendingFormProps,
} from '@/app/ui/phone/spending-form';
import type { PhoneUi } from '@/app/ui/phone/phone-ui-provider';
import {
  accounts,
  categories,
  merchants,
  renderPhone,
  UiProbe,
} from '@/app/ui/phone/test-support';
import { ids, TODAY } from '@/mocks/fixtures';

const { saveSpending, push, replace } = vi.hoisted(() => ({
  saveSpending: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
}));
vi.mock('@/app/lib/actions', () => ({ saveSpending }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, replace }) }));

const empty: Draft = {
  date: TODAY,
  merchant: '',
  category: '',
  account: '',
  amount: '',
};

let ui: PhoneUi;
const grab = (next: PhoneUi) => {
  ui = next;
};

function setup(props: Partial<SpendingFormProps> = {}) {
  renderPhone(
    <>
      <UiProbe onUi={grab} />
      <SpendingForm
        mode="add"
        initial={empty}
        today={TODAY}
        currency="CAD"
        categories={categories}
        accounts={accounts}
        merchants={merchants}
        {...props}
      />
    </>,
  );
  return {
    amount: () => screen.getByRole('textbox', { name: 'Amount (CAD)' }),
    merchant: () => screen.getByRole('combobox', { name: 'Merchant' }),
    category: () => screen.getByRole('combobox', { name: 'Category' }),
    account: () => screen.getByRole('combobox', { name: 'Account' }),
  };
}

beforeEach(() => {
  saveSpending.mockReset();
  window.history.replaceState(null, '', '/spendings');
});

describe('SpendingForm — add', () => {
  it('is titled New spending, with fields in phone order and a decimal keypad', () => {
    const f = setup();
    expect(
      screen.getByRole('dialog', { name: 'New spending' }),
    ).toBeInTheDocument();
    expect(f.amount()).toHaveAttribute('inputmode', 'decimal');
    const order = [
      f.amount(),
      screen.getByRole('button', { name: /^Date/ }),
      f.merchant(),
      f.category(),
      f.account(),
    ];
    for (let i = 1; i < order.length; i += 1) {
      expect(order[i - 1]?.compareDocumentPosition(order[i] as Node)).toBe(
        Node.DOCUMENT_POSITION_FOLLOWING,
      );
    }
    expect(screen.getByRole('button', { name: /^Date/ })).toHaveAccessibleName(
      'Date Oct 28, 2026',
    );
    expect(
      screen.queryByRole('button', { name: 'Delete spending' }),
    ).not.toBeInTheDocument();
  });

  it('shows the first problem in phone order, inline, and focuses it', async () => {
    const f = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Add spending' }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Enter an amount greater than zero.',
    );
    expect(f.amount()).toHaveFocus();
    expect(f.amount()).toHaveAttribute('aria-invalid', 'true');
    await userEvent.type(f.amount(), '12.40');
    await userEvent.click(screen.getByRole('button', { name: 'Add spending' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Add a merchant name.');
    expect(saveSpending).not.toHaveBeenCalled();
  });

  it('fills an empty category and account from a picked past merchant', async () => {
    const f = setup();
    await userEvent.type(f.account(), 'Cash');
    await userEvent.type(f.merchant(), 'nei');
    await userEvent.click(
      screen.getByRole('option', { name: /Neighbourhood Market/ }),
    );
    expect(f.merchant()).toHaveValue('Neighbourhood Market');
    expect(f.category()).toHaveValue('Groceries');
    expect(f.account()).toHaveValue('Cash');
  });

  it('saves once, closes, and shows the spending’s month', async () => {
    saveSpending.mockResolvedValue({ status: 'ok', month: '2026-10' });
    const f = setup();
    ui.open({ kind: 'edit' });
    await userEvent.type(f.amount(), '12.40');
    await userEvent.type(f.merchant(), 'Corner Bakery');
    await userEvent.type(f.category(), 'groceries');
    await userEvent.type(f.account(), 'New card');
    const add = screen.getByRole('button', { name: 'Add spending' });
    await userEvent.dblClick(add);
    await waitFor(() =>
      expect(push).toHaveBeenCalledWith('/spendings?month=2026-10', {
        scroll: false,
      }),
    );
    expect(saveSpending).toHaveBeenCalledOnce();
    expect(saveSpending.mock.calls[0]?.[0]).toMatchObject({
      mode: 'add',
      amount: '12.40',
      merchant: 'Corner Bakery',
      category: { id: ids.groceries },
      account: { name: 'New card' },
      currency: 'CAD',
    });
    expect(saveSpending.mock.calls[0]?.[0].idempotencyKey).toMatch(
      /^[0-9a-f-]{36}$/,
    );
  });

  it('keeps everything typed and explains a server refusal', async () => {
    saveSpending.mockResolvedValue({
      status: 'error',
      message: 'Couldn’t reach the server. Your changes weren’t saved.',
    });
    const f = setup({
      initial: {
        date: TODAY,
        merchant: 'A',
        category: 'Groceries',
        account: 'Visa',
        amount: '5',
      },
    });
    await userEvent.click(screen.getByRole('button', { name: 'Add spending' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Couldn’t reach the server',
    );
    expect(f.amount()).toHaveValue('5');
  });

  it('opens the inline calendar and sets the picked day', async () => {
    setup();
    await userEvent.click(screen.getByRole('button', { name: /^Date/ }));
    await userEvent.click(
      screen.getByRole('button', { name: 'Monday, October 12, 2026' }),
    );
    expect(screen.getByRole('button', { name: /^Date/ })).toHaveAccessibleName(
      'Date Oct 12, 2026',
    );
    expect(
      screen.queryByRole('group', { name: 'Choose date' }),
    ).not.toBeInTheDocument();
  });
});

describe('SpendingForm — edit', () => {
  const initial = {
    date: '2026-10-27',
    merchant: 'Neighbourhood Market',
    category: 'Groceries',
    account: 'Visa',
    amount: '84.37',
  };

  it('is prefilled, says Save changes, and offers Delete spending', async () => {
    const onRemove = vi.fn();
    saveSpending.mockResolvedValue({ status: 'ok', month: '2026-10' });
    const f = setup({
      mode: 'edit',
      spendingId: ids.spending1,
      initial,
      onRemove,
    });
    expect(
      screen.getByRole('dialog', { name: 'Edit spending' }),
    ).toBeInTheDocument();
    expect(f.amount()).toHaveValue('84.37');
    await userEvent.click(
      screen.getByRole('button', { name: 'Delete spending' }),
    );
    expect(onRemove).toHaveBeenCalledOnce();
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(saveSpending).toHaveBeenCalledOnce());
    expect(saveSpending.mock.calls[0]?.[0]).toMatchObject({
      mode: 'edit',
      spendingId: ids.spending1,
      idempotencyKey: undefined,
    });
  });
});

describe('SpendingForm — fix row', () => {
  it('is titled Fix row, saves only a complete row, and never calls the server', async () => {
    const onFixSave = vi.fn();
    const onRemove = vi.fn();
    const f = setup({
      mode: 'fix-row',
      initial: {
        date: '2026-10-27',
        merchant: 'Dr. Patel Dental',
        category: '',
        account: 'Visa',
        amount: '185.00',
      },
      onFixSave,
      onRemove,
    });
    expect(screen.getByRole('dialog', { name: 'Fix row' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Save row' }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Choose or type a category.',
    );
    expect(onFixSave).not.toHaveBeenCalled();
    await userEvent.type(f.category(), 'Health');
    await userEvent.click(screen.getByRole('button', { name: 'Save row' }));
    expect(onFixSave).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'Health' }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Remove row' }));
    expect(onRemove).toHaveBeenCalledOnce();
    expect(saveSpending).not.toHaveBeenCalled();
  });
});
