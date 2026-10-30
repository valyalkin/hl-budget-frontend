import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect } from 'react';
import { describe, expect, it, vi } from 'vitest';
import ImportCsvButton from '@/app/ui/import/import-csv-button';
import ImportNotice from '@/app/ui/import/import-notice';
import ImportProvider, {
  type ImportContextValue,
  useImport,
} from '@/app/ui/import/import-provider';
import { lookups, rows } from '@/app/ui/import/test-support';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));
vi.mock('@/app/lib/actions', () => ({ importSpendings: vi.fn() }));

let session: ImportContextValue | undefined;
function Spy({ onValue }: { onValue: (value: ImportContextValue) => void }) {
  const value = useImport();
  useEffect(() => onValue(value));
  return null;
}

function renderPage() {
  return render(
    <ImportProvider>
      <ImportNotice />
      <ImportCsvButton lookups={lookups} />
      <Spy
        onValue={(value) => {
          session = value;
        }}
      />
    </ImportProvider>,
  );
}

describe('ImportCsvButton', () => {
  it('opens the import with the page’s lookups', async () => {
    renderPage();
    const button = screen.getByRole('button', { name: 'Import CSV' });
    expect(button).toHaveAttribute('aria-haspopup', 'dialog');

    await userEvent.click(button);

    expect(session?.stage).toBe('pick');
    expect(session?.lookups).toBe(lookups);
    expect(
      screen.getByRole('dialog', { name: 'Import CSV' }),
    ).toBeInTheDocument();
  });

  it('is unavailable while a Spendings table row is open', async () => {
    renderPage();
    const button = screen.getByRole('button', { name: 'Import CSV' });

    await vi.waitFor(() => session?.setRowOpen(true));
    await vi.waitFor(() => expect(button).toBeDisabled());

    session?.setRowOpen(false);
    await vi.waitFor(() => expect(button).toBeEnabled());
  });
});

describe('ImportProvider', () => {
  it('moves from pick to review and back, starting each review fresh', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: 'Import CSV' }));

    await vi.waitFor(() => session?.toReview('a.csv', rows({})));
    await vi.waitFor(() => expect(session?.stage).toBe('review'));
    const first = session?.session;

    session?.toPick();
    await vi.waitFor(() => expect(session?.stage).toBe('pick'));
    expect(session?.rows).toEqual([]);

    session?.toReview('a.csv', rows({}));
    await vi.waitFor(() => expect(session?.session).not.toBe(first));
  });

  it('shows the notice after finishing, keeps it, and clears it on dismiss or a new import', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: 'Import CSV' }));
    await vi.waitFor(() => session?.finish('Added 2 spendings from a.csv'));

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Added 2 spendings from a.csv',
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Import CSV' }));
    expect(screen.getByRole('status')).toBeEmptyDOMElement();

    await vi.waitFor(() => session?.finish('Added 1 spending from b.csv'));
    await userEvent.click(
      await screen.findByRole('button', { name: 'Dismiss' }),
    );
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });
});
