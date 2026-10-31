'use client';

import type { Spending } from '@/app/lib/definitions';
import { noSpendingsIn } from '@/app/lib/messages';
import { formatMoney, shortDate } from '@/app/lib/utils';
import { PlusIcon } from '@/app/ui/phone/icons';
import { usePhoneUi } from '@/app/ui/phone/phone-ui-provider';

/**
 * The month's spendings, newest first (FR-018): date, category and amount; a tap opens it. The
 * floating Add spending button stays on screen while the list scrolls (FR-020).
 */
export default function SpendingList({
  spendings,
  label,
}: {
  spendings: readonly Spending[];
  label: string;
}) {
  const { open } = usePhoneUi();
  return (
    <>
      <div className="px-4 pt-4">
        {spendings.length === 0 ? (
          <p className="rounded-2xl bg-surface px-4 py-8 text-center text-muted">
            {noSpendingsIn(label)}
          </p>
        ) : (
          <ul className="divide-y divide-line-soft overflow-hidden rounded-2xl bg-surface ring-1 ring-line">
            {spendings.map((spending) => (
              <li key={spending.id}>
                <button
                  type="button"
                  onClick={() =>
                    open({ kind: 'edit', spendingId: spending.id })
                  }
                  className="grid min-h-14 w-full grid-cols-[4.25rem_minmax(0,1fr)_auto] items-center gap-3 px-4 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand active:bg-line-soft"
                >
                  <span className="text-sm text-muted tabular-nums">
                    {shortDate(spending.date)}
                    <span className="sr-only">, </span>
                  </span>
                  <span className="truncate font-medium">
                    {spending.category.name}
                    <span className="sr-only">, </span>
                  </span>
                  {/* The merchant isn't shown, but screen readers hear it (FR-021). */}
                  <span className="font-mono font-medium tabular-nums">
                    {formatMoney(spending.amount)}
                    <span className="sr-only">, {spending.merchant}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {/* Room for the floating button, so it never covers the last row. */}
        <div
          aria-hidden="true"
          className="h-[calc(6rem+env(safe-area-inset-bottom))]"
        />
      </div>
      <button
        type="button"
        onClick={() => open({ kind: 'edit' })}
        className="fixed right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-10 inline-flex h-14 items-center gap-2 rounded-full bg-brand pr-6 pl-5 font-semibold text-white shadow-[0_8px_24px_rgb(18_59_44/0.35)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand active:bg-brand-strong"
      >
        <PlusIcon />
        Add spending
      </button>
    </>
  );
}
