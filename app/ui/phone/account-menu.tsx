'use client';

import { SettingsIcon, SignOutIcon, UploadIcon } from '@/app/ui/phone/icons';
import PhoneDialog from '@/app/ui/phone/phone-dialog';
import { usePhoneUi } from '@/app/ui/phone/phone-ui-provider';

const row =
  'flex min-h-13 w-full items-center gap-3 rounded-xl px-3 text-left text-base font-semibold focus-visible:outline-2 focus-visible:outline-brand active:bg-line-soft';

/**
 * The account menu (FR-070, FR-071): Settings, Import CSV and Sign out in a bottom sheet. Sign out
 * is a plain link, as in the desktop header: prefetching it would sign the user out.
 */
export default function AccountMenu() {
  const ui = usePhoneUi();
  return (
    <PhoneDialog
      variant="sheet"
      label="Account menu"
      backdropLabel="Close menu"
      onDismiss={() => ui.close()}
    >
      <nav aria-label="Account" className="flex flex-col">
        <button
          type="button"
          onClick={() => ui.replaceTop({ kind: 'settings' })}
          className={row}
        >
          <SettingsIcon className="text-muted" />
          Settings
        </button>
        <button
          type="button"
          onClick={() => ui.replaceTop({ kind: 'import' })}
          className={row}
        >
          <UploadIcon className="text-muted" />
          Import CSV
        </button>
        <div aria-hidden="true" className="my-1 h-px bg-line" />
        <a href="/auth/logout" className={`${row} text-error`}>
          <SignOutIcon />
          Sign out
        </a>
      </nav>
    </PhoneDialog>
  );
}
