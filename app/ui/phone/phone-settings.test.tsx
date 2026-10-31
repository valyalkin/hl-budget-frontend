import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PhoneSettings from '@/app/ui/phone/phone-settings';
import { accounts, categories, renderPhone } from '@/app/ui/phone/test-support';
import { ids } from '@/mocks/fixtures';

const actions = vi.hoisted(() => ({
  createCategory: vi.fn(),
  deleteCategory: vi.fn(),
  createAccount: vi.fn(),
  deleteAccount: vi.fn(),
}));
vi.mock('@/app/lib/actions', () => actions);
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

function setup(accountList = accounts) {
  renderPhone(<PhoneSettings categories={categories} accounts={accountList} />);
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
    expect(screen.getByRole('button', { name: 'Categories' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
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
