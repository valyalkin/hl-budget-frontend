'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { TABS, type Tab } from '@/app/lib/ledger';

/**
 * The Spendings | Income | Overview tabs (specs/009 FR-001, FR-002, research R-005; specs/011
 * research R-003). Each is a link that keeps
 * the selected `?month=`, so switching is a client-side navigation with no page reload. Links
 * replace the history entry, so Back never switches tabs (FR-072). `aria-current="page"` marks
 * the tab being shown (FR-095).
 */
export default function LedgerTabs({
  current,
  variant,
}: {
  current: Tab;
  /** `nav`: the desktop header's links. `segmented`: the phone's switch. */
  variant: 'nav' | 'segmented';
}) {
  const month = useSearchParams()?.get('month');
  const href = (route: (typeof TABS)[number]['route']) =>
    month ? `${route}?month=${month}` : route;

  return (
    <nav
      aria-label="Main"
      className={clsx(
        variant === 'nav'
          ? 'flex items-center gap-1'
          : 'grid auto-cols-fr grid-flow-col gap-1 rounded-xl bg-line-soft p-1',
      )}
    >
      {TABS.map(({ tab, label, route }) => {
        const selected = tab === current;
        return (
          <Link
            key={tab}
            href={href(route)}
            replace
            scroll={false}
            aria-current={selected ? 'page' : undefined}
            className={clsx(
              'focus-visible:outline-2 focus-visible:outline-brand',
              variant === 'nav'
                ? clsx(
                    'rounded-md px-2 py-1 text-sm',
                    selected
                      ? 'font-semibold text-brand'
                      : 'font-medium text-ink-2 hover:bg-line-soft',
                  )
                : clsx(
                    'flex min-h-11 items-center justify-center rounded-lg px-3 text-sm font-semibold focus-visible:outline-offset-1',
                    selected ? 'bg-surface text-ink shadow-sm' : 'text-ink-2',
                  ),
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
