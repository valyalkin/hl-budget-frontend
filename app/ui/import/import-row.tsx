'use client';

import {
  type FocusEvent,
  type KeyboardEvent,
  useId,
  useRef,
  useState,
} from 'react';
import type { ImportRow as Row } from '@/app/lib/csv-import';
import type { MerchantOption, NamedItem } from '@/app/lib/definitions';
import { type Draft, type Field, FIELDS } from '@/app/lib/draft';
import { CloseIcon } from '@/app/ui/import/icons';
import Combobox from '@/app/ui/spendings/combobox';
import DatePicker from '@/app/ui/spendings/date-picker';
import {
  arrowStep,
  merchantFillIn,
  nextField,
} from '@/app/ui/spendings/row-keys';

export type ImportRowProps = {
  row: Row;
  /** 1-based, as people count rows. */
  number: number;
  problems: Partial<Record<Field, string>>;
  today: string;
  currency: string;
  categories: readonly NamedItem[];
  accounts: readonly NamedItem[];
  merchants: readonly MerchantOption[];
  onChange: (key: string, patch: Partial<Draft>) => void;
  onRemove: (key: string) => void;
  /** Enter on the amount: move on to the next row (FR-023). */
  onDone: (key: string) => void;
  dateRef: (key: string, element: HTMLButtonElement | null) => void;
};

/**
 * One row of the import review (US2, research R-009). Every field stays editable with the
 * Spendings table's calendar, autofill and keys, but a row never saves on its own. Each field
 * that needs attention gets the error border and a message read out with it (FR-022); the
 * messages also show under the row while it has focus.
 */
export default function ImportRow({
  row,
  number,
  problems,
  today,
  currency,
  categories,
  accounts,
  merchants,
  onChange,
  onRemove,
  onDone,
  dateRef,
}: ImportRowProps) {
  const id = useId();
  const [focused, setFocused] = useState(false);
  const refs = useRef<Partial<Record<Field, HTMLElement | null>>>({});
  const { draft, key } = row;

  const update = (patch: Partial<Draft>) => onChange(key, patch);
  const messageId = (field: Field) => `${id}-${field}`;
  const described = (field: Field) =>
    problems[field] ? messageId(field) : undefined;

  const focus = (field: Field) => {
    const element = refs.current[field];
    element?.focus();
    if (element instanceof HTMLInputElement) {
      element.select();
    }
  };

  /** Left/Right at the text's edge, and Enter, move along the row (feature 003 FR-053). */
  const onFieldKeyDown = (field: Field, event: KeyboardEvent<HTMLElement>) => {
    const step = arrowStep(event);
    const target = step ? nextField(field, step) : undefined;
    if (target) {
      event.preventDefault();
      focus(target);
      return;
    }
    if (
      event.key === 'Enter' &&
      event.currentTarget instanceof HTMLInputElement
    ) {
      event.preventDefault();
      const following = nextField(field, 1);
      if (following) {
        focus(following);
      } else {
        onDone(key);
      }
    }
  };

  const onBlur = (event: FocusEvent<HTMLTableRowElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setFocused(false);
    }
  };

  const messages = FIELDS.flatMap((field) => {
    const message = problems[field];
    return message ? [message] : [];
  });
  const cell = 'px-2 py-2 align-top';
  const hidden = (field: Field) =>
    problems[field] ? (
      <span id={messageId(field)} className="sr-only">
        {problems[field]}
      </span>
    ) : null;

  return (
    <>
      <tr
        onFocus={() => setFocused(true)}
        onBlur={onBlur}
        className={messages.length > 0 ? 'bg-error-tint/40' : undefined}
      >
        <td className={`${cell} w-40`}>
          <DatePicker
            name={`Date, row ${number},`}
            value={draft.date}
            today={today}
            onChange={(date) => update({ date })}
            onPicked={() => focus('merchant')}
            onKeyDown={(event) => onFieldKeyDown('date', event)}
            invalid={problems.date !== undefined}
            describedBy={described('date')}
            buttonRef={(element) => {
              refs.current.date = element;
              dateRef(key, element);
            }}
          />
          {hidden('date')}
        </td>
        <td className={`${cell} min-w-40`}>
          <Combobox
            label={`Merchant, row ${number}`}
            placeholder="Required"
            value={draft.merchant}
            onChange={(merchant) => update({ merchant })}
            options={merchants}
            onCommit={(text) => {
              const patch = merchantFillIn(draft, text, merchants);
              if (Object.keys(patch).length > 0) {
                update(patch);
              }
            }}
            onKeyDown={(event) => onFieldKeyDown('merchant', event)}
            inputRef={(element) => {
              refs.current.merchant = element;
            }}
            invalid={problems.merchant !== undefined}
            describedBy={described('merchant')}
            maxLength={255}
          />
          {hidden('merchant')}
        </td>
        <td className={cell}>
          <Combobox
            label={`Category, row ${number}`}
            placeholder="Required"
            value={draft.category}
            onChange={(category) => update({ category })}
            options={categories}
            onKeyDown={(event) => onFieldKeyDown('category', event)}
            inputRef={(element) => {
              refs.current.category = element;
            }}
            invalid={problems.category !== undefined}
            describedBy={described('category')}
            createHint
            maxLength={50}
          />
          {hidden('category')}
        </td>
        <td className={cell}>
          <Combobox
            label={`Account, row ${number}`}
            placeholder="Required"
            value={draft.account}
            onChange={(account) => update({ account })}
            options={accounts}
            onKeyDown={(event) => onFieldKeyDown('account', event)}
            inputRef={(element) => {
              refs.current.account = element;
            }}
            invalid={problems.account !== undefined}
            describedBy={described('account')}
            createHint
            maxLength={50}
          />
          {hidden('account')}
        </td>
        <td className={`${cell} w-28`}>
          <input
            ref={(element) => {
              refs.current.amount = element;
            }}
            type="text"
            inputMode="decimal"
            aria-label={`Amount in ${currency}, row ${number}`}
            aria-invalid={problems.amount !== undefined || undefined}
            aria-describedby={described('amount')}
            placeholder="Required"
            autoComplete="off"
            value={draft.amount}
            onChange={(event) => update({ amount: event.target.value })}
            onKeyDown={(event) => onFieldKeyDown('amount', event)}
            className={`h-9 w-full rounded-lg border bg-surface px-2.5 text-right font-mono text-sm tabular-nums placeholder:text-muted focus:outline-2 focus:outline-brand ${
              problems.amount !== undefined ? 'border-error' : 'border-line'
            }`}
          />
          {hidden('amount')}
        </td>
        <td className={`${cell} w-12 text-right`}>
          <button
            type="button"
            aria-label={`Remove row ${number}`}
            title="Remove this row"
            onClick={() => onRemove(key)}
            className="inline-flex size-9 items-center justify-center rounded-lg text-ink-2 hover:bg-line-soft focus-visible:outline-2 focus-visible:outline-brand"
          >
            <CloseIcon />
          </button>
        </td>
      </tr>
      {focused && messages.length > 0 ? (
        <tr aria-hidden="true">
          <td colSpan={6} className="px-2 pb-2 text-sm font-medium text-error">
            {messages.join(' ')}
          </td>
        </tr>
      ) : null}
    </>
  );
}
