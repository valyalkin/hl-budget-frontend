import type { Metadata } from 'next';
import { Suspense } from 'react';
import Header from '@/app/ui/home/header';
import ProfileSection from '@/app/ui/home/profile-section';
import SignOutLink from '@/app/ui/home/sign-out-link';
import { ProfileCardSkeleton } from '@/app/ui/skeletons';

export const metadata: Metadata = {
  title: 'Home',
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <>
      <Header>
        <SignOutLink />
      </Header>
      <main className="mx-auto max-w-3xl px-6 py-10">
        <Suspense fallback={<ProfileCardSkeleton />}>
          <ProfileSection />
        </Suspense>
      </main>
    </>
  );
}
