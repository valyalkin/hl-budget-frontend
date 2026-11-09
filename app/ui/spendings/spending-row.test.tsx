import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { spendings } from '@/mocks/fixtures';
import SpendingRow from '@/app/ui/spendings/spending-row';

const spending = spendings[0]!; // Neighbourhood Market, 2026-10-27

function renderRow(props: Partial<ComponentProps<typeof SpendingRow>> = {}) {
  const handlers = {
    onEdit: vi.fn(),
    onRemove: vi.fn(),
    onAddOnDate: vi.fn(),
    onUndo: vi.fn(),
  };
  render(
    <table>
      <tbody>
        <SpendingRow
          spending={spending}
          locked={false}
          {...handlers}
          {...props}
        />
      </tbody>
    </table>,
  );
  return handlers;
}

describe('SpendingRow quick add (specs/010 US1)', () => {
  it('the date is a button that adds on that date, by click, Enter or Space', async () => {
    const { onAddOnDate } = renderRow();
    const date = screen.getByRole('button', { name: 'Add on Oct 27' });
    expect(date).toHaveAttribute('title', 'Add on Oct 27');
    expect(date).toHaveTextContent('Oct 27');

    await userEvent.click(date);
    expect(onAddOnDate).toHaveBeenCalledTimes(1);

    date.focus();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');
    expect(onAddOnDate).toHaveBeenCalledTimes(3);
  });

  it('while another row is open the date is plain text', () => {
    renderRow({ locked: true });
    expect(screen.queryByRole('button', { name: /^Add on / })).toBeNull();
    expect(screen.getByText('Oct 27')).toBeInTheDocument();
  });

  it('keeps its edit and remove buttons', async () => {
    const { onEdit, onRemove } = renderRow();
    await userEvent.click(
      screen.getByRole('button', {
        name: 'Edit Neighbourhood Market on Oct 27',
      }),
    );
    await userEvent.click(
      screen.getByRole('button', {
        name: 'Remove Neighbourhood Market on Oct 27',
      }),
    );
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});

describe('SpendingRow pending delete (specs/010 US2)', () => {
  it('waiting: faded, always-visible Undo instead of edit and remove, plain date', async () => {
    const { onUndo } = renderRow({ pending: 'waiting' });
    const row = screen.getByRole('row');
    expect(row).toHaveAttribute('data-pending', 'true');
    expect(screen.queryByRole('button', { name: /^Edit / })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Remove / })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Add on / })).toBeNull();
    const undo = within(row).getByRole('button', { name: 'Undo' });
    expect(undo).toHaveAttribute('title', 'Undo remove');
    expect(undo).toBeEnabled();
    await userEvent.click(undo);
    expect(onUndo).toHaveBeenCalledTimes(1);
  });

  it('sending: Undo is disabled', () => {
    renderRow({ pending: 'sending' });
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: /^Add on / })).toBeNull();
  });
});
