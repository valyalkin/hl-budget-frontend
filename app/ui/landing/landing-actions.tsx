import Link from 'next/link';
import { getSession } from '@/app/lib/auth';

const button =
  'inline-flex h-11 items-center rounded-lg bg-emerald-700 px-5 text-sm font-semibold text-white hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700';

/** Reads the session, so it renders inside <Suspense> and keeps the landing shell static. */
export default async function LandingActions() {
  const session = await getSession();

  if (session) {
    return (
      <Link href="/home" className={button}>
        Go to HL Budget
      </Link>
    );
  }

  // A plain <a>: a prefetched link would start a real login transaction.
  return (
    <a href="/auth/login" className={button}>
      Sign in
    </a>
  );
}
