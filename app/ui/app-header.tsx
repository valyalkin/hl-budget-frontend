import { Suspense } from 'react';
import { TABS, type Tab } from '@/app/lib/ledger';
import LedgerTabs from '@/app/ui/ledger-tabs';
const signInClass =
  'inline-flex h-10 items-center rounded-[10px] bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand';
const signOutClass =
  'inline-flex h-10 items-center rounded-[10px] px-3 text-sm font-medium text-ink-2 hover:bg-line-soft focus-visible:outline-2 focus-visible:outline-brand';

/** The tabs before the current `?month=` is known: plain links, the same look. */
function StaticTabs({ current }: { current: Tab }) {
  return (
    <nav aria-label="Main" className="flex items-center gap-1">
      {TABS.map(({ tab, label, route }) => (
        <a
          key={tab}
          href={route}
          aria-current={tab === current ? 'page' : undefined}
          className={
            tab === current
              ? 'rounded-md px-2 py-1 text-sm font-semibold text-brand'
              : 'rounded-md px-2 py-1 text-sm font-medium text-ink-2'
          }
        >
          {label}
        </a>
      ))}
    </nav>
  );
}

/** The design's mark: three lines on the brand square. */
function Logo() {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 26 26"
      fill="none"
      aria-hidden="true"
    >
      <rect x="1" y="1" width="24" height="24" rx="6" className="fill-brand" />
      <path
        d="M7 9h12M7 13h8M7 17h10"
        stroke="#FFFFFF"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * The app header (FR-001). Signed out: Sign in. Signed in: the Spendings | Income | Overview tabs (specs/009, specs/011), the user-settings
 * button (passed in as `settingsSlot`, a client component) and Sign out. Sign-in and sign-out are
 * plain links: a prefetched link would start a real login or logout.
 */
export default function AppHeader({
  signedIn,
  settingsSlot,
  current = 'spendings',
}: {
  signedIn: boolean;
  settingsSlot?: React.ReactNode;
  /** The tab being shown (specs/009, specs/011). */
  current?: Tab;
}) {
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Logo />
            <span className="font-display text-lg font-bold tracking-tight">
              HL-Budget
            </span>
          </div>
          {signedIn ? (
            <Suspense fallback={<StaticTabs current={current} />}>
              <LedgerTabs current={current} variant="nav" />
            </Suspense>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {signedIn ? (
            <>
              {settingsSlot}
              <a href="/auth/logout" className={signOutClass}>
                Sign out
              </a>
            </>
          ) : (
            <a href="/auth/login?returnTo=/spendings" className={signInClass}>
              Sign in
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
