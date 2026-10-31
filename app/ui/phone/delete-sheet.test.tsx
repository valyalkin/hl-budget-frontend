import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Spending } from '@/app/lib/definitions';
import DeleteSheet from '@/app/ui/phone/delete-sheet';
import type { PhoneUi } from '@/app/ui/phone/phone-ui-provider';
import { renderPhone, UiProbe } from '@/app/ui/phone/test-support';
import { spendings } from '@/mocks/fixtures';

const { deleteSpending } = vi.hoisted(() => ({ deleteSpending: vi.fn() }));
vi.mock('@/app/lib/actions', () => ({ deleteSpending }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

const spending = spendings[0] as Spending;
let ui: PhoneUi;
const grab = (next: PhoneUi) => {
  ui = next;
};

function setup() {
  renderPhone(
    <>
      <UiProbe onUi={grab} />
      <DeleteSheet spending={spending} />
    </>,
  );
  act(() => ui.open({ kind: 'edit', spendingId: spending.id }));
  act(() => ui.open({ kind: 'confirm-delete' }));
}

beforeEach(() => {
  deleteSpending.mockReset();
  window.history.replaceState(null, '', '/spendings');
});

describe('DeleteSheet', () => {
  it('asks with the merchant, amount and date', () => {
    setup();
    const sheet = screen.getByRole('alertdialog', {
      name: 'Delete this spending?',
    });
    expect(sheet).toHaveTextContent(
      'Neighbourhood Market · $84.37 · Oct 27, 2026',
    );
  });

  it('deletes once, closes the sheet and the form, and says what went', async () => {
    deleteSpending.mockResolvedValue({ status: 'ok' });
    setup();
    await userEvent.dblClick(
      screen.getByRole('button', { name: 'Delete spending' }),
    );
    await waitFor(() =>
      expect(screen.getByTestId('state')).toHaveTextContent(
        'list|Deleted Neighbourhood Market · $84.37',
      ),
    );
    expect(deleteSpending).toHaveBeenCalledOnce();
    expect(deleteSpending).toHaveBeenCalledWith(spending.id);
  });

  it('keeps the spending and says why when the delete fails', async () => {
    deleteSpending.mockResolvedValue({
      status: 'error',
      message: 'This item no longer exists.',
    });
    setup();
    await userEvent.click(
      screen.getByRole('button', { name: 'Delete spending' }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This item no longer exists.',
    );
    expect(screen.getByTestId('state')).toHaveTextContent(
      'edit>confirm-delete|',
    );
  });

  it('Cancel closes only the sheet', async () => {
    setup();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() =>
      expect(screen.getByTestId('state')).toHaveTextContent(/^edit\|$/),
    );
    expect(deleteSpending).not.toHaveBeenCalled();
  });
});
