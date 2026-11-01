import type { Metadata } from 'next';
import LedgerPage from '@/app/ui/ledger-page';

export const metadata: Metadata = {
  title: 'Income',
  robots: { index: false, follow: false },
};

/** The Income screen (specs/009): the Spendings screen's layout and rules, for income. */
export default function Page(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <LedgerPage ledger="income" searchParams={props.searchParams} />;
}
