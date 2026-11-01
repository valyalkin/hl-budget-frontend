'use client';

import LoadError from '@/app/ui/load-error';

/** The Spendings page's error boundary (FR-092). */
export default function Error(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <LoadError {...props} ledger="spendings" />;
}
