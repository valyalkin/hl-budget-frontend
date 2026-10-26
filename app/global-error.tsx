'use client';

import { useEffect } from 'react';
import { reportClientError } from '@/app/lib/report-client-error';
import '@/app/globals.css';

/** Root-layout failures, which error.tsx cannot catch; renders its own document. */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportClientError(error, 'global');
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 p-6 text-slate-900">
        <title>Something went wrong · HL Budget</title>
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="text-slate-600">Please try again in a moment.</p>
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
