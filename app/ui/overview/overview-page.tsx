import { Suspense } from 'react';
import AppHeader from '@/app/ui/app-header';
import OverviewRoot from '@/app/ui/overview/overview-root';
import OverviewSection from '@/app/ui/overview/overview-section';
import OverviewSkeleton from '@/app/ui/overview/overview-skeleton';
import PhoneOverviewChrome from '@/app/ui/overview/phone-overview-chrome';
import { DesktopOnly } from '@/app/ui/phone/layout-switch';
import PhoneUiProvider from '@/app/ui/phone/phone-ui-provider';
import SettingsSection from '@/app/ui/settings/settings-section';

/**
 * The Overview screen (specs/011). One responsive content tree serves the desktop and the phone
 * (research R-008); only the chrome around it differs: the desktop header with Settings, or the
 * phone header with its account menu. The page stays synchronous; everything that reads the
 * session, the API or `searchParams` streams inside <Suspense>.
 */
export default function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <PhoneUiProvider>
      <OverviewRoot>
        <DesktopOnly>
          <AppHeader
            signedIn
            current="overview"
            settingsSlot={
              <Suspense fallback={null}>
                <SettingsSection />
              </Suspense>
            }
          />
        </DesktopOnly>
        <Suspense
          fallback={
            <div className="h-[6.75rem] border-b border-line bg-surface sm:hidden" />
          }
        >
          <PhoneOverviewChrome />
        </Suspense>
        <Suspense fallback={<OverviewSkeleton />}>
          <OverviewSection searchParams={searchParams} />
        </Suspense>
      </OverviewRoot>
    </PhoneUiProvider>
  );
}
