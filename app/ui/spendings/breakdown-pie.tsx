import { formatCents, sharePercent } from '@/app/lib/utils';
import DonutChart from '@/app/ui/charts/donut-chart';
import {
  BREAKDOWN,
  type BreakdownItem,
  type BreakdownKind,
} from '@/app/ui/spendings/breakdown-kind';

/**
 * A donut with one slice for every category (or account) with spending, and no "Everything else"
 * (FR-072, specs/008 FR-004). Each item is drawn in its own colour (specs/007 FR-004); a slice
 * names itself on hover, focus or tap, and the ordered legend gives every slice's name, amount and
 * share, so nothing depends on colour alone.
 */
export default function BreakdownPie({
  kind,
  noun = 'Spending',
  items,
  totalCents,
  currency,
}: {
  kind: BreakdownKind;
  /** `Spending` or `Income` (specs/009). */
  noun?: string;
  items: readonly BreakdownItem[];
  totalCents: number;
  currency: string;
}) {
  const { singular, plural, legendTestId } = BREAKDOWN[kind];
  const top = items[0];
  const summary = top
    ? `${noun} by ${singular}: ${items.length} ${items.length === 1 ? singular : plural}, largest ${top.name} at ${sharePercent(top.cents, totalCents)}%`
    : `${noun} by ${singular}`;

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
              data-testid={legendTestId}
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
