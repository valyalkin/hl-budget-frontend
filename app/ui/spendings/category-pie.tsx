import { donutArcs, formatCents, sharePercent } from '@/app/lib/utils';
import { sliceColors } from '@/app/ui/spendings/category-colors';
import type { CategoryItem } from '@/app/ui/spendings/category-table';

/**
 * A donut with one slice for every category with spending, and no "Everything else" (FR-072).
 * Each slice names itself on hover; the ordered legend gives every slice's name, amount and share,
 * so nothing depends on colour alone.
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
  const arcs = donutArcs(items, { r: 84, inner: 54 });
  const colors = sliceColors(items.length);
  const top = items[0];
  const summary = top
    ? `Spending by category: ${items.length} ${items.length === 1 ? 'category' : 'categories'}, largest ${top.name} at ${sharePercent(top.cents, totalCents)}%`
    : 'Spending by category';
  const describe = (item: CategoryItem) =>
    `${item.name}: ${formatCents(item.cents, currency)} (${sharePercent(item.cents, totalCents)}%)`;

  return (
    <div className="flex flex-col items-center gap-4">
      <svg
        viewBox="0 0 200 200"
        className="size-48"
        role="img"
        aria-label={summary}
      >
        {arcs.map((arc, index) => {
          const item = items[index];
          return item ? (
            <path
              key={item.id}
              d={arc.path}
              fill={colors[index]}
              stroke="#ffffff"
              strokeWidth="1.5"
              data-category={item.name}
            >
              <title>{describe(item)}</title>
            </path>
          ) : null;
        })}
        <text
          x="100"
          y="96"
          textAnchor="middle"
          className="fill-muted text-[10px]"
        >
          Total
        </text>
        <text
          x="100"
          y="114"
          textAnchor="middle"
          className="fill-ink font-mono text-[14px] font-semibold"
        >
          {formatCents(totalCents, currency, { wholeUnits: true })}
        </text>
      </svg>
      <ol aria-label="Legend" className="flex w-full flex-col gap-1.5 text-sm">
        {items.map((item, index) => (
          <li key={item.id} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="size-3 shrink-0 rounded-sm"
              style={{ backgroundColor: colors[index] }}
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
