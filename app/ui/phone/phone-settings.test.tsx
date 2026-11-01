import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SettingsData } from '@/app/lib/definitions';
import PhoneSettings from '@/app/ui/phone/phone-settings';
import {
  accounts,
  categories,
  incomeCategories,
  renderPhone,
} from '@/app/ui/phone/test-support';
import { ids } from '@/mocks/fixtures';

const actions = vi.hoisted(() => ({
  createCategory: vi.fn(),
  deleteCategory: vi.fn(),
  createAccount: vi.fn(),
  deleteAccount: vi.fn(),
  createIncomeCategory: vi.fn(),
  deleteIncomeCategory: vi.fn(),
}));
vi.mock('@/app/lib/actions', () => actions);
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

function setup(accountList: SettingsData['accounts'] = accounts) {
  renderPhone(
    <PhoneSettings
      categories={categories}
      incomeCategories={incomeCategories}
      accounts={accountList}
    />,
  );
}

beforeEach(() => {
  Object.values(actions).forEach((fn) => fn.mockReset());
});

describe('PhoneSettings — categories', () => {
  it('shows your categories with remove buttons and the defaults as plain tags', () => {
    setup();
    expect(
      screen.getByRole('dialog', { name: 'Settings' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Spending categories' }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.getByRole('heading', { name: 'Your categories · 2' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Remove Gifts' }),
    ).toBeInTheDocument();
    const defaults = screen.getByRole('region', {
      name: 'Default categories · 2',
    });
    expect(within(defaults).getByText('Groceries')).toBeInTheDocument();
    expect(within(defaults).queryByRole('button')).not.toBeInTheDocument();
  });

  it('adds a new category and clears the field', async () => {
    actions.createCategory.mockResolvedValue({ status: 'ok' });
    setup();
    const field = screen.getByRole('textbox', { name: 'New category' });
    await userEvent.type(field, 'Kids');
    await userEvent.click(screen.getByRole('button', { name: 'Add category' }));
    await waitFor(() => expect(field).toHaveValue(''));
    expect(actions.createCategory).toHaveBeenCalledWith('Kids');
  });

  it('refuses an empty name and a duplicate in any case', async () => {
    setup();
    await userEvent.click(screen.getByRole('button', { name: 'Add category' }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Type a name for the category.',
    );
    await userEvent.type(
      screen.getByRole('textbox', { name: 'New category' }),
      'coffee',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Add category' }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      '“coffee” already exists.',
    );
    expect(actions.createCategory).not.toHaveBeenCalled();
  });

  it('refuses to remove a category in use, and removes one that isn’t', async () => {
    actions.deleteCategory.mockResolvedValue({ status: 'ok' });
    setup();
    await userEvent.click(screen.getByRole('button', { name: 'Remove Gifts' }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Gifts is used by 1 spending, so it can’t be removed.',
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Remove Coffee' }),
    );
    await waitFor(() =>
      expect(actions.deleteCategory).toHaveBeenCalledWith(
        expect.objectContaining({ id: ids.coffee }),
      ),
    );
  });
});

describe('PhoneSettings — accounts', () => {
  it('shows how many spendings each account has', async () => {
    setup();
    await userEvent.click(screen.getByRole('button', { name: 'Accounts' }));
    expect(screen.getByText('12 spendings recorded')).toBeInTheDocument();
    expect(screen.getByText('No spendings yet')).toBeInTheDocument();
    expect(
      screen.getByRole('textbox', { name: 'New account' }),
    ).toBeInTheDocument();
  });

  it('refuses to remove an account in use, or the last one', async () => {
    setup([{ id: ids.cash, name: 'Cash', count: 0 }]);
    await userEvent.click(screen.getByRole('button', { name: 'Accounts' }));
    await userEvent.click(screen.getByRole('button', { name: 'Remove Cash' }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'You need at least one account.',
    );
    expect(actions.deleteAccount).not.toHaveBeenCalled();
  });

  it('shows the server’s refusal', async () => {
    actions.deleteAccount.mockResolvedValue({
      status: 'error',
      message: 'Cash has 3 spendings, so it can’t be removed.',
    });
    setup();
    await userEvent.click(screen.getByRole('button', { name: 'Accounts' }));
    await userEvent.click(screen.getByRole('button', { name: 'Remove Cash' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Cash has 3 spendings',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Remove Visa' }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Visa has 12 spendings, so it can’t be removed.',
    );
  });
});

describe('PhoneSettings — income categories (specs/009)', () => {
  it('has three sections, and lists Salary and Investments as defaults with their colours', async () => {
    setup();
    expect(
      screen.getByRole('button', { name: 'Income categories' }),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Income categories' }),
    );
    expect(
      screen.getByRole('heading', { name: 'Default income categories · 2' }),
    ).toBeInTheDocument();
    expect(screen.getAllByTestId('income-category-swatch')).toHaveLength(2);
    expect(
      screen.getByRole('textbox', { name: 'New income category' }),
    ).toBeInTheDocument();
  });

  it('adds an income category even when a spending category has the name', async () => {
    actions.createIncomeCategory.mockResolvedValue({ status: 'ok' });
    setup();
    await userEvent.click(
      screen.getByRole('button', { name: 'Income categories' }),
    );
    await userEvent.type(
      screen.getByRole('textbox', { name: 'New income category' }),
      'Gifts',
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Add income category' }),
    );
    await waitFor(() =>
      expect(actions.createIncomeCategory).toHaveBeenCalledWith('Gifts'),
    );
    expect(actions.createCategory).not.toHaveBeenCalled();
  });

  it('refuses a duplicate income category name ignoring case', async () => {
    setup();
    await userEvent.click(
      screen.getByRole('button', { name: 'Income categories' }),
    );
    await userEvent.type(
      screen.getByRole('textbox', { name: 'New income category' }),
      'salary',
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Add income category' }),
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      '“salary” already exists.',
    );
    expect(actions.createIncomeCategory).not.toHaveBeenCalled();
  });

  it('refuses to remove an account that income uses, naming both counts', async () => {
    setup([
      { id: ids.visa, name: 'Visa', count: 3, incomeCount: 1 },
      { id: ids.cash, name: 'Cash', count: 0, incomeCount: 2 },
    ]);
    await userEvent.click(screen.getByRole('button', { name: 'Accounts' }));
    expect(
      screen.getByText('3 spendings · 1 income entry'),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Remove Cash' }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Cash has 2 income entries, so it can’t be removed.',
    );
    expect(actions.deleteAccount).not.toHaveBeenCalled();
  });
});
