import type { Metadata } from 'next';
import { Suspense } from 'react';
import SignedOut from '@/app/ui/signed-out';

export const metadata: Metadata = {
  title: { absolute: 'HL-Budget' },
};

/** `/`: the signed-out screen, or a redirect to /spendings when signed in (research R-001). */
export default function Page(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={null}>
      <SignedOut searchParams={props.searchParams} />
    </Suspense>
  );
}
