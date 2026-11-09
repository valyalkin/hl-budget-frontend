import { loadOverview } from '@/app/lib/data';
import OverviewView from '@/app/ui/overview/overview-view';

/** The data-dependent part of the Overview: loads the year and hands it to the view. */
export default async function OverviewSection({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { year, month } = await searchParams;
  const data = await loadOverview({ year, month });
  return <OverviewView data={data} />;
}
