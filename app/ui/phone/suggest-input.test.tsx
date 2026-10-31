import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import SuggestInput from '@/app/ui/phone/suggest-input';

const items = [
  { name: 'Groceries', count: 10 },
  { name: 'Gifts', count: 1 },
  { name: 'Gas', count: 4 },
  { name: 'Rent', count: 2 },
  { name: 'Taxi', count: 0 },
  { name: 'Travel', count: 0 },
  { name: 'Pet', count: 0 },
];

function Field({ onPick }: { onPick?: (item: { name: string }) => void }) {
  const [value, setValue] = useState('');
  return (
    <SuggestInput
      label="Category"
      value={value}
      onChange={setValue}
      items={items}
      onPick={onPick}
    />
  );
}

describe('SuggestInput', () => {
  it('lists the 6 most used when focused empty, and narrows as you type', async () => {
    render(<Field />);
    const input = screen.getByRole('combobox', { name: 'Category' });
    expect(input).toHaveClass('text-base');
    await userEvent.click(input);
    expect(screen.getAllByRole('option')).toHaveLength(6);
    expect(screen.getAllByRole('option')[0]).toHaveTextContent('Groceries');
    await userEvent.type(input, 'g');
    expect(
      screen
        .getAllByRole('option')
        .map((o) => o.textContent?.replace(/\d+$/, '')),
    ).toEqual(['Groceries', 'Gas', 'Gifts']);
  });

  it('picks a tapped option', async () => {
    const onPick = vi.fn();
    render(<Field onPick={onPick} />);
    const input = screen.getByRole('combobox', { name: 'Category' });
    await userEvent.type(input, 'ga');
    await userEvent.click(screen.getByRole('option', { name: /Gas/ }));
    expect(input).toHaveValue('Gas');
    expect(onPick).toHaveBeenCalledWith(items[2]);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('keeps text that matches nothing, as a new name', async () => {
    render(<Field />);
    const input = screen.getByRole('combobox', { name: 'Category' });
    await userEvent.type(input, 'Coffee');
    expect(input).toHaveValue('Coffee');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});
