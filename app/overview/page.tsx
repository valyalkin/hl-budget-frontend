import type { Metadata } from 'next';
import OverviewPage from '@/app/ui/overview/overview-page';

export const metadata: Metadata = {
  title: 'Overview',
  robots: { index: false, follow: false },
};

/** The year Overview (specs/011): earned, spent and saved, by month, category and account. */
export default function Page(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <OverviewPage searchParams={props.searchParams} />;
}
