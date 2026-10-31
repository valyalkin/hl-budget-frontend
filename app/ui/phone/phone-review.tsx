'use client';

import clsx from 'clsx';
import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';
import { importSpendings } from '@/app/lib/actions';
import { added, MESSAGES, PHONE, rowCount } from '@/app/lib/messages';
import {
  importAddLabel,
  importBanner,
  importRowDisplay,
} from '@/app/lib/phone';
import { CheckIcon, ChevronLeftIcon, WarningIcon } from '@/app/ui/phone/icons';
import PhoneDialog from '@/app/ui/phone/phone-dialog';
import {
  type ImportSession,
  usePhoneUi,
} from '@/app/ui/phone/phone-ui-provider';

const tone = (warn: boolean) => (warn ? 'font-semibold text-warn' : undefined);

/**
 * Review import, step 2 (FR-093 – FR-099): every row with what needs attention in amber, a tap to
 * fix it, and one add for all rows, all or nothing. Back discards the review.
 */
export default function PhoneReview({
  session,
  today,
  currency,
}: {
  session: ImportSession;
  today: string;
  currency: string;
}) {
  const router = useRouter();
  const ui = usePhoneUi();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState('');
  const adding = useRef(false);
  const { rows, fileName, idempotencyKey } = session;
  const banner = importBanner(rows, today);
  const button = importAddLabel(rows, today);

  const add = () => {
    if (button.disabled || adding.current) {
      return;
    }
    adding.current = true;
    setMessage('');
    startTransition(async () => {
      const result = await importSpendings({
        rows,
        idempotencyKey,
        today,
        currency,
      });
      adding.current = result.status === 'ok';
      if (result.status === 'ok') {
        ui.close(2, () => {
          router.push(`/spendings?month=${result.month}`, { scroll: false });
          ui.notify(added(result.count, fileName));
        });
      } else if (result.status === 'already-imported') {
        ui.close(2, () => ui.notify(MESSAGES.alreadyImported));
      } else if (result.status === 'signed-out') {
        router.replace('/');
      } else {
        setMessage(result.message);
      }
    });
  };

  return (
    <PhoneDialog
      variant="screen"
      label="Review import"
      onDismiss={() => ui.close()}
    >
      <div className="flex shrink-0 items-center gap-2 border-b border-line bg-surface px-2 py-1 pt-[max(0.25rem,env(safe-area-inset-top))]">
        <button
          type="button"
          aria-label="Back to file selection"
          onClick={() => ui.close()}
          className="inline-flex size-11 items-center justify-center rounded-full text-ink-2 focus-visible:outline-2 focus-visible:outline-brand active:bg-line-soft"
        >
          <ChevronLeftIcon />
        </button>
        <div className="flex min-w-0 flex-col">
          <h1 className="font-display text-lg leading-tight font-bold">
            Review import
          </h1>
          <span className="truncate text-xs text-muted">
            {fileName} · {rowCount(rows.length)}
          </span>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
        <div className="flex flex-col gap-1">
          <p
            role="status"
            className={clsx(
              'inline-flex items-center gap-2 self-start rounded-full px-3 py-1.5 text-sm font-semibold',
              banner.ok
                ? 'bg-brand-tint text-brand-strong'
                : 'bg-warn-tint text-warn',
            )}
          >
            {banner.ok ? <CheckIcon /> : <WarningIcon />}
            {banner.text}
          </p>
          <span className="text-sm text-muted">{PHONE.tapToFix}</span>
        </div>
        {rows.length === 0 ? (
          <p className="rounded-2xl bg-surface px-4 py-8 text-center text-muted">
            {PHONE.noRowsLeft}
          </p>
        ) : (
          <ul className="divide-y divide-line-soft overflow-hidden rounded-2xl bg-surface ring-1 ring-line">
            {rows.map((row) => {
              const view = importRowDisplay(row, today, currency);
              return (
                <li key={row.key}>
                  <button
                    type="button"
                    onClick={() => ui.open({ kind: 'fix-row', key: row.key })}
                    className="grid min-h-16 w-full grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-2 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand active:bg-line-soft"
                  >
                    <span
                      className={
                        view.needsAttention ? 'text-warn' : 'text-brand'
                      }
                    >
                      {view.needsAttention ? <WarningIcon /> : <CheckIcon />}
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <span
                        className={clsx(
                          'truncate font-medium',
                          tone(view.merchant.warn),
                        )}
                      >
                        {view.merchant.text}
                        <span className="sr-only">, </span>
                      </span>
                      <span className="truncate text-sm text-muted">
                        <span className={tone(view.date.warn)}>
                          {view.date.text}
                        </span>
                        {' · '}
                        <span className={tone(view.category.warn)}>
                          {view.category.text}
                        </span>
                        {' · '}
                        <span className={tone(view.account.warn)}>
                          {view.account.text}
                        </span>
                        <span className="sr-only">, </span>
                      </span>
                    </span>
                    <span
                      className={clsx(
                        'text-sm',
                        view.amount.warn
                          ? tone(true)
                          : 'font-mono font-medium tabular-nums',
                      )}
                    >
                      {view.amount.text}
                      {view.needsAttention ? (
                        <span className="sr-only">, needs attention</span>
                      ) : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {message ? (
          <p
            role="alert"
            className="rounded-xl bg-error-tint px-4 py-3 text-sm font-medium text-error"
          >
            {message}
          </p>
        ) : null}
      </div>

      <div className="shrink-0 border-t border-line bg-surface px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={add}
          disabled={button.disabled || pending}
          className="min-h-13 w-full rounded-xl bg-brand px-4 text-base font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand active:bg-brand-strong disabled:bg-disabled disabled:opacity-70"
        >
          {button.label}
        </button>
      </div>
    </PhoneDialog>
  );
}
