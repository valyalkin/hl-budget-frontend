import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ImportCsvButton from '@/app/ui/import/import-csv-button';
import ImportNotice from '@/app/ui/import/import-notice';
import ImportProvider from '@/app/ui/import/import-provider';
import { lookups } from '@/app/ui/import/test-support';

const { importSpendings, push, refresh } = vi.hoisted(() => ({
  importSpendings: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock('@/app/lib/actions', () => ({ importSpendings }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh, replace: vi.fn() }),
}));

const CSV = [
  'Date,Merchant,Category,Account,Amount',
  '2026-10-20,Corner Bakery,Groceries,Visa,12.40',
  '2026-09-30,Lakeshore Fuel,Groceries,Visa,61.20',
].join('\n');

async function openAndLoad() {
  render(
    <ImportProvider>
      <ImportNotice />
      <ImportCsvButton lookups={lookups} />
    </ImportProvider>,
  );
  await userEvent.click(screen.getByRole('button', { name: 'Import CSV' }));
  await userEvent.upload(
    screen.getByLabelText('Choose a CSV file'),
    new File([CSV], 'oct.csv', { type: 'text/csv' }),
  );
  return screen.findByRole('dialog', { name: 'Review import' });
}

/** Escape on a modal dialog fires a cancelable `cancel` event; returns whether it was prevented. */
function cancel(dialog: HTMLElement): boolean {
  const event = new Event('cancel', { cancelable: true });
  fireEvent(dialog, event);
  return event.defaultPrevented;
}

beforeEach(() => {
  importSpendings.mockResolvedValue({
    status: 'ok',
    month: '2026-10',
    count: 2,
  });
});

describe('ImportDialog', () => {
  it('opens as a modal labelled by its stage', async () => {
    const dialog = await openAndLoad();
    expect(dialog).toHaveAttribute('open');
    expect(screen.getByText('oct.csv · 2 rows')).toBeInTheDocument();
  });

  it('lets Escape close the pick stage', async () => {
    render(
      <ImportProvider>
        <ImportCsvButton lookups={lookups} />
      </ImportProvider>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Import CSV' }));
    const dialog = screen.getByRole('dialog', { name: 'Import CSV' });

    expect(cancel(dialog)).toBe(false);
    (dialog as HTMLDialogElement).close();

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('turns Escape in the review into a step back to the pick stage', async () => {
    const dialog = await openAndLoad();

    expect(cancel(dialog)).toBe(true);

    expect(
      await screen.findByRole('dialog', { name: 'Import CSV' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('oct.csv · 2 rows')).not.toBeInTheDocument();
    expect(importSpendings).not.toHaveBeenCalled();
  });

  it('forgets the review’s edits once cancelled', async () => {
    await openAndLoad();
    const merchant = screen.getByRole('combobox', { name: 'Merchant, row 1' });
    await userEvent.clear(merchant);
    await userEvent.type(merchant, 'Edited');

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await userEvent.upload(
      screen.getByLabelText('Choose a CSV file'),
      new File([CSV], 'oct.csv', { type: 'text/csv' }),
    );

    expect(
      await screen.findByRole('combobox', { name: 'Merchant, row 1' }),
    ).toHaveValue('Corner Bakery');
    expect(importSpendings).not.toHaveBeenCalled();
  });

  it('closes after adding, shows the notice and goes to the imported month', async () => {
    await openAndLoad();

    await userEvent.click(
      screen.getByRole('button', { name: 'Add 2 spendings' }),
    );

    await vi.waitFor(() =>
      expect(push).toHaveBeenCalledWith('/spendings?month=2026-10'),
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Added 2 spendings from oct.csv',
    );
  });

  it('closes with "already added" when an earlier attempt was saved', async () => {
    importSpendings.mockResolvedValue({ status: 'already-imported' });
    await openAndLoad();

    await userEvent.click(
      screen.getByRole('button', { name: 'Add 2 spendings' }),
    );

    await vi.waitFor(() => expect(refresh).toHaveBeenCalledOnce());
    expect(screen.getByRole('status')).toHaveTextContent(
      'These spendings were already added.',
    );
  });
});
