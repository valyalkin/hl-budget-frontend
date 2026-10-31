import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import PhoneDialog from '@/app/ui/phone/phone-dialog';

describe('PhoneDialog', () => {
  it('opens a labelled native modal dialog marked for the phone scroll lock', () => {
    const showModal = vi.spyOn(HTMLDialogElement.prototype, 'showModal');
    render(
      <PhoneDialog variant="screen" label="Settings" onDismiss={vi.fn()}>
        <p>content</p>
      </PhoneDialog>,
    );
    const dialog = screen.getByRole('dialog', { name: 'Settings' });
    expect(showModal).toHaveBeenCalledOnce();
    expect(dialog).toHaveAttribute('data-phone');
    expect(dialog).toHaveAttribute('open');
  });

  it('turns Escape into onDismiss instead of closing by itself', () => {
    const onDismiss = vi.fn();
    render(
      <PhoneDialog variant="screen" label="Import CSV" onDismiss={onDismiss}>
        <p>content</p>
      </PhoneDialog>,
    );
    const dialog = screen.getByRole('dialog', { name: 'Import CSV' });
    const cancel = new Event('cancel', { cancelable: true });
    fireEvent(dialog, cancel);
    expect(cancel.defaultPrevented).toBe(true);
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('a sheet closes from its backdrop, and can be an alert dialog', async () => {
    const onDismiss = vi.fn();
    render(
      <PhoneDialog
        variant="sheet"
        role="alertdialog"
        labelledBy="t"
        backdropLabel="Keep this spending"
        onDismiss={onDismiss}
      >
        <h2 id="t">Delete this spending?</h2>
      </PhoneDialog>,
    );
    expect(
      screen.getByRole('alertdialog', { name: 'Delete this spending?' }),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Keep this spending' }),
    );
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('closes the dialog when unmounted', () => {
    const close = vi.spyOn(HTMLDialogElement.prototype, 'close');
    const { unmount } = render(
      <PhoneDialog variant="screen" label="Settings" onDismiss={vi.fn()}>
        <p>content</p>
      </PhoneDialog>,
    );
    unmount();
    expect(close).toHaveBeenCalled();
  });
});
