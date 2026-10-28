import { redirect } from 'next/navigation';
import { getSession } from '@/app/lib/auth';
import AppHeader from '@/app/ui/app-header';
import SignInNotice from '@/app/ui/landing/sign-in-notice';

/**
 * The signed-out screen from the design (FR-002): the header with Sign in and a short message,
 * no data. Reads the session, so it renders inside <Suspense>; a signed-in visitor goes straight
 * to the Spendings screen.
 */
export default async function SignedOut({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (await getSession()) {
    redirect('/spendings');
  }
  const { signin } = await searchParams;
  return (
    <>
      <AppHeader signedIn={false} />
      <main className="mx-auto flex max-w-xl flex-col items-start gap-4 px-4 py-24 sm:px-6">
        {signin === 'failed' ? <SignInNotice /> : null}
        <h1 className="font-display text-3xl font-bold tracking-tight">
          You&apos;re signed out
        </h1>
        <p className="text-muted">Sign in to see and record your spendings.</p>
        <a
          href="/auth/login?returnTo=/spendings"
          className="inline-flex h-11 items-center rounded-[10px] bg-brand px-5 text-sm font-semibold text-white hover:bg-brand-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          Sign in
        </a>
      </main>
    </>
  );
}
