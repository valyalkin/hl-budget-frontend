'use client';

import { useRouter } from 'next/navigation';
import {
  type KeyboardEvent,
  useId,
  useRef,
  useState,
  useTransition,
} from 'react';
import { saveSpending } from '@/app/lib/actions';
import type { MerchantOption, NamedItem } from '@/app/lib/definitions';
import { type Draft, draftProblem, type Field, FIELDS } from '@/app/lib/draft';
import { exactMatch } from '@/app/lib/utils';
import Combobox from '@/app/ui/spendings/combobox';
import DatePicker from '@/app/ui/spendings/date-picker';

export type EntryRowProps = {
  mode: 'add' | 'edit';
  spendingId?: string;
  initial: Draft;
  today: string;
  currency: string;
  categories: readonly NamedItem[];
  accounts: readonly NamedItem[];
  merchants: readonly MerchantOption[];
  /** Saved: the month (`YYYY-MM`) of the saved spending. */
  onSaved: (month: string) => void;
  onCancel: () => void;
  /** The edited spending no longer exists; the table shows `message`. */
  onGone: (message: string) => void;
};

const iconButton =
  'inline-flex size-9 items-center justify-center rounded-lg focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-50';

/** The item's id when the text names one exactly, else the trimmed text as a new name. */
function refFor(text: string, items: readonly NamedItem[]) {
  const match = exactMatch(text, items);
  return match ? { id: match.id } : { name: text.trim() };
}

/**
 * The editable row for adding or editing a spending (US2–US4). Keyboard rules (FR-053–FR-056):
 * Tab moves through date, merchant, category, account, amount; Enter saves when every field is
 * complete and otherwise moves to the next field; Tab or Enter on amount saves, or shows the
 * first problem and focuses it; Escape cancels once no list or calendar is open. Accepting a past
 * merchant fills an empty category and account from its latest spending (FR-058).
 */
