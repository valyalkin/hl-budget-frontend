import { formatCents, sharePercent } from '@/app/lib/utils';
import {
  BREAKDOWN,
  type BreakdownItem,
  type BreakdownKind,
} from '@/app/ui/spendings/breakdown-kind';

/**
 * Each category (or account) with spending this month, its amount and share, largest first, then
 * a total (FR-071, specs/008 FR-003).
 */
export default function BreakdownTable({
  kind,
  items,
  totalCents,
  currency,
}: {
  kind: BreakdownKind;
  items: readonly BreakdownItem[];
  totalCents: number;
  currency: string;
}) {
  const { column, swatchTestId } = BREAKDOWN[kind];
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs font-semibold tracking-wide text-muted uppercase">
          <th scope="col" className="py-2">
            {column}
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
                  data-testid={swatchTestId}
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
