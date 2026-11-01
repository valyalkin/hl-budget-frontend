import { LEDGER, type Ledger } from '@/app/lib/ledger';
import { formatMoney, type MoneyValue } from '@/app/lib/utils';

/** The month's total and entry count (FR-023), for spendings or income (specs/009). */
export default function MonthTotalCard({
  label,
  total,
  count,
  ledger = 'spendings',
}: {
  label: string;
  total: MoneyValue;
  count: number;
  ledger?: Ledger;
}) {
  const text = LEDGER[ledger];
  return (
    <section
      aria-label="Month total"
      className="flex flex-col gap-1 rounded-2xl bg-surface p-5 ring-1 ring-line"
    >
      <span className="text-sm text-muted">
        {text.totalIn} {label}
      </span>
      <span className="font-display text-3xl font-bold tabular-nums">
        {formatMoney(total)}
      </span>
      <span className="text-sm text-muted">{text.count(count)}</span>
    </section>
  );
}
