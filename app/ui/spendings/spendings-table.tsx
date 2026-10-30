'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { deleteSpending } from '@/app/lib/actions';
import type {
  MerchantOption,
  NamedItem,
  Spending,
} from '@/app/lib/definitions';
import {
  defaultDateFor,
  formatMoney,
  monthLabel,
  monthParam,
  plural,
  type MoneyValue,
  type YearMonth,
} from '@/app/lib/utils';
import { useOptionalImport } from '@/app/ui/import/import-provider';
import EntryRow from '@/app/ui/spendings/entry-row';
import SpendingRow from '@/app/ui/spendings/spending-row';

type OpenRow = null | { mode: 'add' } | { mode: 'edit'; spendingId: string };

/**
 * The month's spendings (US1) with inline add, edit and delete (US2–US4). Only one row is open at a
 * time (FR-033). The footer total comes from the server's month total, not a sum in the browser.
 */
export default function SpendingsTable({
  spendings,
  monthTotal,
  ym,
  today,
  currency,
  categories,
  accounts,
  merchants,
}: {
  spendings: Spending[];
  monthTotal: MoneyValue;
  ym: YearMonth;
  today: string;
  currency: string;
  categories: NamedItem[];
  accounts: NamedItem[];
  merchants: MerchantOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState<OpenRow>(null);
  const [message, setMessage] = useState('');
  const [removing, setRemoving] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const setImportRowOpen = useOptionalImport()?.setRowOpen;
  const rowOpen = open !== null;

  // While a row is open, "Import CSV" is unavailable, like the + button (feature 004 Edge Cases).
  useEffect(() => {
    setImportRowOpen?.(rowOpen);
    return () => setImportRowOpen?.(false);
  }, [setImportRowOpen, rowOpen]);

  // Enter anywhere on the page opens a new row, as long as nothing has focus (so Enter on a
  // button, link or field keeps its own meaning) and no dialog such as Settings is open.
  useEffect(() => {
    if (open !== null) {
      return undefined;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      const idle =
        document.activeElement === null ||
        document.activeElement === document.body;
      if (
        event.key !== 'Enter' ||
        event.repeat ||
        event.isComposing ||
        event.defaultPrevented ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        !idle ||
        document.querySelector('dialog[open]')
      ) {
        return;
      }
      event.preventDefault();
      setMessage('');
      setOpen({ mode: 'add' });
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const onSaved = (month: string) => {
    setOpen(null);
    setMessage('');
    if (month !== monthParam(ym)) {
      router.push(`/spendings?month=${month}`);
    }
  };

  const onGone = (text: string) => {
    setOpen(null);
    setMessage(text);
  };

  const remove = (spending: Spending) => {
    if (removing) {
      return;
    }
    setRemoving(spending.id);
    setMessage('');
    startTransition(async () => {
      const result = await deleteSpending(spending.id);
      setRemoving(null);
      if (result.status === 'signed-out') {
        router.replace('/');
      } else if (result.status === 'error') {
        setMessage(result.message);
      }
    });
  };

  const rowProps = {
    today,
    currency,
    categories,
    accounts,
    merchants,
    onSaved,
    onGone,
    onCancel: () => setOpen(null),
  };

  return (
    <section
      aria-label="Spending list"
      className="overflow-hidden rounded-2xl bg-surface ring-1 ring-line"
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] table-fixed text-sm">
          <caption className="sr-only">Spendings in {monthLabel(ym)}</caption>
          <colgroup>
            <col className="w-40" />
            <col />
            <col className="w-40" />
            <col className="w-32" />
            <col className="w-28" />
            <col className="w-24" />
          </colgroup>
          <thead>
            <tr className="text-left text-xs font-semibold tracking-wide text-muted uppercase">
              <th scope="col" className="px-3 py-2.5">
                Date
              </th>
              <th scope="col" className="px-3 py-2.5">
                Merchant
              </th>
              <th scope="col" className="px-3 py-2.5">
                Category
              </th>
              <th scope="col" className="px-3 py-2.5">
                Account
              </th>
              <th scope="col" className="px-3 py-2.5 text-right">
                Amount
              </th>
              <th scope="col" className="px-2 py-1.5 text-right">
                <button
                  type="button"
                  aria-label="Add a spending row"
                  title="Add a spending row (Enter)"
                  aria-keyshortcuts="Enter"
                  disabled={open !== null}
                  onClick={() => {
                    setMessage('');
                    setOpen({ mode: 'add' });
                  }}
                  className="inline-flex size-9 items-center justify-center rounded-lg bg-brand text-white hover:bg-brand-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-40"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 16 16"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M8 3v10M3 8h10"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {open?.mode === 'add' ? (
              <EntryRow
                mode="add"
                initial={{
                  date: defaultDateFor(ym, today),
                  merchant: '',
                  category: '',
                  account: '',
                  amount: '',
                }}
                {...rowProps}
              />
            ) : null}
            {spendings.map((spending) =>
              open?.mode === 'edit' && open.spendingId === spending.id ? (
                <EntryRow
                  key={spending.id}
                  mode="edit"
                  spendingId={spending.id}
                  initial={{
                    date: spending.date,
                    merchant: spending.merchant,
                    category: spending.category.name,
                    account: spending.account.name,
                    amount: spending.amount.amount,
                  }}
                  {...rowProps}
                />
              ) : (
                <SpendingRow
                  key={spending.id}
                  spending={spending}
                  locked={open !== null}
                  removing={removing === spending.id}
                  onEdit={() => {
                    setMessage('');
                    setOpen({ mode: 'edit', spendingId: spending.id });
                  }}
                  onRemove={() => remove(spending)}
                />
              ),
            )}
          </tbody>
        </table>
      </div>
      {spendings.length === 0 ? (
        <p className="px-5 py-9 text-center text-muted">
          No spendings recorded in {monthLabel(ym)}.
        </p>
      ) : (
        <div className="flex items-center justify-between border-t border-line px-4 py-3 text-sm">
          <span className="text-muted">
            {plural(spendings.length, 'spending', 'spendings')}
          </span>
          <span className="font-mono font-semibold tabular-nums">
            {formatMoney(monthTotal)}
          </span>
        </div>
      )}
      <p
        aria-live="polite"
        aria-atomic="true"
        className={
          message ? 'px-4 pb-3 text-sm font-medium text-error' : undefined
        }
      >
        {message}
      </p>
    </section>
  );
}
