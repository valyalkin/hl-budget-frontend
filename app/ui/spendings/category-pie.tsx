import { formatCents, sharePercent } from '@/app/lib/utils';
import DonutChart from '@/app/ui/charts/donut-chart';
import type { CategoryItem } from '@/app/ui/spendings/category-table';

/**
 * A donut with one slice for every category with spending, and no "Everything else" (FR-072).
 * Each category is drawn in its own colour (specs/007 FR-004); a slice names itself on hover,
 * focus or tap, and the ordered legend gives every slice's name, amount and share, so nothing
 * depends on colour alone.
 */
export default function CategoryPie({
  items,
  totalCents,
  currency,
}: {
  items: readonly CategoryItem[];
  totalCents: number;
  currency: string;
}) {
  const top = items[0];
  const summary = top
    ? `Spending by category: ${items.length} ${items.length === 1 ? 'category' : 'categories'}, largest ${top.name} at ${sharePercent(top.cents, totalCents)}%`
    : 'Spending by category';

  return (
    <div className="flex flex-col items-center gap-4">
      <DonutChart
        summary={summary}
        totalText={formatCents(totalCents, currency, { wholeUnits: true })}
        slices={items.map((item) => ({
          key: item.id,
          label: item.name,
          cents: item.cents,
          amountText: formatCents(item.cents, currency),
          shareText: `${sharePercent(item.cents, totalCents)}%`,
          color: item.color,
        }))}
      />
      <ol aria-label="Legend" className="flex w-full flex-col gap-1.5 text-sm">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              data-testid="legend-swatch"
              className="size-3 shrink-0 rounded-sm"
              style={{ backgroundColor: item.color }}
            />
            <span className="min-w-0 flex-1 truncate" title={item.name}>
              {item.name}
            </span>
            <span className="font-mono tabular-nums">
              {formatCents(item.cents, currency)}
            </span>
            <span className="w-10 text-right text-muted tabular-nums">
              {sharePercent(item.cents, totalCents)}%
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
