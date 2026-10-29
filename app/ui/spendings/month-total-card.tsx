import { formatMoney, plural, type MoneyValue } from '@/app/lib/utils';

/** The month's total and spending count (FR-023). */
export default function MonthTotalCard({
  label,
  total,
  count,
}: {
  label: string;
  total: MoneyValue;
  count: number;
}) {
  return (
    <section
      aria-label="Month total"
      className="flex flex-col gap-1 rounded-2xl bg-surface p-5 ring-1 ring-line"
    >
      <span className="text-sm text-muted">Spent in {label}</span>
      <span className="font-display text-3xl font-bold tabular-nums">
        {formatMoney(total)}
      </span>
      <span className="text-sm text-muted">
        {plural(count, 'spending', 'spendings')}
      </span>
    </section>
  );
}
