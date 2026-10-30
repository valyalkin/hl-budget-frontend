import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ImportInput, ImportResult } from '@/app/lib/actions';
import ReviewStage from '@/app/ui/import/review-stage';
import { lookups, rows } from '@/app/ui/import/test-support';

const { importSpendings, replace } = vi.hoisted(() => ({
  importSpendings: vi.fn<(input: ImportInput) => Promise<ImportResult>>(),
  replace: vi.fn(),
}));
vi.mock('@/app/lib/actions', () => ({ importSpendings }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push: vi.fn(), refresh: vi.fn() }),
}));

function setup(initialRows = rows({ amount: '12.40' }, { amount: '61.20' })) {
  const handlers = {
    onCancel: vi.fn(),
    onAdded: vi.fn(),
    onAlreadyImported: vi.fn(),
  };
  render(
    <ReviewStage
      headingId="h"
      fileName="transactions.csv"
      initialRows={initialRows}
      lookups={lookups}
      {...handlers}
    />,
  );
  return handlers;
}

const addButton = () =>
  screen.getByRole('button', { name: /^Add \d* ?spendings?$/ });

beforeEach(() => {
  importSpendings.mockResolvedValue({
    status: 'ok',
    month: '2026-10',
    count: 2,
  });
});

describe('ReviewStage with valid rows', () => {
  it('shows the file, the rows, "All rows look good" and the total', () => {
    setup();
    expect(screen.getByText('transactions.csv · 2 rows')).toBeInTheDocument();
    expect(screen.getByText('All rows look good')).toBeInTheDocument();
    expect(screen.getByText('2 spendings · total $73.60')).toBeInTheDocument();
    expect(
      within(
        screen.getByRole('table', { name: 'Rows to import' }),
      ).getAllByRole('button', { name: /^Remove row/ }),
    ).toHaveLength(2);
    expect(addButton()).toHaveTextContent('Add 2 spendings');
    expect(addButton()).toBeEnabled();
  });

  it('adds every row once with the review’s key, then reports the month', async () => {
    let finish: (result: ImportResult) => void = () => undefined;
    importSpendings.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const { onAdded } = setup();

    await userEvent.click(addButton());
    expect(addButton()).toBeDisabled();
    await userEvent.click(addButton());
    finish({ status: 'ok', month: '2026-10', count: 2 });

    await vi.waitFor(() => expect(onAdded).toHaveBeenCalledWith('2026-10', 2));
    expect(importSpendings).toHaveBeenCalledOnce();
    const input = importSpendings.mock.calls[0]?.[0];
    expect(input?.rows).toHaveLength(2);
    expect(input?.idempotencyKey).toMatch(/^[0-9a-f-]{36}$/);
    expect(input).toMatchObject({ today: lookups.today, currency: 'CAD' });
  });

  it('keeps the rows and shows the message when adding fails', async () => {
    importSpendings.mockResolvedValue({
      status: 'error',
      message: 'Couldn’t reach the server. Your changes weren’t saved.',
    });
    setup();

    await userEvent.click(addButton());

    expect(
      await screen.findByText(
        'Couldn’t reach the server. Your changes weren’t saved.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('transactions.csv · 2 rows')).toBeInTheDocument();
  });

  it('goes to the signed-out screen when the session is gone', async () => {
    importSpendings.mockResolvedValue({ status: 'signed-out' });
    setup();
    await userEvent.click(addButton());
    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith('/'));
  });

  it('reports an import that was already saved', async () => {
    importSpendings.mockResolvedValue({ status: 'already-imported' });
    const { onAlreadyImported } = setup();
    await userEvent.click(addButton());
    await vi.waitFor(() => expect(onAlreadyImported).toHaveBeenCalledOnce());
  });
});

describe('ReviewStage with rows that need attention', () => {
  const gaps = () =>
    rows(
      { category: '' },
      { account: '' },
      { date: '' },
      { amount: '' },
      {},
      {},
      {},
      {},
      {},
      {},
    );

  it('counts them, totals only valid amounts, and blocks adding', async () => {
    setup(gaps());

    expect(screen.getByText('4 rows need attention')).toBeInTheDocument();
    expect(
      screen.getByText('10 spendings · total $111.60'),
    ).toBeInTheDocument();
    expect(addButton()).toHaveTextContent('Add spendings');
    expect(addButton()).toBeDisabled();
    await userEvent.click(addButton());
    expect(importSpendings).not.toHaveBeenCalled();
  });

  it('enables adding once the last problem is fixed', async () => {
    setup(gaps());

    await userEvent.type(
      screen.getByRole('combobox', { name: 'Category, row 1' }),
      'Gifts',
    );
    expect(screen.getByText('3 rows need attention')).toBeInTheDocument();
    await userEvent.type(
      screen.getByRole('combobox', { name: 'Account, row 2' }),
      'Cash',
    );
    await userEvent.click(
      screen.getByRole('button', { name: /^Date, row 3, Pick a date/ }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Today' }));
    expect(screen.getByText('1 row needs attention')).toBeInTheDocument();
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Amount in CAD, row 4' }),
      '5',
    );

    expect(screen.getByText('All rows look good')).toBeInTheDocument();
    expect(addButton()).toHaveTextContent('Add 10 spendings');
    expect(addButton()).toBeEnabled();
    expect(
      screen.getByText('10 spendings · total $116.60'),
    ).toBeInTheDocument();
  });

  it('removes rows, and blocks adding when none are left', async () => {
    setup(rows({}, { amount: '' }));

    await userEvent.click(screen.getByRole('button', { name: 'Remove row 2' }));
    expect(screen.getByText('transactions.csv · 1 row')).toBeInTheDocument();
    expect(addButton()).toHaveTextContent('Add 1 spending');

    await userEvent.click(screen.getByRole('button', { name: 'Remove row 1' }));
    expect(screen.getByText('No rows left to import.')).toBeInTheDocument();
    expect(addButton()).toHaveTextContent('Add spendings');
    expect(addButton()).toBeDisabled();
  });
});

describe('ReviewStage and server refusals', () => {
  it('highlights the fields the server refused and keeps every row', async () => {
    importSpendings.mockResolvedValue({
      status: 'error',
      message: '1 row needs attention',
      rowErrors: [
        {
          row: 1,
          field: 'date',
          message: 'Pick a date that is today or earlier.',
        },
      ],
    });
    setup();

    await userEvent.click(addButton());

    const date = await screen.findByRole('button', { name: /^Date, row 2,/ });
    expect(date).toHaveAccessibleDescription(
      'Pick a date that is today or earlier.',
    );
    expect(screen.getByText('1 row needs attention')).toBeInTheDocument();
    expect(addButton()).toBeDisabled();
  });

  it('uses a new key after editing following a refusal', async () => {
    importSpendings.mockResolvedValueOnce({
      status: 'error',
      message: '1 row needs attention',
      rowErrors: [
        {
          row: 0,
          field: 'merchant',
          message: 'Add a merchant name.',
        },
      ],
    });
    setup();
    await userEvent.click(addButton());
    await screen.findByText('1 row needs attention');

    await userEvent.type(
      screen.getByRole('combobox', { name: 'Merchant, row 1' }),
      's',
    );
    await userEvent.click(addButton());

    await vi.waitFor(() => expect(importSpendings).toHaveBeenCalledTimes(2));
    const [first, second] = importSpendings.mock.calls.map(
      ([input]) => input.idempotencyKey,
    );
    expect(second).not.toBe(first);
  });

  it('keeps the key after the server could not be reached, even after edits', async () => {
    importSpendings.mockResolvedValueOnce({
      status: 'error',
      message: 'Couldn’t reach the server. Your changes weren’t saved.',
    });
    setup();
    await userEvent.click(addButton());
    await screen.findByText(
      'Couldn’t reach the server. Your changes weren’t saved.',
    );

    const amount = screen.getByRole('textbox', {
      name: 'Amount in CAD, row 1',
    });
    await userEvent.clear(amount);
    await userEvent.type(amount, '12.50');
    await userEvent.click(addButton());

    await vi.waitFor(() => expect(importSpendings).toHaveBeenCalledTimes(2));
    const [first, second] = importSpendings.mock.calls.map(
      ([input]) => input.idempotencyKey,
    );
    expect(second).toBe(first);
  });
});

describe('ReviewStage cancelling', () => {
  it('cancels with Cancel and with the close button', async () => {
    const { onCancel } = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await userEvent.click(
      screen.getByRole('button', { name: 'Cancel import' }),
    );
    expect(onCancel).toHaveBeenCalledTimes(2);
    expect(importSpendings).not.toHaveBeenCalled();
  });
});
