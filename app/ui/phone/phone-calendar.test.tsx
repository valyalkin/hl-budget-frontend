import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import PhoneCalendar, { dayLabel } from '@/app/ui/phone/phone-calendar';

function setup(value = '2026-10-12') {
  const onPick = vi.fn();
  const onClose = vi.fn();
  render(
    <PhoneCalendar
      value={value}
      today="2026-10-28"
      onPick={onPick}
      onClose={onClose}
    />,
  );
  return { onPick, onClose };
}

describe('PhoneCalendar', () => {
  it('names days in full and marks the chosen one', () => {
    expect(dayLabel('2026-10-27')).toBe('Tuesday, October 27, 2026');
    setup();
    expect(screen.getByText('October 2026')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Monday, October 12, 2026' }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('does not offer days after today, or later months', () => {
    setup();
    expect(
      screen.getByRole('button', { name: 'Thursday, October 29, 2026' }),
    ).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next month' })).toBeDisabled();
  });

  it('picks a day, goes back a month, and offers Today and Close', async () => {
    const { onPick, onClose } = setup();
    await userEvent.click(
      screen.getByRole('button', { name: 'Previous month' }),
    );
    expect(screen.getByText('September 2026')).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Friday, September 4, 2026' }),
    );
    expect(onPick).toHaveBeenLastCalledWith('2026-09-04');
    await userEvent.click(screen.getByRole('button', { name: 'Today' }));
    expect(onPick).toHaveBeenLastCalledWith('2026-10-28');
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('makes every day a 44px target', () => {
    setup();
    for (const day of screen.getAllByRole('button', { name: /, 2026$/ })) {
      expect(day).toHaveClass('size-11');
    }
  });
});
