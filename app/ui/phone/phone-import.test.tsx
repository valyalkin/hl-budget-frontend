import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import PhoneImport from '@/app/ui/phone/phone-import';
import type { PhoneUi } from '@/app/ui/phone/phone-ui-provider';
import {
  accounts,
  categories,
  renderPhone,
  UiProbe,
} from '@/app/ui/phone/test-support';

let ui: PhoneUi;
const grab = (next: PhoneUi) => {
  ui = next;
};

function setup() {
  renderPhone(
    <>
      <UiProbe onUi={grab} />
      <PhoneImport lookups={{ categories, accounts }} />
    </>,
  );
  act(() => ui.open({ kind: 'import' }));
  return screen.getByLabelText('Choose a CSV file');
}

const csv = (name: string, text: string, type = 'text/csv') =>
  new File([text], name, { type });

beforeEach(() => window.history.replaceState(null, '', '/spendings'));

describe('PhoneImport', () => {
  it('offers a CSV file picker and explains the columns, with no drop zone', () => {
    const input = setup();
    expect(
      screen.getByRole('dialog', { name: 'Import CSV' }),
    ).toBeInTheDocument();
    expect(input).toHaveAttribute('accept', '.csv,text/csv');
    expect(screen.getByText('Choose file')).toBeInTheDocument();
    expect(
      screen.getByText(
        /Columns for date, merchant, category, account and amount/,
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/drag|drop/i)).not.toBeInTheDocument();
  });

  it('refuses a file that is not a CSV', async () => {
    const input = setup();
    await userEvent.upload(input, csv('photo.png', 'x', 'image/png'), {
      applyAccept: false,
    });
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'That doesn’t look like a CSV file.',
    );
  });

  it('refuses a file with no data rows', async () => {
    const input = setup();
    await userEvent.upload(input, csv('empty.csv', ''));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No spendings found in that file.',
    );
  });

  it('reads a CSV and opens the review with its rows', async () => {
    const input = setup();
    await userEvent.upload(
      input,
      csv(
        'oct.csv',
        'Date,Description,Category,Account,Amount\n2026-10-25,"Lakeshore Fuel, Hwy 7",Car,visa,61.20\n2026-10-23,Ride share,Taxi,Visa,"-18.90"\n',
      ),
    );
    await waitFor(() =>
      expect(screen.getByTestId('state')).toHaveTextContent('import>review|'),
    );
    expect(ui.importSession?.fileName).toBe('oct.csv');
    const rows = ui.importSession?.rows ?? [];
    expect(rows[0]?.draft).toMatchObject({
      merchant: 'Lakeshore Fuel, Hwy 7',
      account: 'Visa',
      amount: '61.20',
    });
    expect(rows[1]?.draft.amount).toBe('18.90');
  });
});
