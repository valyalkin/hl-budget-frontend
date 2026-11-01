'use client';

import { useSyncExternalStore } from 'react';
import { useLedger } from '@/app/ui/ledger-context';
import BreakdownPie from '@/app/ui/spendings/breakdown-pie';
import {
  BREAKDOWN,
  type BreakdownItem,
  type BreakdownKind,
} from '@/app/ui/spendings/breakdown-kind';
import BreakdownTable from '@/app/ui/spendings/breakdown-table';

type View = 'table' | 'pie';

/**
 * The Table / Pie choice for one breakdown, kept in localStorage under its own key, with an
 * in-memory fallback for when storage is unavailable (private mode), so the toggle still works.
 */
function viewStore(storageKey: string) {
  let memory: View | null = null;
  const listeners = new Set<() => void>();

  const read = (): View => {
    try {
      return window.localStorage.getItem(storageKey) === 'pie'
        ? 'pie'
        : 'table';
    } catch {
      return 'table';
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
    snapshot: (): View => memory ?? read(),
    serverSnapshot: (): View => 'table',
    save(view: View) {
      memory = view;
      try {
        window.localStorage.setItem(storageKey, view);
      } catch {
        // Kept in memory only.
      }
      listeners.forEach((listener) => listener());
    },
  };
}

// One store per storage key, so By category and By account never share a choice (specs/008
// FR-002), and neither do the Spendings and Income cards (specs/009 FR-064).
const stores = new Map<string, ReturnType<typeof viewStore>>();

function storeFor(storageKey: string) {
  let store = stores.get(storageKey);
  if (!store) {
    store = viewStore(storageKey);
    stores.set(storageKey, store);
  }
  return store;
}

/**
 * Where the month's money went, by category (US5) or by account (specs/008 US1), as a table or a
 * donut. The choice is a per-viewer convenience kept in localStorage, so it survives month changes
 * and reloads (FR-070, specs/008 FR-002).
 */
export default function BreakdownCard({
  kind,
  label,
  currency,
  totalCents,
  items,
}: {
  kind: BreakdownKind;
  label: string;
  currency: string;
  totalCents: number;
  items: BreakdownItem[];
}) {
  const { text } = useLedger();
  const store = storeFor(text.storageKeys[kind]);
  const view = useSyncExternalStore(
    store.subscribe,
    store.snapshot,
    store.serverSnapshot,
  );
  const { heading, headingId } = BREAKDOWN[kind];

  const toggle = (value: View, text: string) => (
    <button
      type="button"
      aria-pressed={view === value}
      onClick={() => store.save(value)}
      className={`h-8 rounded-md px-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-brand ${
        view === value
          ? 'bg-surface text-ink shadow-sm ring-1 ring-line'
          : 'text-muted hover:text-ink'
      }`}
    >
      {text}
    </button>
  );

  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-4 rounded-2xl bg-surface p-5 ring-1 ring-line"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 id={headingId} className="font-display text-lg font-bold">
          {heading}
        </h2>
        <div
          role="group"
          aria-label="Show as"
          className="flex gap-1 rounded-lg bg-line-soft p-1"
        >
          {toggle('table', 'Table')}
          {toggle('pie', 'Pie')}
        </div>
      </div>
      {items.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">
          {text.nothingIn} {label}.
        </p>
      ) : view === 'table' ? (
        <BreakdownTable
          kind={kind}
          items={items}
          totalCents={totalCents}
          currency={currency}
        />
      ) : (
        <BreakdownPie
          kind={kind}
          noun={text.breakdownNoun}
          items={items}
          totalCents={totalCents}
          currency={currency}
        />
      )}
    </section>
  );
}
