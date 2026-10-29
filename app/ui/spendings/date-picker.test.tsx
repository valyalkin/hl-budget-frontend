import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import DatePicker from '@/app/ui/spendings/date-picker';

function Harness({
  initial = '2026-10-12',
  onChange = () => {},
}: {
  initial?: string;
  onChange?: (d: string) => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <DatePicker
      value={value}
      today="2026-10-28"
      onChange={(date) => {
        setValue(date);
        onChange(date);
      }}
    />
  );
}

const trigger = () => screen.getByRole('button', { name: /^Date / });

describe('DatePicker', () => {
  it('shows the date and opens a calendar of its month', async () => {
    render(<Harness />);
    expect(trigger()).toHaveAccessibleName('Date Oct 12, 2026. Open calendar');
    await userEvent.click(trigger());
    expect(
      screen.getByRole('dialog', { name: 'Choose date' }),
    ).toBeInTheDocument();
    expect(screen.getByText('October 2026')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Oct 12, 2026' })).toHaveFocus();
    expect(
      screen.getByRole('button', { name: 'Oct 12, 2026' }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('opens outside any clipping container, and a press outside closes it', async () => {
    render(
      <div data-testid="clip" style={{ overflow: 'hidden' }}>
        <Harness />
      </div>,
    );
    await userEvent.click(trigger());
    const dialog = screen.getByRole('dialog', { name: 'Choose date' });
    expect(screen.getByTestId('clip')).not.toContainElement(dialog);
    await userEvent.click(
      screen.getByRole('button', { name: 'Previous month' }),
    );
    expect(dialog).toBeInTheDocument();
    await userEvent.click(document.body);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('can open by itself, and reports a pick but not a close', async () => {
    const onPicked = vi.fn();
    render(
      <DatePicker
        value="2026-10-28"
        today="2026-10-28"
        onChange={() => {}}
        autoOpen
        onPicked={onPicked}
      />,
    );
    expect(screen.getByRole('button', { name: 'Oct 28, 2026' })).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(onPicked).not.toHaveBeenCalled();
    await userEvent.click(trigger());
    await userEvent.keyboard('{ArrowLeft}{Enter}');
    expect(onPicked).toHaveBeenCalledOnce();
  });

  it('does not let days after today be picked, nor go past today’s month', async () => {
    render(<Harness />);
    await userEvent.click(trigger());
    expect(screen.getByRole('button', { name: 'Oct 29, 2026' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next month' })).toBeDisabled();
    await userEvent.click(
      screen.getByRole('button', { name: 'Previous month' }),
    );
    expect(screen.getByText('September 2026')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next month' })).toBeEnabled();
  });

  it('arrow keys move between days and Enter picks one', async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await userEvent.click(trigger());
    await userEvent.keyboard('{ArrowRight}{ArrowDown}{Enter}');
    expect(onChange).toHaveBeenCalledWith('2026-10-20');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger()).toHaveFocus();
  });

  it('Today picks today, and Escape closes without a change', async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await userEvent.click(trigger());
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
    await userEvent.click(trigger());
    await userEvent.click(screen.getByRole('button', { name: 'Today' }));
    expect(onChange).toHaveBeenCalledWith('2026-10-28');
  });
});
