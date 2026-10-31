import { getEarliestSpendingYear, loadSpendingsPage } from '@/app/lib/data';
import { toCents } from '@/app/lib/utils';
import PhoneApp from '@/app/ui/phone/phone-app';

/**
 * The data-dependent part of the phone layout. It shares the desktop's month load (React `cache`)
 * and adds the earliest year for the Year dropdown (research R-004).
 */
export default async function PhoneSection({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { month } = await searchParams;
  const [data, earliestYear] = await Promise.all([
    loadSpendingsPage(typeof month === 'string' ? month : undefined),
    getEarliestSpendingYear(),
  ]);
  const monthTotal = data.totals.months[data.ym.month - 1];
  return (
    <PhoneApp
      data={{
        ym: data.ym,
        today: data.today,
        currency: monthTotal?.total.currency ?? 'CAD',
        monthTotal: monthTotal?.total.amount ?? '0.00',
        count: monthTotal?.spendingCount ?? 0,
        spendings: data.spendings,
        categoryTotals: {
          totalCents: toCents(data.categoryTotals.total.amount),
          items: data.categoryTotals.items.map((item) => ({
            id: item.category.id,
            name: item.category.name,
            cents: toCents(item.total.amount),
          })),
        },
        categories: data.categories,
        accounts: data.accounts,
        merchants: data.merchants.items.map((m) => ({
          name: m.name,
          count: m.spendingCount,
          lastCategory: m.lastCategory,
          lastAccount: m.lastAccount,
        })),
        earliestYear,
      }}
    />
  );
}
