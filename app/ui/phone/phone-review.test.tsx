import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ImportRow } from '@/app/lib/csv-import';
import PhoneReview from '@/app/ui/phone/phone-review';
import type { ImportSession, PhoneUi } from '@/app/ui/phone/phone-ui-provider';
import { renderPhone, UiProbe } from '@/app/ui/phone/test-support';
import { TODAY } from '@/mocks/fixtures';

const { importSpendings, push } = vi.hoisted(() => ({
  importSpendings: vi.fn(),
  push: vi.fn(),
}));
vi.mock('@/app/lib/actions', () => ({ importSpendings }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
}));

const good = {
  date: '2026-10-25',
  merchant: 'Corner Bakery',
  category: 'Groceries',
  account: 'Visa',
  amount: '12.40',
};
const rows = (list: Partial<ImportRow['draft']>[]): ImportRow[] =>
  list.map((patch, i) => ({ key: `r${i + 1}`, draft: { ...good, ...patch } }));

let ui: PhoneUi;
const grab = (next: PhoneUi) => {
  ui = next;
};

function setup(list: ImportRow[]) {
  const session: ImportSession = {
    fileName: 'oct.csv',
    rows: list,
    idempotencyKey: '0b9f6c1e-3c1a-4f2e-9a57-2f1d6c2b8e11',
  };
  renderPhone(
    <>
      <UiProbe onUi={grab} />
      <PhoneReview session={session} today={TODAY} currency="CAD" />
    </>,
  );
  act(() => ui.open({ kind: 'import' }));
  act(() => ui.open({ kind: 'review' }));
  return session;
}

beforeEach(() => {
  importSpendings.mockReset();
  window.history.replaceState(null, '', '/spendings');
});

describe('PhoneReview', () => {
  it('marks rows that need attention and blocks the add', () => {
    setup(rows([{}, { category: '' }, { amount: '' }]));
    expect(screen.getByText('oct.csv · 3 rows')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      '2 rows need attention',
    );
    expect(
      screen.getByText('Tap a row to check or fix it.'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: /^Corner Bakery,\s*Oct 25 · No category · Visa,\s*\$12\.40,\s*needs attention$/,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('No amount')).toHaveClass('text-warn');
    expect(
      screen.getByRole('button', { name: 'Add spendings' }),
    ).toBeDisabled();
  });

  it('opens a row to fix it', async () => {
    setup(rows([{ category: '' }]));
    await userEvent.click(
      screen.getByRole('button', { name: /needs attention$/ }),
    );
    expect(ui.layers.at(-1)).toEqual({ kind: 'fix-row', key: 'r1' });
  });

  it('adds every row once, then lands on the latest month with a note', async () => {
    importSpendings.mockResolvedValue({
      status: 'ok',
      month: '2026-10',
      count: 2,
    });
    const session = setup(rows([{}, {}]));
    expect(screen.getByRole('status')).toHaveTextContent('All rows look good');
    await userEvent.dblClick(
      screen.getByRole('button', { name: 'Add 2 spendings' }),
    );
    await waitFor(() =>
      expect(screen.getByTestId('state')).toHaveTextContent(
        'list|Added 2 spendings from oct.csv',
      ),
    );
    expect(importSpendings).toHaveBeenCalledOnce();
    expect(importSpendings).toHaveBeenCalledWith({
      rows: session.rows,
      idempotencyKey: session.idempotencyKey,
      today: TODAY,
      currency: 'CAD',
    });
    expect(push).toHaveBeenCalledWith('/spendings?month=2026-10', {
      scroll: false,
    });
  });

  it('keeps every row and explains a failed add', async () => {
    importSpendings.mockResolvedValue({
      status: 'error',
      message: 'Couldn’t reach the server. Your changes weren’t saved.',
    });
    setup(rows([{}]));
    await userEvent.click(
      screen.getByRole('button', { name: 'Add 1 spending' }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Couldn’t reach the server',
    );
    expect(
      screen.getByRole('button', { name: /^Corner Bakery/ }),
    ).toBeInTheDocument();
  });

  it('says when no rows remain', () => {
    setup([]);
    expect(screen.getByText('No rows left to import.')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Add spendings' }),
    ).toBeDisabled();
  });
});
