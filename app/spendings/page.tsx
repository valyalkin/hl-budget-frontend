import type { Metadata } from 'next';
import { Suspense } from 'react';
import AppHeader from '@/app/ui/app-header';
import SettingsSection from '@/app/ui/settings/settings-section';
import { SpendingsSkeleton } from '@/app/ui/skeletons';
import MonthSection from '@/app/ui/spendings/month-section';

export const metadata: Metadata = {
  title: 'Spendings',
  robots: { index: false, follow: false },
};

/**
 * The Spendings screen (US1–US6). The page itself stays synchronous; everything that reads the
 * session, the API or `searchParams` streams inside <Suspense>.
 */
export default function Page(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <>
      <AppHeader
        signedIn
        settingsSlot={
          <Suspense fallback={null}>
            <SettingsSection />
          </Suspense>
        }
      />
      <Suspense fallback={<SpendingsSkeleton />}>
        <MonthSection searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
