import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Not found',
  robots: { index: false },
};

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-start justify-center gap-4 px-6">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="text-slate-600">
        There is nothing at this address. It may have moved, or the link may be
        wrong.
      </p>
      <Link href="/" className="font-semibold text-emerald-800 underline">
        Back to HL Budget
      </Link>
    </main>
  );
}
