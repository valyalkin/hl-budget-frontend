'use client';

import { LogoIcon, UserIcon } from '@/app/ui/phone/icons';
import { usePhoneUi } from '@/app/ui/phone/phone-ui-provider';

/** The phone header (FR-010): logo and name, and the user icon that opens the account menu. */
export default function PhoneHeader() {
  const { open, layers } = usePhoneUi();
  return (
    <header className="flex items-center justify-between gap-3 border-b border-line bg-surface px-4 py-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
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
    </header>
  );
}
