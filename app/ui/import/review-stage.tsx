'use client';

import { useRouter } from 'next/navigation';
import { useId, useRef, useState, useTransition } from 'react';
import { importSpendings } from '@/app/lib/actions';
import type { ImportRow as Row } from '@/app/lib/csv-import';
import { type Draft, draftProblems, type Field } from '@/app/lib/draft';
import { addLabel, needAttention, rowCount } from '@/app/lib/messages';
import {
  formatCents,
  parseAmountInput,
  plural,
  toCents,
} from '@/app/lib/utils';
import { CloseIcon } from '@/app/ui/import/icons';
import ImportRow from '@/app/ui/import/import-row';
import type { ImportLookups } from '@/app/ui/import/import-provider';

type Problems = Partial<Record<Field, string>>;

/**
 * The second stage of the import (US1, US2): every row of the file, editable, with the fields
 * that need attention highlighted. "Add N spendings" stays unavailable until every row is valid
 * (FR-031), then adds them all in one request (FR-032 – FR-034).
 *
 * The Idempotency-Key is kept across retries. It changes only after the server refused rows (a
 * 422: nothing was saved) and the user then edits, never after "couldn't reach the server",
 * which may have saved (research R-013).
 */
export default function ReviewStage({
  headingId,
  fileName,
  initialRows,
  lookups,
  onCancel,
  onAdded,
  onAlreadyImported,
}: {
  headingId: string;
  fileName: string;
  initialRows: readonly Row[];
  lookups: ImportLookups;
  onCancel: () => void;
  onAdded: (month: string, count: number) => void;
  onAlreadyImported: () => void;
}) {
  const router = useRouter();
  const messageId = useId();
  const { today, currency, categories, accounts, merchants } = lookups;
  const [rows, setRows] = useState<Row[]>([...initialRows]);
  const [serverErrors, setServerErrors] = useState<Record<string, Problems>>(
    {},
  );
  const [idempotencyKey, setIdempotencyKey] = useState(() =>
    crypto.randomUUID(),
  );
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const adding = useRef(false);
  const renewKey = useRef(false);
  const dates = useRef(new Map<string, HTMLButtonElement>());

  const problemsOf = (row: Row): Problems => ({
    ...serverErrors[row.key],
    ...draftProblems(row.draft, today),
  });
  const needing = rows.filter(
    (row) => Object.keys(problemsOf(row)).length > 0,
  ).length;
  const totalCents = rows.reduce((sum, row) => {
    const amount = parseAmountInput(row.draft.amount);
    return amount ? sum + toCents(amount) : sum;
  }, 0);
  const canAdd = rows.length > 0 && needing === 0;

  const changed = () => {
    if (renewKey.current) {
      renewKey.current = false;
      setIdempotencyKey(crypto.randomUUID());
    }
  };

  const update = (key: string, patch: Partial<Draft>) => {
    setRows((current) =>
      current.map((row) =>
        row.key === key ? { ...row, draft: { ...row.draft, ...patch } } : row,
      ),
    );
    setServerErrors((current) => {
      const errors = current[key];
      if (!errors) {
        return current;
      }
      const kept = Object.fromEntries(
        Object.entries(errors).filter(([field]) => !(field in patch)),
      );
      return { ...current, [key]: kept };
    });
    changed();
  };

  const remove = (key: string) => {
    setRows((current) => current.filter((row) => row.key !== key));
    changed();
  };

  const focusAfter = (key: string) => {
    const index = rows.findIndex((row) => row.key === key);
    const next = rows[index + 1];
    if (next) {
      dates.current.get(next.key)?.focus();
    }
  };

  const add = () => {
    if (!canAdd || adding.current) {
      return;
    }
    adding.current = true;
    setMessage(null);
    const sent = rows;
    startTransition(async () => {
      const result = await importSpendings({
        rows: sent,
        idempotencyKey,
        today,
        currency,
      });
      adding.current = false;
      if (result.status === 'ok') {
        onAdded(result.month, result.count);
      } else if (result.status === 'already-imported') {
        onAlreadyImported();
      } else if (result.status === 'signed-out') {
        router.replace('/');
      } else if (!result.rowErrors || result.rowErrors.length === 0) {
        // Nothing to highlight, e.g. the server could not be reached: say so under the rows.
        setMessage(result.message);
      } else {
        // The badge already counts the refused rows; the fields show why.
        const errors: Record<string, Problems> = {};
        for (const { row, field, message: text } of result.rowErrors) {
          const key = sent[row]?.key;
          if (key) {
            errors[key] = { ...errors[key], [field]: text };
          }
        }
        setServerErrors(errors);
        renewKey.current = true;
      }
    });
  };

  return (
    <div className="flex max-h-[calc(100dvh-2rem)] flex-col">
      <div className="flex items-start justify-between gap-4 border-b border-line-soft px-6 py-4">
        <div className="flex flex-col gap-0.5">
          <h2 id={headingId} className="font-display text-[22px] font-bold">
            Review import
          </h2>
          <span className="text-sm text-muted">
            {fileName} · {rowCount(rows.length)}
          </span>
        </div>
        <button
          type="button"
          aria-label="Cancel import"
          onClick={onCancel}
          className="inline-flex size-11 items-center justify-center rounded-xl text-ink-2 hover:bg-line-soft focus-visible:outline-2 focus-visible:outline-brand"
        >
          <CloseIcon />
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-3 px-6 py-3 text-sm">
        {rows.length === 0 ? null : needing > 0 ? (
          <span className="rounded-full bg-error-tint px-3 py-1 font-semibold text-error">
            {needAttention(needing)}
          </span>
        ) : (
          <span className="rounded-full bg-brand-tint px-3 py-1 font-semibold text-brand-strong">
            All rows look good
          </span>
        )}
        <span className="text-muted">
          Highlighted fields need your attention. Remove a row to leave it out.
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto border-y border-line-soft">
        {rows.length === 0 ? (
          <p className="px-5 py-9 text-center text-muted">
            No rows left to import.
          </p>
        ) : (
          <table
            aria-label="Rows to import"
            className="w-full min-w-[840px] text-sm"
          >
            <thead className="sticky top-0 z-10 bg-surface-2 text-left text-xs font-semibold text-muted uppercase">
              <tr>
                <th scope="col" className="px-2 py-2">
                  Date
                </th>
                <th scope="col" className="px-2 py-2">
                  Merchant
                </th>
                <th scope="col" className="px-2 py-2">
                  Category
                </th>
                <th scope="col" className="px-2 py-2">
                  Account
                </th>
                <th scope="col" className="px-2 py-2 text-right">
                  Amount
                </th>
                <th scope="col" className="px-2 py-2">
                  <span className="sr-only">Remove</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <ImportRow
                  key={row.key}
                  row={row}
                  number={index + 1}
                  problems={problemsOf(row)}
                  today={today}
                  currency={currency}
                  categories={categories}
                  accounts={accounts}
                  merchants={merchants}
                  onChange={update}
                  onRemove={remove}
                  onDone={focusAfter}
                  dateRef={(key, element) => {
                    if (element) {
                      dates.current.set(key, element);
                    } else {
                      dates.current.delete(key);
                    }
                  }}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
        <div className="flex flex-col gap-1">
          <span className="text-sm text-muted">
            {plural(rows.length, 'spending', 'spendings')} · total{' '}
            {formatCents(totalCents, currency)}
          </span>
          <p
            id={messageId}
            aria-live="polite"
            aria-atomic="true"
            className="text-sm font-medium text-error"
          >
            {message ?? ''}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 rounded-xl border border-line bg-surface px-5 font-medium hover:bg-line-soft focus-visible:outline-2 focus-visible:outline-brand"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canAdd || pending}
            aria-describedby={message ? messageId : undefined}
            onClick={add}
            className="min-h-11 rounded-xl bg-brand px-6 font-semibold text-white hover:bg-brand-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:bg-line disabled:text-disabled"
          >
            {addLabel(canAdd ? rows.length : 0)}
          </button>
        </div>
      </div>
    </div>
  );
}
