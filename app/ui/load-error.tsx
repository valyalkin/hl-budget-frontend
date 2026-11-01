'use client';

import { useRouter } from 'next/navigation';
import { startTransition, useEffect } from 'react';
import { LEDGER, type Ledger } from '@/app/lib/ledger';
import { reportClientError } from '@/app/lib/report-client-error';

/**
 * Shown when a ledger's data cannot be loaded (FR-092): a short message and a retry, never
 * empty-looking data. At most a short reference to quote when reporting it. Used by the Spendings
 * and Income pages' error boundaries (specs/009).
 */
export default function LoadError({
  error,
  reset,
  ledger,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  ledger: Ledger;
}) {
  const router = useRouter();

  useEffect(() => {
    reportClientError(error, ledger);
  }, [error, ledger]);

  const retry = () =>
    startTransition(() => {
      router.refresh();
      reset();
    });

  return (
    <main className="mx-auto flex max-w-7xl flex-col items-start gap-4 px-4 py-10 sm:px-6">
      <h1 className="font-display text-xl font-bold">Something went wrong</h1>
      <p className="text-muted">{LEDGER[ledger].loadFailed}</p>
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
