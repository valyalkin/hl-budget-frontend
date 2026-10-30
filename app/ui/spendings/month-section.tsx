import { loadSpendingsPage } from '@/app/lib/data';
import { monthLabel, toCents } from '@/app/lib/utils';
import ImportCsvButton from '@/app/ui/import/import-csv-button';
import ByCategoryCard from '@/app/ui/spendings/by-category-card';
import MonthLine from '@/app/ui/spendings/month-line';
import MonthTotalCard from '@/app/ui/spendings/month-total-card';
import SpendingsTable from '@/app/ui/spendings/spendings-table';

/**
 * The data-dependent part of the Spendings screen. Awaits `searchParams` and the API here, inside
 * the page's <Suspense>, and hands plain data to the client pieces.
 */
export default async function MonthSection({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { month } = await searchParams;
  const data = await loadSpendingsPage(
    typeof month === 'string' ? month : undefined,
  );
  const { ym, today, totals } = data;
  const monthTotal = totals.months[ym.month - 1];
  const currency = monthTotal?.total.currency ?? 'CAD';
  const label = monthLabel(ym);
  const categories = data.categories.map(({ id, name, count }) => ({
    id,
    name,
    count,
  }));
  const merchants = data.merchants.items.map((m) => ({
    name: m.name,
    count: m.spendingCount,
    lastCategory: m.lastCategory,
    lastAccount: m.lastAccount,
  }));

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6">
      <MonthLine totals={totals} selected={ym} today={today} />
      <h1 className="font-display text-2xl font-bold tracking-tight">
        {label}
      </h1>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <SpendingsTable
          key={`${ym.year}-${ym.month}`}
          spendings={data.spendings}
          monthTotal={monthTotal?.total ?? { amount: '0.00', currency }}
          ym={ym}
          today={today}
          currency={currency}
          categories={categories}
          accounts={data.accounts}
          merchants={merchants}
        />
        <aside aria-label="Month summary" className="flex flex-col gap-6">
          <ImportCsvButton
            lookups={{
              categories,
              accounts: data.accounts,
              merchants,
              today,
              currency,
            }}
          />
          <MonthTotalCard
            label={label}
            total={monthTotal?.total ?? { amount: '0.00', currency }}
            count={monthTotal?.spendingCount ?? 0}
          />
          <ByCategoryCard
            label={label}
            currency={currency}
            totalCents={toCents(data.categoryTotals.total.amount)}
            items={data.categoryTotals.items.map((item) => ({
              id: item.category.id,
              name: item.category.name,
              cents: toCents(item.total.amount),
            }))}
          />
        </aside>
      </div>
    </main>
  );
}
