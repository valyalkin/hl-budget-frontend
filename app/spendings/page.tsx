import type { Metadata } from 'next';
import LedgerPage from '@/app/ui/ledger-page';

export const metadata: Metadata = {
  title: 'Spendings',
  robots: { index: false, follow: false },
};

/** The Spendings screen (US1–US6). */
export default function Page(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <LedgerPage ledger="spendings" searchParams={props.searchParams} />;
}
