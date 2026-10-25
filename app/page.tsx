import type { Metadata } from 'next';
import { Suspense } from 'react';
import LandingActions from '@/app/ui/landing/landing-actions';
import { LandingActionsSkeleton } from '@/app/ui/skeletons';

export const metadata: Metadata = {
  title: { absolute: 'HL Budget' },
};

export default function Page() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-start justify-center gap-6 px-6">
      <h1 className="text-4xl font-bold tracking-tight">HL Budget</h1>
      <p className="text-lg text-slate-600">
        A private budget for the household, kept on our own server.
      </p>
      <Suspense fallback={<LandingActionsSkeleton />}>
        <LandingActions />
      </Suspense>
    </main>
  );
}
