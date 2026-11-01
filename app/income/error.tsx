'use client';

import LoadError from '@/app/ui/load-error';

/** The Income page's error boundary (specs/009, FR-092). */
export default function Error(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <LoadError {...props} ledger="income" />;
}
