'use client';

import { useRouter } from 'next/navigation';
import { useId, useRef, useState, useTransition } from 'react';
import { deleteSpending } from '@/app/lib/actions';
import type { Spending } from '@/app/lib/definitions';
import { deleted, PHONE } from '@/app/lib/messages';
import { formatMoney, longDate } from '@/app/lib/utils';
import PhoneDialog from '@/app/ui/phone/phone-dialog';
import { usePhoneUi } from '@/app/ui/phone/phone-ui-provider';

/**
 * The delete confirmation (FR-061 – FR-063): a bottom sheet with the spending's merchant, amount
 * and date. Delete removes it and returns to the list with a note; Cancel keeps it.
 */
export default function DeleteSheet({ spending }: { spending: Spending }) {
  const router = useRouter();
  const ui = usePhoneUi();
  const id = useId();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState('');
  const deleting = useRef(false);
  const amount = formatMoney(spending.amount);

  const confirm = () => {
    if (deleting.current) {
      return;
    }
    deleting.current = true;
    setMessage('');
    startTransition(async () => {
      const result = await deleteSpending(spending.id);
      deleting.current = result.status === 'ok';
      if (result.status === 'ok') {
        // Close the sheet and the Edit screen, then say what went.
        ui.close(2, () => ui.notify(deleted(spending.merchant, amount)));
      } else if (result.status === 'signed-out') {
        router.replace('/');
      } else {
        setMessage(result.message);
      }
    });
  };

  return (
    <PhoneDialog
      variant="sheet"
      role="alertdialog"
      labelledBy={`${id}-title`}
      backdropLabel="Keep this spending"
      onDismiss={() => ui.close()}
    >
      <div className="flex flex-col gap-3">
        <h2 id={`${id}-title`} className="font-display text-xl font-bold">
          {PHONE.deleteTitle}
        </h2>
        <p className="text-ink-2">
          {spending.merchant} · {amount} · {longDate(spending.date)}
        </p>
        {message ? (
          <p
            role="alert"
            className="rounded-xl bg-error-tint px-4 py-3 text-sm font-medium text-error"
          >
            {message}
          </p>
        ) : null}
        <button
          type="button"
          onClick={confirm}
          disabled={pending}
          className="mt-2 min-h-13 rounded-xl bg-error px-4 font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-error disabled:opacity-60"
        >
          Delete spending
        </button>
        <button
          type="button"
          onClick={() => ui.close()}
          className="min-h-13 rounded-xl px-4 font-semibold text-ink-2 ring-1 ring-line focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand active:bg-line-soft"
        >
          Cancel
        </button>
      </div>
    </PhoneDialog>
  );
}
