import { formatCents, sharePercent } from '@/app/lib/utils';

export type CategoryItem = {
  id: string;
  name: string;
  cents: number;
  /** The category's own colour, `#rrggbb` (specs/007 FR-004). */
  color: string;
};

/** Each category with spending this month, its amount and share, largest first, then a total (FR-071). */
export default function CategoryTable({
  items,
  totalCents,
  currency,
}: {
  items: readonly CategoryItem[];
  totalCents: number;
  currency: string;
}) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs font-semibold tracking-wide text-muted uppercase">
          <th scope="col" className="py-2">
            Category
          </th>
          <th scope="col" className="py-2 text-right">
            Amount
          </th>
          <th scope="col" className="py-2 text-right">
            Share
          </th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.id} className="border-t border-line-soft">
            <td className="max-w-0 py-2 pr-2" title={item.name}>
              <span className="flex min-w-0 items-center gap-2">
                <span
                  aria-hidden="true"
                  data-testid="category-swatch"
                  className="size-3 shrink-0 rounded-sm"
                  style={{ backgroundColor: item.color }}
                />
                <span className="truncate">{item.name}</span>
              </span>
            </td>
            <td className="py-2 text-right font-mono tabular-nums">
              {formatCents(item.cents, currency)}
            </td>
            <td className="py-2 text-right text-muted tabular-nums">
              {sharePercent(item.cents, totalCents)}%
            </td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr className="border-t border-line font-semibold">
          <th scope="row" className="py-2 text-left">
            Total
          </th>
          <td className="py-2 text-right font-mono tabular-nums">
            {formatCents(totalCents, currency)}
          </td>
          <td className="py-2 text-right tabular-nums">100%</td>
        </tr>
      </tfoot>
    </table>
  );
}
