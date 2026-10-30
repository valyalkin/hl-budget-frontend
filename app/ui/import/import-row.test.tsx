import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { Draft, Field } from '@/app/lib/draft';
import ImportRow from '@/app/ui/import/import-row';
import { draft, lookups } from '@/app/ui/import/test-support';
import { FloatingRoot } from '@/app/ui/spendings/use-floating';

type Problems = Partial<Record<Field, string>>;

function Harness({
  initial,
  problems,
  onRemove = vi.fn(),
  onDone = vi.fn(),
}: {
  initial: Draft;
  problems?: (current: Draft) => Problems;
  onRemove?: (key: string) => void;
  onDone?: (key: string) => void;
}) {
  const [current, setCurrent] = useState(initial);
  return (
    <table>
      <tbody>
        <ImportRow
          row={{ key: 'r1', draft: current }}
          number={1}
          problems={problems?.(current) ?? {}}
          today={lookups.today}
          currency="CAD"
          categories={lookups.categories}
          accounts={lookups.accounts}
          merchants={lookups.merchants}
          onChange={(_, patch) => setCurrent((d) => ({ ...d, ...patch }))}
          onRemove={onRemove}
          onDone={onDone}
          dateRef={() => undefined}
        />
      </tbody>
    </table>
  );
}

/** Whether a field is empty, as the review's own validation would flag it. */
const emptyIsProblem =
  (field: Field, message: string) =>
  (current: Draft): Problems =>
    current[field].trim() === '' ? { [field]: message } : {};

describe('ImportRow highlighting', () => {
  it('marks an empty field as required and explains why', () => {
    render(
      <Harness
        initial={draft({ category: '' })}
        problems={emptyIsProblem('category', 'Choose or type a category.')}
      />,
    );
    const category = screen.getByRole('combobox', { name: 'Category, row 1' });
    expect(category).toHaveAttribute('placeholder', 'Required');
    expect(category).toHaveAttribute('aria-invalid', 'true');
    expect(category).toHaveAccessibleDescription('Choose or type a category.');
  });

  it('clears the highlight as soon as the field is valid', async () => {
    render(
      <Harness
        initial={draft({ amount: '' })}
        problems={emptyIsProblem(
          'amount',
          'Enter an amount greater than zero.',
        )}
      />,
    );
    const amount = screen.getByRole('textbox', {
      name: 'Amount in CAD, row 1',
    });
    expect(amount).toHaveAttribute('aria-invalid', 'true');

    await userEvent.type(amount, '5');

    expect(amount).not.toHaveAttribute('aria-invalid');
  });

  it('labels an empty date "Pick a date" and describes a date problem', () => {
    render(
      <Harness
        initial={draft({ date: '' })}
        problems={() => ({ date: 'Pick a date.' })}
      />,
    );
    expect(
      screen.getByRole('button', {
        name: 'Date, row 1, Pick a date. Open calendar',
      }),
    ).toHaveAccessibleDescription('Pick a date.');
  });

  it('shows the messages under the row while it has focus', async () => {
    render(
      <Harness
        initial={draft({ account: '' })}
        problems={emptyIsProblem('account', 'Choose or type an account.')}
      />,
    );
    expect(
      screen.queryByText('Choose or type an account.', { selector: 'td' }),
    ).toBeNull();

    await userEvent.click(
      screen.getByRole('combobox', { name: 'Merchant, row 1' }),
    );

    expect(
      screen.getByText('Choose or type an account.', { selector: 'td' }),
    ).toBeInTheDocument();
  });
});

