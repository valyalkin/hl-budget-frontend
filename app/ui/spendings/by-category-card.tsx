'use client';

import { useSyncExternalStore } from 'react';
import CategoryPie from '@/app/ui/spendings/category-pie';
import CategoryTable, {
  type CategoryItem,
} from '@/app/ui/spendings/category-table';

type View = 'table' | 'pie';
const STORAGE_KEY = 'hlb.byCategoryView';

function readView(): View {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'pie' ? 'pie' : 'table';
  } catch {
    return 'table';
  }
}

// In-memory fallback for when storage is unavailable (private mode), so the toggle still works.
let memory: View | null = null;
const listeners = new Set<() => void>();

function saveView(view: View) {
  memory = view;
  try {
    window.localStorage.setItem(STORAGE_KEY, view);
  } catch {
    // Kept in memory only.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener('storage', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
}

const snapshot = (): View => memory ?? readView();
const serverSnapshot = (): View => 'table';

/**
 * Where the month's money went (US5), as a table or a donut. The choice is a per-viewer
 * convenience kept in localStorage, so it survives month changes and reloads (FR-070).
 */
export default function ByCategoryCard({
  label,
  currency,
  totalCents,
  items,
}: {
  label: string;
  currency: string;
  totalCents: number;
  items: CategoryItem[];
}) {
  const view = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const choose = (next: View) => saveView(next);

  const toggle = (value: View, text: string) => (
    <button
      type="button"
      aria-pressed={view === value}
      onClick={() => choose(value)}
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
      aria-labelledby="by-category"
      className="flex flex-col gap-4 rounded-2xl bg-surface p-5 ring-1 ring-line"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 id="by-category" className="font-display text-lg font-bold">
          By category
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
          Nothing spent in {label}.
        </p>
      ) : view === 'table' ? (
        <CategoryTable
          items={items}
          totalCents={totalCents}
          currency={currency}
        />
      ) : (
        <CategoryPie
          items={items}
          totalCents={totalCents}
          currency={currency}
        />
      )}
    </section>
  );
}
