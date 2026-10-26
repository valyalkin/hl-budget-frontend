'use client';

import { useRouter } from 'next/navigation';
import { startTransition, useEffect } from 'react';
import { reportClientError } from '@/app/lib/report-client-error';

/**
 * "Something went wrong" for the home segment (FR-021). No status code or stack: at most a short
 * reference to quote when reporting it.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    reportClientError(error, 'home');
  }, [error]);

  const retry = () =>
    startTransition(() => {
      // Re-render the server component (and call the API again), then clear the boundary.
      router.refresh();
      reset();
    });

  return (
    <main className="mx-auto flex max-w-3xl flex-col items-start gap-4 px-6 py-10">
      <h2 className="text-xl font-semibold">Something went wrong</h2>
      <p className="text-slate-600">
        We could not load your profile. Please try again in a moment.
      </p>
      <button
        type="button"
        onClick={retry}
        className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
      >
        Try again
      </button>
      {error.digest ? (
        <p className="text-xs text-slate-500">Reference: {error.digest}</p>
      ) : null}
    </main>
  );
}
