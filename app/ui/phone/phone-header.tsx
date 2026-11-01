'use client';

import LedgerTabs from '@/app/ui/ledger-tabs';
import { useLedger } from '@/app/ui/ledger-context';
import { LogoIcon, UserIcon } from '@/app/ui/phone/icons';
import { usePhoneUi } from '@/app/ui/phone/phone-ui-provider';

/**
 * The phone header (FR-010): logo and name, the user icon that opens the account menu, and below
 * them the Spendings | Income switch (specs/009 FR-070).
 */
export default function PhoneHeader() {
  const { open, layers } = usePhoneUi();
  const { ledger } = useLedger();
  return (
    <header className="flex flex-col gap-2 border-b border-line bg-surface px-4 py-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <LogoIcon />
          <span className="font-display text-lg font-bold tracking-tight">
            HL-Budget
          </span>
        </div>
        <button
          type="button"
          aria-label="Account menu"
          aria-haspopup="dialog"
          aria-expanded={layers.some((layer) => layer.kind === 'menu')}
          onClick={() => open({ kind: 'menu' })}
          className="inline-flex size-11 items-center justify-center rounded-full text-ink-2 ring-1 ring-line focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand active:bg-line-soft"
        >
          <UserIcon />
        </button>
      </div>
      <LedgerTabs current={ledger} variant="segmented" />
    </header>
  );
}
