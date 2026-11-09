import { EARNED, SPENT } from '@/app/lib/overview-charts';
import type { OverviewData } from '@/app/lib/overview';
import { formatShare, formatWholeDollars } from '@/app/lib/utils';

function Tile({
  id,
  label,
  swatch,
  amount,
  note,
}: {
  id: string;
  label: string;
  swatch?: string;
  amount: string;
  note: string;
}) {
  return (
    <div
      data-testid={`tile-${id}`}
      className="flex flex-col gap-1 rounded-[14px] border border-line bg-surface px-5 py-[1.125rem]"
    >
      <div className="flex items-center gap-2 text-[0.8125rem] font-semibold text-muted">
        {swatch ? (
          <span
            aria-hidden="true"
            className="inline-block size-3 rounded-[3px]"
            style={{ background: swatch }}
          />
        ) : null}
        {label}
      </div>
      <div
        data-testid="tile-amount"
        className="font-display text-[2rem] leading-[1.1] font-bold tracking-tight tabular-nums"
      >
        {amount}
      </div>
      <div className="text-[0.8125rem] text-muted">{note}</div>
    </div>
  );
}

/** What the Saved tile says under its amount (FR-010). */
function savedNote({ year, totals }: OverviewData): string {
  const { earnedCents, spentCents, savedCents } = totals;
  if (earnedCents === 0 && spentCents === 0) {
    return `Nothing recorded in ${year}`;
  }
  if (savedCents < 0 || earnedCents === 0) {
    return 'Spent more than earned';
  }
  return `${formatShare(savedCents, earnedCents)} of what you earned`;
}

/** The Earned, Spent and Saved tiles for the shown year (specs/011 US1, FR-008 – FR-011). */
export default function TotalTiles({ data }: { data: OverviewData }) {
  const { totals, monthsElapsed, currency } = data;
  const money = (cents: number) => formatWholeDollars(cents, currency);
  const average = (cents: number) =>
    `avg ${money(Math.round(cents / monthsElapsed))} a month`;
  return (
    <section
      aria-label="Year totals"
      className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3.5"
    >
      <Tile
        id="earned"
        label="Earned"
        swatch={EARNED}
        amount={money(totals.earnedCents)}
        note={average(totals.earnedCents)}
      />
      <Tile
        id="spent"
        label="Spent"
        swatch={SPENT}
        amount={money(totals.spentCents)}
        note={average(totals.spentCents)}
      />
      <Tile
        id="saved"
        label="Saved"
        amount={money(totals.savedCents)}
        note={savedNote(data)}
      />
    </section>
  );
}
