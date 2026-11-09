'use client';

import { useRouter } from 'next/navigation';
import { startTransition, useEffect } from 'react';
import { LEDGER, type Ledger } from '@/app/lib/ledger';
import { reportClientError } from '@/app/lib/report-client-error';

/**
 * Shown when a ledger's data cannot be loaded (FR-092): a short message and a retry, never
 * empty-looking data. At most a short reference to quote when reporting it. Used by the Spendings,
 * Income (specs/009) and Overview (specs/011) error boundaries.
 */
export default function LoadError({
  error,
  reset,
  ledger,
  boundary = ledger ?? 'page',
  message = ledger ? LEDGER[ledger].loadFailed : 'We couldn’t load this page.',
}: {
  error: Error & { digest?: string };
  reset: () => void;
  ledger?: Ledger;
  /** The boundary named in the error report; the ledger by default. */
  boundary?: string;
  /** What failed to load; the ledger's wording by default (specs/011 uses its own). */
  message?: string;
}) {
  const router = useRouter();

  useEffect(() => {
    reportClientError(error, boundary);
  }, [error, boundary]);

  const retry = () =>
    startTransition(() => {
      router.refresh();
      reset();
    });

  return (
    <main className="mx-auto flex max-w-7xl flex-col items-start gap-4 px-4 py-10 sm:px-6">
      <h1 className="font-display text-xl font-bold">Something went wrong</h1>
      <p className="text-muted">{message}</p>
      <button
        type="button"
        onClick={retry}
        className="rounded-[10px] bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        Try again
      </button>
      {error.digest ? (
        <p className="text-xs text-muted">Reference: {error.digest}</p>
      ) : null}
    </main>
  );
}
