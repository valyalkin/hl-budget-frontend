'use client';

import clsx from 'clsx';
import { type ReactNode, type SyntheticEvent, useEffect, useRef } from 'react';

type PhoneDialogProps = {
  /** A full-screen screen, or a sheet anchored to the bottom over a dimmed backdrop. */
  variant: 'screen' | 'sheet';
  /** The dialog's accessible name, unless `labelledBy` points at a heading inside it. */
  label?: string;
  labelledBy?: string;
  role?: 'dialog' | 'alertdialog';
  /** Escape, or a tap on a sheet's backdrop. The owner decides what closing means. */
  onDismiss: () => void;
  /** A sheet's backdrop button name, e.g. "Close menu". */
  backdropLabel?: string;
  children: ReactNode;
};

/**
 * Every phone screen and sheet (research R-005): a native modal <dialog>, so the page behind is
 * inert, focus stays inside and Escape is handled. It opens when mounted and closes when unmounted;
 * `data-phone` lets globals.css lock the page's scroll while it is open.
 */
export default function PhoneDialog({
  variant,
  label,
  labelledBy,
  role,
  onDismiss,
  backdropLabel,
  children,
}: PhoneDialogProps) {
  const ref = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
    return () => {
      if (dialog?.open) {
        dialog.close();
      }
    };
  }, []);

  const onCancel = (event: SyntheticEvent<HTMLDialogElement>) => {
    event.preventDefault();
    onDismiss();
  };

  return (
    <dialog
      ref={ref}
      data-phone=""
      role={role === 'alertdialog' ? 'alertdialog' : undefined}
      aria-label={labelledBy ? undefined : label}
      aria-labelledby={labelledBy}
      aria-modal="true"
      onCancel={onCancel}
      className={clsx(
        'm-0 h-dvh max-h-none w-full max-w-none border-0 p-0 text-ink backdrop:bg-transparent',
        variant === 'screen' ? 'bg-ground' : 'bg-transparent',
      )}
    >
      {variant === 'screen' ? (
        <div className="flex h-full flex-col">{children}</div>
      ) : (
        <div className="flex h-full flex-col justify-end">
          <div className="relative z-10 rounded-t-3xl bg-surface px-4 pt-2 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-[0_-8px_32px_rgb(23_25_26/0.18)]">
            <div
              aria-hidden="true"
              className="mx-auto mb-3 h-1 w-10 rounded-full bg-line"
            />
            {children}
          </div>
          <button
            type="button"
            tabIndex={-1}
            aria-label={backdropLabel ?? 'Close'}
            onClick={onDismiss}
            className="absolute inset-0 bg-ink/40"
          />
        </div>
      )}
    </dialog>
  );
}
