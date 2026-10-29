'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useId, useState, useTransition } from 'react';
import type { ActionResult } from '@/app/lib/actions';
import type { NamedItem } from '@/app/lib/definitions';
import { alreadyExists } from '@/app/lib/messages';
import { exactMatch } from '@/app/lib/utils';

export type PanelCopy = {
  heading: string;
  addLabel: string;
  empty: string;
  emptyName: string;
  /** A refusal known before calling the server (in use, last account); null when allowed. */
  refusal: (item: NamedItem, all: readonly NamedItem[]) => string | null;
};

/** "3 spendings recorded" / "No spendings yet". */
export function usage(count: number): string {
  if (count === 0) {
    return 'No spendings yet';
  }
  return `${count} ${count === 1 ? 'spending' : 'spendings'} recorded`;
}

/**
 * A list of the caller's own categories or accounts with an add field and remove buttons
 * (FR-081–FR-084). Empty names and duplicates (ignoring case) are refused locally with the spec's
 * wording before any call; the server stays authoritative and its refusals use the same words.
 */
export default function NamedListPanel({
  items,
  taken,
  copy,
  create,
  remove,
}: {
  items: readonly NamedItem[];
  /** Every name a new item must not repeat (for categories, the defaults too). */
  taken: readonly NamedItem[];
  copy: PanelCopy;
  create: (name: string) => Promise<ActionResult>;
  remove: (item: { id: string; name: string }) => Promise<ActionResult>;
}) {
  const router = useRouter();
  const inputId = useId();
  const messageId = useId();
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [pending, startTransition] = useTransition();

  const handle = (result: ActionResult, onOk?: () => void) => {
    if (result.status === 'signed-out') {
      router.replace('/');
    } else if (result.status === 'error') {
      setMessage(result.message);
    } else {
      setMessage('');
      onOk?.();
    }
  };

  const add = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setMessage(copy.emptyName);
      return;
    }
    if (exactMatch(trimmed, taken)) {
      setMessage(alreadyExists(trimmed));
      return;
    }
    startTransition(async () =>
      handle(await create(trimmed), () => setName('')),
    );
  };

  const removeItem = (item: NamedItem) => {
    const refusal = copy.refusal(item, items);
    if (refusal) {
      setMessage(refusal);
      return;
    }
    startTransition(async () =>
      handle(await remove({ id: item.id, name: item.name })),
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <h3 className="font-display text-base font-bold">{copy.heading}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-muted">{copy.empty}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line-soft rounded-xl ring-1 ring-line">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-3 px-3 py-2"
            >
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-medium" title={item.name}>
                  {item.name}
                </span>
                <span className="text-xs text-muted">{usage(item.count)}</span>
              </span>
              <button
                type="button"
                aria-label={`Remove ${item.name}`}
                disabled={pending}
                onClick={() => removeItem(item)}
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-ink-2 hover:bg-line-soft hover:text-error focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-40"
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
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={add} className="flex items-end gap-2">
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor={inputId} className="text-sm font-medium">
            {copy.addLabel}
          </label>
          <input
            id={inputId}
            type="text"
            maxLength={50}
            value={name}
            aria-describedby={messageId}
            onChange={(event) => {
              setName(event.target.value);
              setMessage('');
            }}
            className="h-10 rounded-lg border border-line bg-surface px-3 text-sm focus:outline-2 focus:outline-brand"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="h-10 rounded-[10px] bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-50"
        >
          Add
        </button>
      </form>
      <p
        id={messageId}
        aria-live="polite"
        aria-atomic="true"
        className="text-sm font-medium text-error"
      >
        {message}
      </p>
    </div>
  );
}
