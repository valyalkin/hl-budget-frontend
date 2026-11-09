import { Suspense } from 'react';
import type { Ledger } from '@/app/lib/ledger';
import AppHeader from '@/app/ui/app-header';
import ImportNotice from '@/app/ui/import/import-notice';
import ImportProvider from '@/app/ui/import/import-provider';
import { LedgerProvider } from '@/app/ui/ledger-context';
import { DesktopOnly, PhoneOnly } from '@/app/ui/phone/layout-switch';
import PhoneSection from '@/app/ui/phone/phone-section';
import PhoneSkeleton from '@/app/ui/phone/phone-skeleton';
import PhoneUiProvider from '@/app/ui/phone/phone-ui-provider';
import SettingsSection from '@/app/ui/settings/settings-section';
import { SpendingsSkeleton } from '@/app/ui/skeletons';
import MonthSection from '@/app/ui/spendings/month-section';

/**
 * The Spendings screen (US1–US6), and with `ledger="income"` the Income screen (specs/009): the
 * same layout for the other ledger. The page itself stays synchronous; everything that reads the
 * session, the API or `searchParams` streams inside <Suspense>.
 *
 * Below 640px the phone layout replaces the desktop one (specs/006-mobile-view research R-001);
 * the desktop tree inside <DesktopOnly> is exactly what it was before.
 */
export default function LedgerPage({
  ledger,
  searchParams,
}: {
  ledger: Ledger;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // The import's state sits outside <Suspense>, so its notice survives a month change (R-010).
  return (
    <LedgerProvider ledger={ledger}>
      <ImportProvider>
        <PhoneUiProvider>
          <DesktopOnly>
            <AppHeader
              signedIn
              current={ledger}
              settingsSlot={
                <Suspense fallback={null}>
                  <SettingsSection />
                </Suspense>
              }
            />
            <ImportNotice />
            <Suspense fallback={<SpendingsSkeleton />}>
              <MonthSection ledger={ledger} searchParams={searchParams} />
            </Suspense>
          </DesktopOnly>
          <PhoneOnly>
            <Suspense fallback={<PhoneSkeleton />}>
              <PhoneSection ledger={ledger} searchParams={searchParams} />
            </Suspense>
          </PhoneOnly>
        </PhoneUiProvider>
      </ImportProvider>
    </LedgerProvider>
  );
}
