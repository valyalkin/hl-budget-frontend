'use client';

import type { Spending } from '@/app/lib/definitions';
import { formatMoney, shortDate } from '@/app/lib/utils';

const actionClass =
  'inline-flex size-9 items-center justify-center rounded-lg text-ink-2 hover:bg-line-soft focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-40';

/**
 * One spending, read-only. Edit and remove appear when the row is hovered or holds focus
 * (FR-031); they stay in the Tab order and the accessibility tree either way.
 */
export default function SpendingRow({
  spending,
  locked,
  removing,
  onEdit,
  onRemove,
}: {
  spending: Spending;
  /** Another row is open: edit and remove are unavailable (FR-033). */
  locked: boolean;
  removing: boolean;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const what = `${spending.merchant} on ${shortDate(spending.date)}`;
  const truncate = 'max-w-0 truncate';
  return (
    <tr className="group border-t border-line-soft focus-within:bg-surface-2 hover:bg-surface-2">
      <td className="px-3 py-2 whitespace-nowrap text-ink-2 tabular-nums">
        {shortDate(spending.date)}
      </td>
      <td
        className={`${truncate} px-3 py-2 font-medium`}
        title={spending.merchant}
      >
        {spending.merchant}
      </td>
      <td className={`${truncate} px-3 py-2`} title={spending.category.name}>
        <span className="rounded-md bg-line-soft px-1.5 py-0.5 text-xs font-medium text-ink-2">
          {spending.category.name}
        </span>
      </td>
      <td
        className={`${truncate} px-3 py-2 text-ink-2`}
        title={spending.account.name}
      >
        {spending.account.name}
      </td>
      <td className="px-3 py-2 text-right font-mono whitespace-nowrap tabular-nums">
        {formatMoney(spending.amount)}
      </td>
      <td className="px-2 py-1">
        <div className="flex justify-end gap-1 opacity-0 group-focus-within:opacity-100 group-hover:opacity-100">
          <button
            type="button"
            aria-label={`Edit ${what}`}
            disabled={locked || removing}
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
            type="button"
            aria-label={`Remove ${what}`}
            disabled={locked || removing}
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
      </td>
    </tr>
  );
}