describe('ImportRow autofill and keys', () => {
  it('autofills a category from what the user types', async () => {
    render(<Harness initial={draft({ category: '' })} />);
    const category = screen.getByRole('combobox', { name: 'Category, row 1' });

    await userEvent.type(category, 'g');
    await userEvent.tab();

    expect(category).toHaveValue('Groceries');
  });

  it('fills an empty category and account from a past merchant, but not filled ones', async () => {
    render(
      <Harness
        initial={draft({ merchant: '', category: '', account: 'Cash' })}
      />,
    );
    await userEvent.type(
      screen.getByRole('combobox', { name: 'Merchant, row 1' }),
      'Neighbourhood Market',
    );
    await userEvent.tab();

    expect(
      screen.getByRole('combobox', { name: 'Category, row 1' }),
    ).toHaveValue('Groceries');
    expect(
      screen.getByRole('combobox', { name: 'Account, row 1' }),
    ).toHaveValue('Cash');
  });

  it('moves along the row with Tab, Shift+Tab and Enter', async () => {
    render(<Harness initial={draft()} />);
    const merchant = screen.getByRole('combobox', { name: 'Merchant, row 1' });
    const category = screen.getByRole('combobox', { name: 'Category, row 1' });

    await userEvent.click(merchant);
    await userEvent.tab();
    expect(category).toHaveFocus();
    await userEvent.tab({ shift: true });
    expect(merchant).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    expect(category).toHaveFocus();
  });

  it('moves with Left and Right once the cursor is at the edge', async () => {
    render(<Harness initial={draft()} />);
    const account = screen.getByRole('combobox', { name: 'Account, row 1' });
    const amount = screen.getByRole<HTMLInputElement>('textbox', {
      name: 'Amount in CAD, row 1',
    });

    await userEvent.click(amount);
    amount.setSelectionRange(0, 0);
    await userEvent.keyboard('{ArrowLeft}');

    expect(account).toHaveFocus();
  });

  it('hands Enter on the amount to the next row', async () => {
    const onDone = vi.fn();
    render(<Harness initial={draft()} onDone={onDone} />);

    await userEvent.click(
      screen.getByRole('textbox', { name: 'Amount in CAD, row 1' }),
    );
    await userEvent.keyboard('{Enter}');

    expect(onDone).toHaveBeenCalledWith('r1');
  });

  it('closes an open list with Escape without leaving the field', async () => {
    render(<Harness initial={draft({ category: '' })} />);
    const category = screen.getByRole('combobox', { name: 'Category, row 1' });
    await userEvent.type(category, 'g');
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    await userEvent.keyboard('{Escape}');

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(category).toHaveFocus();
  });

  it('opens the calendar at the current month for an empty date, with future days disabled', async () => {
    render(<Harness initial={draft({ date: '' })} />);
    await userEvent.click(
      screen.getByRole('button', { name: /^Date, row 1,/ }),
    );

    expect(screen.getByText('October 2026')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Oct 29, 2026' })).toBeDisabled();
  });

  it('removes the row without asking', async () => {
    const onRemove = vi.fn();
    render(<Harness initial={draft()} onRemove={onRemove} />);
    const remove = screen.getByRole('button', { name: 'Remove row 1' });
    expect(remove).toHaveAttribute('title', 'Remove this row');

    await userEvent.click(remove);

    expect(onRemove).toHaveBeenCalledWith('r1');
  });
});

describe('ImportRow popups inside the modal dialog', () => {
  function InDialog({ children }: { children: ReactNode }) {
    const [dialog, setDialog] = useState<HTMLDialogElement | null>(null);
    return (
      <dialog ref={setDialog} open aria-label="Review import">
        <FloatingRoot value={dialog}>{children}</FloatingRoot>
      </dialog>
    );
  }

  it('renders the calendar and the suggestion list inside the dialog, not behind it', async () => {
    render(
      <InDialog>
        <Harness initial={draft({ category: '' })} />
      </InDialog>,
    );
    const dialog = screen.getByRole('dialog', { name: 'Review import' });

    await userEvent.click(
      screen.getByRole('button', { name: /^Date, row 1,/ }),
    );
    expect(dialog).toContainElement(
      screen.getByRole('dialog', { name: 'Choose date' }),
    );
    await userEvent.keyboard('{Escape}');

    await userEvent.type(
      screen.getByRole('combobox', { name: 'Category, row 1' }),
      'g',
    );
    expect(dialog).toContainElement(screen.getByRole('listbox'));
  });
});
