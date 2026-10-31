'use client';

import clsx from 'clsx';
import { useRouter } from 'next/navigation';
import { useId, useRef, useState, useTransition } from 'react';
import { saveSpending } from '@/app/lib/actions';
import type { MerchantOption, NamedItem } from '@/app/lib/definitions';
import type { Draft, Field } from '@/app/lib/draft';
import { firstPhoneProblem } from '@/app/lib/phone';
import { exactMatch, longDate } from '@/app/lib/utils';
import { CalendarIcon, CloseIcon, TrashIcon } from '@/app/ui/phone/icons';
import PhoneCalendar from '@/app/ui/phone/phone-calendar';
import PhoneDialog from '@/app/ui/phone/phone-dialog';
import { usePhoneUi } from '@/app/ui/phone/phone-ui-provider';
import SuggestInput from '@/app/ui/phone/suggest-input';
import { useKeyboardInset } from '@/app/ui/phone/use-keyboard-inset';

export type FormMode = 'add' | 'edit' | 'fix-row';

const LABELS: Record<
  FormMode,
  { title: string; save: string; remove?: string }
> = {
  add: { title: 'New spending', save: 'Add spending' },
  edit: {
    title: 'Edit spending',
    save: 'Save changes',
    remove: 'Delete spending',
  },
  'fix-row': { title: 'Fix row', save: 'Save row', remove: 'Remove row' },
};

/** The item's id when the text names one exactly, else the trimmed text as a new name. */
function refFor(text: string, items: readonly NamedItem[]) {
  const match = exactMatch(text, items);
  return match ? { id: match.id } : { name: text.trim() };
}

export type SpendingFormProps = {
  mode: FormMode;
  initial: Draft;
  spendingId?: string;
  today: string;
  currency: string;
  categories: readonly NamedItem[];
  accounts: readonly NamedItem[];
  merchants: readonly MerchantOption[];
  /** Edit: open the delete confirmation. Fix row: remove the row. */
  onRemove?: () => void;
  /** Fix row: the completed row (nothing is saved to the server). */
  onFixSave?: (draft: Draft) => void;
};

/**
 * One full-screen form for adding, editing and fixing an import row (FR-040 – FR-051): Amount,
 * Date, Merchant, Category, Account, with the action button fixed at the bottom above the
 * keyboard. Every field is checked before saving; the first problem, in this order, is shown
 * inline and focused.
 */
