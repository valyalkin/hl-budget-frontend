'use client';

import { OVERVIEW_LOAD_FAILED } from '@/app/lib/overview';
import LoadError from '@/app/ui/load-error';

/** The Overview page's error boundary (specs/011 FR-026): a message and Try again, no figures. */
export default function Error(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <LoadError {...props} boundary="overview" message={OVERVIEW_LOAD_FAILED} />
  );
}
