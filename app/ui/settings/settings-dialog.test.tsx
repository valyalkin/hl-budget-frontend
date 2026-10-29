import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ids } from '@/mocks/fixtures';
import SettingsDialog from '@/app/ui/settings/settings-dialog';

const actions = vi.hoisted(() => ({
  createCategory: vi.fn(),
  deleteCategory: vi.fn(),
  createAccount: vi.fn(),
  deleteAccount: vi.fn(),
}));
const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock('@/app/lib/actions', () => actions);
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
}));

const categories = [
  { id: ids.groceries, name: 'Groceries', count: 10, isDefault: true },
  { id: ids.rent, name: 'Rent', count: 0, isDefault: true },
  { id: ids.coffee, name: 'Coffee', count: 3, isDefault: false },
  { id: ids.gifts, name: 'Gifts', count: 0, isDefault: false },
];

async function open(
  accounts = [
    { id: ids.visa, name: 'Visa', count: 12 },
    { id: ids.cash, name: 'Cash', count: 0 },
  ],
) {
  render(<SettingsDialog categories={categories} accounts={accounts} />);
  await userEvent.click(screen.getByRole('button', { name: 'User settings' }));
  return screen.getByRole('dialog', { name: 'Settings' });
}

beforeEach(() => {
  Object.values(actions).forEach((action) =>
    action.mockResolvedValue({ status: 'ok' }),
  );
});

describe('SettingsDialog', () => {
  it('opens with vertical sections; arrow keys move between them', async () => {
    const dialog = await open();
    const tabs = within(dialog).getByRole('tablist', {
      name: 'Settings sections',
    });
    expect(tabs).toHaveAttribute('aria-orientation', 'vertical');
    expect(
      within(dialog).getByRole('tab', { name: 'Categories' }),
    ).toHaveAttribute('aria-selected', 'true');
    within(dialog).getByRole('tab', { name: 'Categories' }).focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(within(dialog).getByRole('tab', { name: 'Accounts' })).toHaveFocus();
    expect(
      within(dialog).getByRole('tab', { name: 'Accounts' }),
    ).toHaveAttribute('aria-selected', 'true');
  });

  it('lists locked defaults with counts, and your own with remove buttons', async () => {
    const dialog = await open();
    expect(
      within(dialog).getByRole('heading', { name: 'Default categories · 2' }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getAllByRole('img', { name: 'Default category' }),
    ).toHaveLength(2);
    expect(
      within(dialog).getByText('10 spendings recorded'),
    ).toBeInTheDocument();
    expect(
      within(dialog).queryByRole('button', { name: 'Remove Groceries' }),
    ).not.toBeInTheDocument();
    expect(
      within(dialog).getByRole('button', { name: 'Remove Gifts' }),
    ).toBeInTheDocument();
  });

  it('refuses empty and duplicate names locally, and adds a new one', async () => {
    const dialog = await open();
    const name = within(dialog).getByRole('textbox', { name: 'New category' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add' }));
    expect(
      within(dialog).getByText('Type a name for the category.'),
    ).toBeInTheDocument();
    await userEvent.type(name, 'coffee');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add' }));
    expect(
      within(dialog).getByText('“coffee” already exists.'),
    ).toBeInTheDocument();
    expect(actions.createCategory).not.toHaveBeenCalled();

    await userEvent.clear(name);
    await userEvent.type(name, 'Books{Enter}');
    await waitFor(() =>
      expect(actions.createCategory).toHaveBeenCalledWith('Books'),
    );
    await waitFor(() => expect(name).toHaveValue(''));
  });

  it('refuses removing a category in use with its count, and removes an unused one', async () => {
    const dialog = await open();
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Remove Coffee' }),
    );
    expect(
      within(dialog).getByText(
        'Coffee is used by 3 spendings, so it can’t be removed.',
      ),
    ).toBeInTheDocument();
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Remove Gifts' }),
    );
    expect(actions.deleteCategory).toHaveBeenCalledWith({
      id: ids.gifts,
      name: 'Gifts',
    });
  });

  it('accounts: in use, last account and server messages', async () => {
    const dialog = await open([{ id: ids.cash, name: 'Cash', count: 0 }]);
    await userEvent.click(
      within(dialog).getByRole('tab', { name: 'Accounts' }),
    );
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Remove Cash' }),
    );
    expect(
      within(dialog).getByText('You need at least one account.'),
    ).toBeInTheDocument();
    expect(actions.deleteAccount).not.toHaveBeenCalled();

    actions.createAccount.mockResolvedValueOnce({
      status: 'error',
      message: '“Visa” already exists.',
    });
    await userEvent.type(
      within(dialog).getByRole('textbox', { name: 'New account' }),
      'Visa{Enter}',
    );
    expect(
      await within(dialog).findByText('“Visa” already exists.'),
    ).toBeInTheDocument();

    actions.createAccount.mockResolvedValueOnce({ status: 'signed-out' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add' }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/'));
  });

  it('closes with the close button and with Escape, returning focus', async () => {
    await open();
    await userEvent.click(
      screen.getByRole('button', { name: 'Close settings' }),
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'User settings' })).toHaveFocus();
  });
});
