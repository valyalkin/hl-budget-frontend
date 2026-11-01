'use client';

import { useRouter } from 'next/navigation';
import { useId, useState, useTransition } from 'react';
import {
  type ActionResult,
  createAccount,
  createCategory,
  createIncomeCategory,
  deleteAccount,
  deleteCategory,
  deleteIncomeCategory,
} from '@/app/lib/actions';
import type { NamedItem, SettingsData } from '@/app/lib/definitions';
import {
  accountUsage,
  alreadyExists,
  incomeCategoryUsage,
  inUse,
  MESSAGES,
  PHONE,
} from '@/app/lib/messages';
import { exactMatch } from '@/app/lib/utils';
import { CloseIcon, PlusIcon, TrashIcon } from '@/app/ui/phone/icons';
import PhoneDialog from '@/app/ui/phone/phone-dialog';
import { usePhoneUi } from '@/app/ui/phone/phone-ui-provider';
import Segmented from '@/app/ui/phone/segmented';

type Tab = 'categories' | 'income-categories' | 'accounts';

const removeButton =
  'inline-flex size-11 shrink-0 items-center justify-center rounded-full text-muted focus-visible:outline-2 focus-visible:outline-brand active:bg-error-tint active:text-error disabled:opacity-50';

/**
 * Settings (FR-080 – FR-085): Spending categories, Income categories (specs/009 FR-090) and
 * Accounts tabs, each with a stacked add field and the removal rules of the desktop. Local checks
 * give the same messages as the server, which stays authoritative.
 */
export default function PhoneSettings({
  categories: spendingCategories,
  incomeCategories,
  accounts,
  initialTab = 'categories',
}: SettingsData & {
  /** Which tab opens first; "Open Settings" with no accounts asks for Accounts (specs/007). */
  initialTab?: Tab;
}) {
  const router = useRouter();
  const ui = usePhoneUi();
  const id = useId();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [pending, startTransition] = useTransition();

  const income = tab === 'income-categories';
  const categories: readonly (NamedItem & {
    isDefault: boolean;
    color?: string;
  })[] = income ? incomeCategories : spendingCategories;
  const own = categories.filter((c) => !c.isDefault);
  const defaults = categories.filter((c) => c.isDefault);
  const incomeOf = (item: NamedItem) =>
    accounts.find((a) => a.id === item.id)?.incomeCount ?? 0;

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
    const isCategory = tab !== 'accounts';
    if (!trimmed) {
      setMessage(isCategory ? MESSAGES.categoryName : MESSAGES.accountName);
      return;
    }
    const names: readonly NamedItem[] = isCategory ? categories : accounts;
    if (exactMatch(trimmed, names)) {
      setMessage(alreadyExists(trimmed));
      return;
    }
    const create = income
      ? createIncomeCategory
      : isCategory
        ? createCategory
        : createAccount;
    run(
      () => create(trimmed),
      () => setName(''),
    );
  };

  const removeCategory = (item: NamedItem) => {
    if (item.count > 0) {
      setMessage(
        income
          ? inUse('incomeCategory', item.name, item.count, item.count)
          : inUse('category', item.name, item.count),
      );
      return;
    }
    run(() => (income ? deleteIncomeCategory(item) : deleteCategory(item)));
  };

  const removeAccount = (item: NamedItem) => {
    if (item.count > 0 || incomeOf(item) > 0) {
      setMessage(inUse('account', item.name, item.count, incomeOf(item)));
      return;
    }
    if (accounts.length <= 1) {
      setMessage(MESSAGES.lastAccount);
      return;
    }
    run(() => deleteAccount(item));
  };

  const isCategory = tab !== 'accounts';
  const fieldLabel = income
    ? 'New income category'
    : isCategory
      ? 'New category'
      : 'New account';

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
              { value: 'categories', label: 'Spending categories' },
              { value: 'income-categories', label: 'Income categories' },
              { value: 'accounts', label: 'Accounts' },
            ]}
          />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-4 py-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <p className="text-sm text-muted">
          {income
            ? PHONE.incomeCategoriesIntro
            : isCategory
              ? PHONE.categoriesIntro
              : PHONE.accountsIntro}
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
              income
                ? 'e.g. Freelance, Gifts'
                : isCategory
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
            {income
              ? 'Add income category'
              : isCategory
                ? 'Add category'
                : 'Add account'}
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
                {income ? 'Your income categories' : 'Your categories'} ·{' '}
                {own.length}
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
                      <span className="flex min-w-0 items-center gap-2.5">
                        {item.color ? (
                          <span
                            aria-hidden="true"
                            data-testid="income-category-swatch"
                            className="size-3 shrink-0 rounded-sm"
                            style={{ backgroundColor: item.color }}
                          />
                        ) : null}
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate font-medium">
                            {item.name}
                          </span>
                          {income ? (
                            <span className="text-sm text-muted">
                              {incomeCategoryUsage(item.count)}
                            </span>
                          ) : null}
                        </span>
                      </span>
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
                {income ? 'Default income categories' : 'Default categories'} ·{' '}
                {defaults.length}
              </h2>
              <ul className="flex flex-wrap gap-2">
                {defaults.map((item) => (
                  <li
                    key={item.id}
                    className="inline-flex items-center gap-2 rounded-full bg-surface px-3 py-1.5 text-sm text-ink-2 ring-1 ring-line"
                  >
                    {item.color ? (
                      <span
                        aria-hidden="true"
                        data-testid="income-category-swatch"
                        className="size-2.5 shrink-0 rounded-sm"
                        style={{ backgroundColor: item.color }}
                      />
                    ) : null}
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
                    {accountUsage(item.count, incomeOf(item))}
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