export default function EntryRow({
  mode,
  spendingId,
  initial,
  today,
  currency,
  categories,
  accounts,
  merchants,
  onSaved,
  onCancel,
  onGone,
}: EntryRowProps) {
  const router = useRouter();
  const errorId = useId();
  const [draft, setDraft] = useState<Draft>(initial);
  const latest = useRef<Draft>(initial);
  const [error, setError] = useState<{
    field?: string;
    message: string;
  } | null>(null);
  const [pending, startTransition] = useTransition();
  const saving = useRef(false);
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const refs = useRef<Partial<Record<Field, HTMLElement | null>>>({});

  const update = (patch: Partial<Draft>) => {
    latest.current = { ...latest.current, ...patch };
    setDraft(latest.current);
  };

  const focus = (field: Field) => {
    refs.current[field]?.focus();
  };

  const save = () => {
    const current = latest.current;
    const problem = draftProblem(current, today);
    if (problem) {
      setError(problem);
      focus(problem.field);
      return;
    }
    if (saving.current) {
      return;
    }
    saving.current = true;
    setError(null);
    startTransition(async () => {
      const result = await saveSpending({
        mode,
        spendingId,
        idempotencyKey: mode === 'add' ? idempotencyKey : undefined,
        today,
        date: current.date,
        merchant: current.merchant,
        category: refFor(current.category, categories),
        categoryText: current.category,
        account: refFor(current.account, accounts),
        accountText: current.account,
        amount: current.amount,
        currency,
      });
      saving.current = false;
      if (result.status === 'ok') {
        onSaved(result.month);
      } else if (result.status === 'signed-out') {
        router.replace('/');
      } else if (result.gone) {
        onGone(result.message);
      } else {
        setError({ field: result.field, message: result.message });
        const field = FIELDS.find((f) => f === result.field);
        if (field) {
          focus(field);
        }
      }
    });
  };

  const next = (field: Field) => FIELDS[FIELDS.indexOf(field) + 1];

  const onFieldKeyDown = (
    field: Field,
    event: KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onCancel();
      return;
    }
    const last = field === 'amount';
    if (
      event.key === 'Enter' ||
      (event.key === 'Tab' && !event.shiftKey && last)
    ) {
      event.preventDefault();
      const following = next(field);
      if (last || !draftProblem(latest.current, today) || !following) {
        save();
      } else {
        focus(following);
      }
    }
  };

  const fillFromMerchant = (text: string) => {
    const merchant = exactMatch(text, merchants);
    if (!merchant) {
      return;
    }
    const patch: Partial<Draft> = {};
    if (!latest.current.category.trim()) {
      patch.category = merchant.lastCategory.name;
    }
    if (!latest.current.account.trim()) {
      patch.account = merchant.lastAccount.name;
    }
    if (Object.keys(patch).length > 0) {
      update(patch);
    }
  };

  const invalid = (field: Field) => error?.field === field;
  const described = (field: Field) => (invalid(field) ? errorId : undefined);
  const cell = 'px-2 py-2 align-top';

  return (
    <>
      <tr className="bg-brand-tint/40">
        <td className={`${cell} w-40`}>
          <DatePicker
            value={draft.date}
            today={today}
            onChange={(date) => update({ date })}
            buttonRef={(element) => {
              refs.current.date = element;
            }}
          />
        </td>
        <td className={cell}>
          <Combobox
            label="Merchant"
            placeholder="Merchant"
            value={draft.merchant}
            onChange={(merchant) => update({ merchant })}
            options={merchants}
            onCommit={fillFromMerchant}
            onKeyDown={(event) => onFieldKeyDown('merchant', event)}
            inputRef={(element) => {
              refs.current.merchant = element;
            }}
            invalid={invalid('merchant')}
            describedBy={described('merchant')}
            maxLength={255}
          />
        </td>
        <td className={cell}>
          <Combobox
            label="Category"
            placeholder="Choose or type"
            value={draft.category}
            onChange={(category) => update({ category })}
            options={categories}
            onKeyDown={(event) => onFieldKeyDown('category', event)}
            inputRef={(element) => {
              refs.current.category = element;
            }}
            invalid={invalid('category')}
            describedBy={described('category')}
            createHint
            maxLength={50}
          />
        </td>
        <td className={cell}>
          <Combobox
            label="Account"
            placeholder="Account"
            value={draft.account}
            onChange={(account) => update({ account })}
            options={accounts}
            onKeyDown={(event) => onFieldKeyDown('account', event)}
            inputRef={(element) => {
              refs.current.account = element;
            }}
            invalid={invalid('account')}
            describedBy={described('account')}
            createHint
            maxLength={50}
          />
        </td>
        <td className={`${cell} w-32`}>
          <input
            ref={(element) => {
              refs.current.amount = element;
            }}
            type="text"
            inputMode="decimal"
            aria-label={`Amount in ${currency}`}
            aria-invalid={invalid('amount') || undefined}
            aria-describedby={described('amount')}
            placeholder="0.00"
            autoComplete="off"
            value={draft.amount}
            onChange={(event) => update({ amount: event.target.value })}
            onKeyDown={(event) => onFieldKeyDown('amount', event)}
            className={`h-9 w-full rounded-lg border bg-surface px-2.5 text-right font-mono text-sm tabular-nums placeholder:text-muted focus:outline-2 focus:outline-brand ${
              invalid('amount') ? 'border-error' : 'border-line'
            }`}
          />
        </td>
        <td className={`${cell} w-24`}>
          <div className="flex justify-end gap-1">
            <button
              type="button"
              aria-label={mode === 'add' ? 'Save spending' : 'Save changes'}
              disabled={pending}
              onClick={save}
              className={`${iconButton} bg-brand text-white hover:bg-brand-strong`}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 18 18"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M3.5 9.5l3.5 3.5 7.5-8"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button
              type="button"
              aria-label={
                mode === 'add' ? 'Cancel new spending' : 'Cancel changes'
              }
              onClick={onCancel}
              className={`${iconButton} text-ink-2 hover:bg-line-soft`}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M4 4l8 8M12 4l-8 8"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </td>
      </tr>
      <tr className="bg-brand-tint/40">
        <td colSpan={6} className="px-2 pb-2">
          <p
            id={errorId}
            aria-live="polite"
            aria-atomic="true"
            className="text-sm font-medium text-error"
          >
            {error?.message ?? ''}
          </p>
        </td>
      </tr>
    </>
  );
}
