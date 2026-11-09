'use client';

import type { Ref } from 'react';
import type { Spending } from '@/app/lib/definitions';
import { formatMoney, shortDate } from '@/app/lib/utils';

const actionClass =
  'inline-flex size-9 items-center justify-center rounded-lg text-ink-2 hover:bg-line-soft focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-40';

/**
 * One spending, read-only. Edit and remove appear when the row is hovered or holds focus
 * (FR-031); they stay in the Tab order and the accessibility tree either way.
 *
 * specs/010: the date is a button that opens a new row on that date (US1). After remove, the row
 * is `pending` for 5 seconds (US2): faded, with an always-visible Undo in place of edit and remove.
 */
export default function SpendingRow({
  spending,
  locked,
  pending,
  onEdit,
  onRemove,
  onAddOnDate,
  onUndo,
  removeRef,
  undoRef,
}: {
  spending: Spending;
  /** Another row is open: quick add, edit and remove are unavailable (FR-033). */
  locked: boolean;
  /** Removed and waiting to be deleted, or being deleted (specs/010 US2). */
  pending?: 'waiting' | 'sending';
  onEdit: () => void;
  onRemove: () => void;
  onAddOnDate: () => void;
  onUndo: () => void;
  removeRef?: Ref<HTMLButtonElement>;
  undoRef?: Ref<HTMLButtonElement>;
}) {
  const day = shortDate(spending.date);
  const what = `${spending.merchant} on ${day}`;
  const truncate = 'max-w-0 truncate';
  const fade = pending ? 'opacity-50' : '';
  return (
    <tr
      data-pending={pending ? 'true' : undefined}
      className="group border-t border-line-soft focus-within:bg-surface-2 hover:bg-surface-2"
    >
      <td
        className={`${fade} px-3 py-2 whitespace-nowrap text-ink-2 tabular-nums`}
      >
        {locked || pending ? (
          day
        ) : (
          <button
            type="button"
            aria-label={`Add on ${day}`}
            title={`Add on ${day}`}
            onClick={onAddOnDate}
            className="-mx-1 cursor-pointer rounded px-1 underline-offset-2 hover:text-ink hover:underline focus-visible:underline focus-visible:outline-2 focus-visible:outline-brand"
          >
            {day}
          </button>
        )}
      </td>
      <td
        className={`${fade} ${truncate} px-3 py-2 font-medium`}
        title={spending.merchant}
      >
        {spending.merchant}
      </td>
      <td
        className={`${fade} ${truncate} px-3 py-2`}
        title={spending.category.name}
      >
        <span className="rounded-md bg-line-soft px-1.5 py-0.5 text-xs font-medium text-ink-2">
          {spending.category.name}
        </span>
      </td>
      <td
        className={`${fade} ${truncate} px-3 py-2 text-ink-2`}
        title={spending.account.name}
      >
        {spending.account.name}
      </td>
      <td
        className={`${fade} px-3 py-2 text-right font-mono whitespace-nowrap tabular-nums`}
      >
        {formatMoney(spending.amount)}
      </td>
      <td className="px-2 py-1">
        {pending ? (
          <div className="flex justify-end">
            <button
              ref={undoRef}
              type="button"
              aria-label="Undo"
              title="Undo remove"
              disabled={pending === 'sending'}
              onClick={onUndo}
              className={actionClass}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M5.5 3L2.5 6l3 3M2.5 6h7a4 4 0 010 8H7"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        ) : (
          <div className="flex justify-end gap-1 opacity-0 group-focus-within:opacity-100 group-hover:opacity-100">
            <button
              type="button"
              aria-label={`Edit ${what}`}
              disabled={locked}
              onClick={onEdit}
              className={actionClass}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M10.5 2.5l3 3L6 13H3v-3l7.5-7.5z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button
              ref={removeRef}
              type="button"
              aria-label={`Remove ${what}`}
              disabled={locked}
              onClick={onRemove}
              className={`${actionClass} hover:text-error`}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.7 8.5h5.6l.7-8.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}
