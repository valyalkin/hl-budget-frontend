'use client';

import { useSyncExternalStore } from 'react';

export type ViewChoice = 'chart' | 'table';

/**
 * The Chart / Table choice for one Overview card, kept in localStorage under its own key
 * (specs/011 FR-023, research R-007). When storage is blocked (private mode) the choice is kept in
 * memory, so the switch still works. The server and the first client render show the chart.
 */
function choiceStore(key: string) {
  let memory: ViewChoice | null = null;
  const listeners = new Set<() => void>();

  const snapshot = (): ViewChoice => {
    try {
      const stored = window.localStorage.getItem(key);
      return stored === 'table' || stored === 'chart' ? stored : 'chart';
    } catch {
      return memory ?? 'chart';
    }
  };

  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      window.addEventListener('storage', listener);
      return () => {
        listeners.delete(listener);
        window.removeEventListener('storage', listener);
      };
    },
    snapshot,
    serverSnapshot: (): ViewChoice => 'chart',
    save(choice: ViewChoice) {
      try {
        window.localStorage.setItem(key, choice);
      } catch {
        memory = choice;
      }
      listeners.forEach((listener) => listener());
    },
  };
}

const stores = new Map<string, ReturnType<typeof choiceStore>>();

/** The stored choice for `key` and a setter. */
export function useViewChoice(
  key: string,
): [ViewChoice, (choice: ViewChoice) => void] {
  let store = stores.get(key);
  if (!store) {
    store = choiceStore(key);
    stores.set(key, store);
  }
  const choice = useSyncExternalStore(
    store.subscribe,
    store.snapshot,
    store.serverSnapshot,
  );
  return [choice, store.save];
}
