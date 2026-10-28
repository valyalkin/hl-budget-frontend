import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import Combobox from '@/app/ui/spendings/combobox';

const options = [
  { name: 'Gifts', count: 1 },
  { name: 'Groceries', count: 10 },
  { name: 'Rent', count: 1 },
];

function Harness({
  onCommit = () => {},
  onKeyDown = () => {},
  initial = '',
}: {
  onCommit?: (text: string) => void;
  onKeyDown?: (key: string) => void;
  initial?: string;
}) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <Combobox
        label="Category"
        value={value}
        onChange={setValue}
        options={options}
        onCommit={onCommit}
        onKeyDown={(event) => onKeyDown(event.key)}
        createHint
      />
      <input aria-label="Next" />
    </>
  );
}

const input = () =>
  screen.getByRole('combobox', { name: 'Category' }) as HTMLInputElement;

describe('Combobox', () => {
  it('is a combobox with an inline-autocompleting listbox', async () => {
    render(<Harness />);
    expect(input()).toHaveAttribute('aria-autocomplete', 'both');
    await userEvent.click(input());
    expect(input()).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual([
      'Groceries10',
      'Gifts1',
      'Rent1',
    ]);
  });

  it('autofills the most used prefix match with the rest selected', async () => {
    render(<Harness />);
    await userEvent.type(input(), 'g');
    expect(input().value).toBe('groceries');
    expect(input().selectionStart).toBe(1);
    expect(input().selectionEnd).toBe(9);

    await userEvent.keyboard('i');
    expect(input().value).toBe('gifts');
  });

  it('keeps what was typed when nothing matches, and offers to create it', async () => {
    render(<Harness />);
    await userEvent.type(input(), 'gz');
    expect(input().value).toBe('gz');
    expect(screen.getByText('Create “gz” on save')).toBeInTheDocument();
  });

  it('Backspace removes the suggested rest only', async () => {
    render(<Harness />);
    await userEvent.type(input(), 'g');
    await userEvent.keyboard('{Backspace}');
    expect(input().value).toBe('g');
  });

  it('Tab accepts the suggestion and moves on', async () => {
    const onCommit = vi.fn();
    render(<Harness onCommit={onCommit} />);
    await userEvent.type(input(), 'gr');
    await userEvent.tab();
    expect(input().value).toBe('Groceries');
    expect(onCommit).toHaveBeenCalledWith('Groceries');
    expect(screen.getByRole('textbox', { name: 'Next' })).toHaveFocus();
  });

  it('arrow keys move through the list and Enter picks', async () => {
    const onKeyDown = vi.fn();
    render(<Harness onKeyDown={onKeyDown} />);
    await userEvent.click(input());
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    const active = input().getAttribute('aria-activedescendant');
    expect(screen.getByRole('option', { name: /Gifts/ })).toHaveAttribute(
      'id',
      active,
    );
    await userEvent.keyboard('{Enter}');
    expect(input().value).toBe('Gifts');
    expect(onKeyDown).toHaveBeenCalledWith('Enter');
  });

  it('Escape closes the list first and only then reaches the row', async () => {
    const onKeyDown = vi.fn();
    render(<Harness onKeyDown={onKeyDown} />);
    await userEvent.click(input());
    await userEvent.keyboard('{Escape}');
    expect(input()).toHaveAttribute('aria-expanded', 'false');
    expect(onKeyDown).not.toHaveBeenCalled();
    await userEvent.keyboard('{Escape}');
    expect(onKeyDown).toHaveBeenCalledWith('Escape');
  });

  it('selects an existing value on focus and does not autofill until typing', async () => {
    render(<Harness initial="Rent" />);
    await userEvent.click(input());
    expect(input().selectionStart).toBe(0);
    expect(input().selectionEnd).toBe(4);
    expect(input().value).toBe('Rent');
  });

  it('a click on an option picks it', async () => {
    render(<Harness />);
    await userEvent.click(input());
    await userEvent.click(screen.getByRole('option', { name: /Rent/ }));
    expect(input().value).toBe('Rent');
  });
});
