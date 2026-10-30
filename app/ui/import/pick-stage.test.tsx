import { createEvent, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import PickStage from '@/app/ui/import/pick-stage';
import { lookups } from '@/app/ui/import/test-support';

const CSV =
  'Date,Description,Category,Account,Amount\n28/10/2026,Corner Bakery,groceries,visa,12.40\n';

function setup() {
  const onRows = vi.fn();
  const onClose = vi.fn();
  render(
    <PickStage
      headingId="h"
      lookups={lookups}
      onRows={onRows}
      onClose={onClose}
    />,
  );
  return { onRows, onClose };
}

const csvFile = (text = CSV, name = 'transactions.csv', type = 'text/csv') =>
  new File([text], name, { type });

function drop(target: HTMLElement, files: File[]) {
  const event = createEvent.drop(target);
  Object.defineProperty(event, 'dataTransfer', { value: { files } });
  fireEvent(target, event);
}

describe('PickStage', () => {
  it('shows the design’s content', () => {
    setup();
    expect(
      screen.getByRole('heading', { name: 'Import CSV' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Upload a CSV export from your bank or card. You’ll check every row before anything is added.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('Drop your CSV file here')).toBeInTheDocument();
    expect(screen.getByLabelText('Choose a CSV file')).toHaveAttribute(
      'accept',
      '.csv,text/csv',
    );
    expect(
      screen.getByText('What the file should contain'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Close import' }),
    ).toBeInTheDocument();
  });

  it('highlights the drop area while a file is dragged over it', () => {
    setup();
    const area = screen.getByTestId('drop-area');

    fireEvent.dragOver(area);
    expect(area).toHaveAttribute('data-dragging', 'true');
    fireEvent.dragLeave(area);
    expect(area).toHaveAttribute('data-dragging', 'false');
  });

  it('reads a dropped file, first file only', async () => {
    const { onRows } = setup();
    const area = screen.getByTestId('drop-area');

    drop(area, [csvFile(), csvFile('nonsense', 'other.png', 'image/png')]);

    await vi.waitFor(() => expect(onRows).toHaveBeenCalledOnce());
    const [name, rows] = onRows.mock.calls[0] ?? [];
    expect(name).toBe('transactions.csv');
    expect(rows).toEqual([
      {
        key: 'r1',
        draft: {
          date: '2026-10-28',
          merchant: 'Corner Bakery',
          category: 'Groceries',
          account: 'Visa',
          amount: '12.40',
        },
      },
    ]);
  });

  it('reads a chosen file the same way', async () => {
    const { onRows } = setup();
    await userEvent.upload(
      screen.getByLabelText('Choose a CSV file'),
      csvFile(),
    );
    await vi.waitFor(() => expect(onRows).toHaveBeenCalledOnce());
  });

  it.each([
    [
      'a file that is not a CSV',
      csvFile('x', 'photo.png', 'image/png'),
      'That doesn’t look like a CSV file. Choose a .csv export.',
    ],
    [
      'a header-only file',
      csvFile('Date,Merchant,Amount\n'),
      'No spendings found in that file. Check that it is a CSV with a header row and at least one data row.',
    ],
    [
      'a file over 1 MB',
      csvFile('x'.repeat(1_048_577)),
      'That file is too large. Import at most 1 MB and 1,000 rows at a time.',
    ],
  ])('refuses %s', async (_, file, message) => {
    const { onRows } = setup();
    const area = screen.getByTestId('drop-area');

    drop(area, [file]);

    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(onRows).not.toHaveBeenCalled();
  });

  it('says when a file cannot be read', async () => {
    const { onRows } = setup();
    const file = csvFile();
    file.text = () => Promise.reject(new Error('gone'));
    const area = screen.getByTestId('drop-area');

    drop(area, [file]);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The file couldn’t be read. Try again.',
    );
    expect(onRows).not.toHaveBeenCalled();
  });

  it('closes with Cancel or the close button', async () => {
    const { onClose } = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await userEvent.click(screen.getByRole('button', { name: 'Close import' }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
