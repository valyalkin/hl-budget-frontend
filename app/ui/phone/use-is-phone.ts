'use client';

import { useSyncExternalStore } from 'react';

/** The phone layout applies below 640px (Tailwind's `sm`, research R-002). */
export const PHONE_QUERY = '(width < 40rem)';

function subscribe(onChange: () => void): () => void {
  const query = window.matchMedia(PHONE_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

/**
 * Whether the phone layout applies: true below 640px, false at 640px and wider, and null while
 * unknown (on the server and during hydration), so server HTML and the first client render match.
 */
export function useIsPhone(): boolean | null {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(PHONE_QUERY).matches,
    () => null,
  );
}
