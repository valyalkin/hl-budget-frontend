'use client';

import { useRouter } from 'next/navigation';
import { useId, useState, useTransition } from 'react';
import {
  type ActionResult,
  createAccount,
  createCategory,
  deleteAccount,
  deleteCategory,
} from '@/app/lib/actions';
import type { NamedItem } from '@/app/lib/definitions';
import {
  accountUsage,
  alreadyExists,
  inUse,
  MESSAGES,
  PHONE,
} from '@/app/lib/messages';
import { exactMatch } from '@/app/lib/utils';
import { CloseIcon, PlusIcon, TrashIcon } from '@/app/ui/phone/icons';
import PhoneDialog from '@/app/ui/phone/phone-dialog';
import { usePhoneUi } from '@/app/ui/phone/phone-ui-provider';
import Segmented from '@/app/ui/phone/segmented';

type Tab = 'categories' | 'accounts';

const removeButton =
  'inline-flex size-11 shrink-0 items-center justify-center rounded-full text-muted focus-visible:outline-2 focus-visible:outline-brand active:bg-error-tint active:text-error disabled:opacity-50';

/**
 * Settings (FR-080 – FR-085): Categories and Accounts tabs, each with a stacked add field and the
 * removal rules of the desktop. Local checks give the same messages as the server, which stays
 * authoritative.
 */
export default function PhoneSettings({
  categories,
  accounts,
}: {
  categories: readonly (NamedItem & { isDefault: boolean })[];
  accounts: readonly NamedItem[];
}) {
  const router = useRouter();
  const ui = usePhoneUi();
  const id = useId();
  const [tab, setTab] = useState<Tab>('categories');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [pending, startTransition] = useTransition();

  const own = categories.filter((c) => !c.isDefault);
  const defaults = categories.filter((c) => c.isDefault);

  const run = (call: () => Promise<ActionResult>, onOk?: () => void) => {
    setMessage('');
    startTransition(async () => {
      const result = await call();
      if (result.status === 'ok') {
        onOk?.();
      } else if (result.status === 'signed-out') {
        router.replace('/');
      } else {
        setMessage(result.message);
      }
    });
  };

  const add = () => {
    const trimmed = name.trim();
    const isCategory = tab === 'categories';
    if (!trimmed) {
      setMessage(isCategory ? MESSAGES.categoryName : MESSAGES.accountName);
      return;
    }
    if (exactMatch(trimmed, isCategory ? categories : accounts)) {
      setMessage(alreadyExists(trimmed));
      return;
    }
    run(
      () => (isCategory ? createCategory(trimmed) : createAccount(trimmed)),
      () => setName(''),
    );
  };

  const removeCategory = (item: NamedItem) => {
    if (item.count > 0) {
      setMessage(inUse('category', item.name, item.count));
      return;
    }
    run(() => deleteCategory(item));
  };

  const removeAccount = (item: NamedItem) => {
    if (item.count > 0) {
      setMessage(inUse('account', item.name, item.count));
      return;
    }
    if (accounts.length <= 1) {
      setMessage(MESSAGES.lastAccount);
      return;
    }
    run(() => deleteAccount(item));
  };

  const isCategory = tab === 'categories';
  const fieldLabel = isCategory ? 'New category' : 'New account';

  return (
    <PhoneDialog variant="screen" label="Settings" onDismiss={() => ui.close()}>
      <div className="flex shrink-0 flex-col gap-3 border-b border-line bg-surface px-2 pt-[max(0.25rem,env(safe-area-inset-top))] pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Close settings"
            onClick={() => ui.close()}
            className="inline-flex size-11 items-center justify-center rounded-full text-ink-2 focus-visible:outline-2 focus-visible:outline-brand active:bg-line-soft"
          >
            <CloseIcon />
          </button>
          <h1 className="font-display text-lg font-bold">Settings</h1>
        </div>
        <div className="px-2">
          <Segmented
            label="Settings section"
            value={tab}
            onChange={(next) => {
              setTab(next);
              setName('');
              setMessage('');
            }}
            options={[
              { value: 'categories', label: 'Categories' },
              { value: 'accounts', label: 'Accounts' },
            ]}
          />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-4 py-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <p className="text-sm text-muted">
          {isCategory ? PHONE.categoriesIntro : PHONE.accountsIntro}
        </p>

        <div className="flex flex-col gap-3">
          <label
            htmlFor={`${id}-name`}
            className="text-sm font-semibold text-ink-2"
          >
            {fieldLabel}
          </label>
          <input
            id={`${id}-name`}
            type="text"
            autoComplete="off"
            autoCapitalize="words"
            placeholder={
              isCategory
                ? 'e.g. Coffee, Gifts, Kids'
                : 'e.g. Mastercard, Savings'
            }
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setMessage('');
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                add();
              }
            }}
            className="h-12 w-full rounded-xl bg-surface px-3 text-base text-ink ring-1 ring-line placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand"
          />
          <button
            type="button"
            onClick={add}
            disabled={pending}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand px-4 font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand active:bg-brand-strong disabled:opacity-60"
          >
            <PlusIcon />
            {isCategory ? 'Add category' : 'Add account'}
          </button>
          {message ? (
            <p
              role="alert"
              className="rounded-xl bg-error-tint px-4 py-3 text-sm font-medium text-error"
            >
              {message}
            </p>
          ) : null}
        </div>

        {isCategory ? (
          <>
            <section
              aria-labelledby={`${id}-own`}
              className="flex flex-col gap-2"
            >
              <h2 id={`${id}-own`} className="text-sm font-semibold text-ink-2">
                Your categories · {own.length}
              </h2>
              {own.length === 0 ? (
                <p className="text-sm text-muted">{PHONE.noCustomCategories}</p>
              ) : (
                <ul className="divide-y divide-line-soft rounded-2xl bg-surface ring-1 ring-line">
                  {own.map((item) => (
                    <li
                      key={item.id}
                      className="flex min-h-13 items-center justify-between gap-3 pr-1 pl-4"
                    >
                      <span className="truncate font-medium">{item.name}</span>
                      <button
                        type="button"
                        aria-label={`Remove ${item.name}`}
                        disabled={pending}
                        onClick={() => removeCategory(item)}
                        className={removeButton}
                      >
                        <TrashIcon />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section
              aria-labelledby={`${id}-defaults`}
              className="flex flex-col gap-2"
            >
              <h2
                id={`${id}-defaults`}
                className="text-sm font-semibold text-ink-2"
              >
                Default categories · {defaults.length}
              </h2>
              <ul className="flex flex-wrap gap-2">
                {defaults.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-full bg-surface px-3 py-1.5 text-sm text-ink-2 ring-1 ring-line"
                  >
                    {item.name}
                  </li>
                ))}
              </ul>
            </section>
          </>
        ) : (
          <ul
            aria-label="Your accounts"
            className="divide-y divide-line-soft rounded-2xl bg-surface ring-1 ring-line"
          >
            {accounts.map((item) => (
              <li
                key={item.id}
                className="flex min-h-14 items-center justify-between gap-3 pr-1 pl-4"
              >
                <div className="flex min-w-0 flex-col">
                  <span className="truncate font-medium">{item.name}</span>
                  <span className="text-sm text-muted">
                    {accountUsage(item.count)}
                  </span>
                </div>
                <button
                  type="button"
                  aria-label={`Remove ${item.name}`}
                  disabled={pending}
                  onClick={() => removeAccount(item)}
                  className={removeButton}
                >
                  <TrashIcon />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PhoneDialog>
  );
}