export default function SpendingForm({
  mode,
  initial,
  spendingId,
  today,
  currency,
  categories,
  accounts,
  merchants,
  onRemove,
  onFixSave,
}: SpendingFormProps) {
  useKeyboardInset();
  const router = useRouter();
  const ui = usePhoneUi();
  const id = useId();
  const errorId = `${id}-error`;
  const labels = LABELS[mode];
  const [draft, setDraft] = useState<Draft>(initial);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [error, setError] = useState<{
    field?: string;
    message: string;
  } | null>(null);
  const [pending, startTransition] = useTransition();
  const saving = useRef(false);
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const refs = useRef<Partial<Record<Field, HTMLElement | null>>>({});

  const update = (patch: Partial<Draft>) => {
    setDraft((current) => ({ ...current, ...patch }));
  };

  const invalid = (field: Field) => error?.field === field;
  const describe = (field: Field) => (invalid(field) ? errorId : undefined);

  const save = () => {
    const problem = firstPhoneProblem(draft, today);
    if (problem) {
      setError(problem);
      if (problem.field === 'date') {
        setCalendarOpen(true);
      }
      refs.current[problem.field]?.focus();
      return;
    }
    if (mode === 'fix-row') {
      onFixSave?.(draft);
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
        date: draft.date,
        merchant: draft.merchant,
        category: refFor(draft.category, categories),
        categoryText: draft.category,
        account: refFor(draft.account, accounts),
        accountText: draft.account,
        amount: draft.amount,
        currency,
      });
      // After a save the form stays locked until it closes, so a second tap does nothing.
      saving.current = result.status === 'ok';
      if (result.status === 'ok') {
        ui.close(1, () =>
          router.push(`/spendings?month=${result.month}`, { scroll: false }),
        );
      } else if (result.status === 'signed-out') {
        router.replace('/');
      } else {
        setError({ field: result.field, message: result.message });
      }
    });
  };

  const fieldClass = (field: Field) =>
    clsx(
      'w-full rounded-xl bg-surface px-3 text-ink ring-1 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand',
      invalid(field) ? 'ring-error' : 'ring-line',
    );

  return (
    <PhoneDialog
      variant="screen"
      labelledBy={`${id}-title`}
      onDismiss={() => ui.close()}
    >
      <div className="flex shrink-0 items-center gap-2 border-b border-line bg-surface px-2 py-1 pt-[max(0.25rem,env(safe-area-inset-top))]">
        <button
          type="button"
          aria-label="Close without saving"
          onClick={() => ui.close()}
          className="inline-flex size-11 items-center justify-center rounded-full text-ink-2 focus-visible:outline-2 focus-visible:outline-brand active:bg-line-soft"
        >
          <CloseIcon />
        </button>
        <h1 id={`${id}-title`} className="font-display text-lg font-bold">
          {labels.title}
        </h1>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 py-5">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor={`${id}-amount`}
            className="text-sm font-semibold text-ink-2"
          >
            Amount ({currency})
          </label>
          <div className="relative">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 font-mono text-3xl text-muted"
            >
              $
            </span>
            <input
              ref={(el) => {
                refs.current.amount = el;
              }}
              id={`${id}-amount`}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0.00"
              value={draft.amount}
              onChange={(event) => update({ amount: event.target.value })}
              aria-invalid={invalid('amount') || undefined}
              aria-describedby={describe('amount')}
              className={clsx(
                fieldClass('amount'),
                'h-16 pl-10 font-mono text-3xl tabular-nums',
              )}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span
            id={`${id}-date-label`}
            className="text-sm font-semibold text-ink-2"
          >
            Date
          </span>
          <button
            ref={(el) => {
              refs.current.date = el;
            }}
            type="button"
            aria-labelledby={`${id}-date-label ${id}-date-value`}
            aria-expanded={calendarOpen}
            aria-describedby={describe('date')}
            onClick={() => setCalendarOpen(!calendarOpen)}
            className={clsx(
              fieldClass('date'),
              'flex h-12 items-center justify-between text-left text-base',
            )}
          >
            <span id={`${id}-date-value`}>
              {draft.date ? longDate(draft.date) : 'Pick a date'}
            </span>
            <CalendarIcon className="text-muted" />
          </button>
          {calendarOpen ? (
            <PhoneCalendar
              value={draft.date}
              today={today}
              onPick={(date) => {
                update({ date });
                setCalendarOpen(false);
                if (error?.field === 'date') {
                  setError(null);
                }
              }}
              onClose={() => setCalendarOpen(false)}
            />
          ) : null}
        </div>

        <SuggestInput
          label="Merchant"
          placeholder="Where did you spend?"
          value={draft.merchant}
          onChange={(merchant) => update({ merchant })}
          items={merchants}
          onPick={(merchant) =>
            setDraft((current) => ({
              ...current,
              category: current.category.trim()
                ? current.category
                : merchant.lastCategory.name,
              account: current.account.trim()
                ? current.account
                : merchant.lastAccount.name,
            }))
          }
          inputRef={(el) => {
            refs.current.merchant = el;
          }}
          invalid={invalid('merchant')}
          describedBy={describe('merchant')}
        />
        <SuggestInput
          label="Category"
          placeholder="Choose or type"
          value={draft.category}
          onChange={(category) => update({ category })}
          items={categories}
          inputRef={(el) => {
            refs.current.category = el;
          }}
          invalid={invalid('category')}
          describedBy={describe('category')}
        />
        <SuggestInput
          label="Account"
          placeholder="Choose or type"
          value={draft.account}
          onChange={(account) => update({ account })}
          items={accounts}
          inputRef={(el) => {
            refs.current.account = el;
          }}
          invalid={invalid('account')}
          describedBy={describe('account')}
        />

        {error ? (
          <p
            id={errorId}
            role="alert"
            className="rounded-xl bg-error-tint px-4 py-3 text-sm font-medium text-error"
          >
            {error.message}
          </p>
        ) : null}

        {labels.remove && onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 border-error px-4 font-semibold text-error focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-error active:bg-error-tint"
          >
            <TrashIcon />
            {labels.remove}
          </button>
        ) : null}
      </div>

      <div className="mb-[var(--keyboard-inset,0px)] shrink-0 border-t border-line bg-surface px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="min-h-13 w-full rounded-xl bg-brand px-4 text-base font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand active:bg-brand-strong disabled:opacity-60"
        >
          {labels.save}
        </button>
      </div>
    </PhoneDialog>
  );
}
