'use client';

import { type FocusEvent, useEffect, useRef, useState } from 'react';
import { donutArcs } from '@/app/lib/utils';

export type DonutSlice = {
  key: string;
  label: string;
  cents: number;
  amountText: string;
  shareText: string;
  /** `#rrggbb`, set directly as the fill (specs/007 research R-001: no CSS variables). */
  color: string;
};

/**
 * A donut of category slices (specs/007 research R-012), shared by the desktop and phone By
 * category cards. Hovering, focusing or tapping a slice names it in the centre straight away and
 * dims the others; leaving the chart, moving focus out or tapping elsewhere clears it. Every slice
 * is focusable and labelled, so nothing depends on colour or hover alone.
 */
export default function DonutChart({
  slices,
  totalText,
  summary,
  radius = 84,
  inner = 54,
  className = 'size-48',
}: {
  slices: readonly DonutSlice[];
  totalText: string;
  summary: string;
  radius?: number;
  inner?: number;
  className?: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const chart = useRef<HTMLDivElement | null>(null);
  const arcs = donutArcs(slices, { r: radius, inner });
  const current = active === null ? undefined : slices[active];

  // A tap elsewhere hides the label (touch has no "pointer leaves").
  useEffect(() => {
    if (active === null) {
      return;
    }
    const onPointerDown = (event: PointerEvent) => {
      if (!chart.current?.contains(event.target as Node)) {
        setActive(null);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [active]);

  const onBlur = (event: FocusEvent<SVGSVGElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setActive(null);
    }
  };

  return (
    <div ref={chart} className={`relative ${className}`}>
      <svg
        viewBox="0 0 200 200"
        className="size-full"
        role="group"
        aria-label={summary}
        // A touch "leaves" right after the tap; only a mouse or pen leaving clears the label.
        onPointerLeave={(event) => {
          if (event.pointerType !== 'touch') {
            setActive(null);
          }
        }}
        onBlur={onBlur}
      >
        {arcs.map((arc, index) => {
          const slice = slices[index];
          if (!slice) {
            return null;
          }
          const isActive = active === index;
          return (
            <path
              key={slice.key}
              d={arc.path}
              fill={slice.color}
              opacity={active === null || isActive ? 1 : 0.35}
              stroke={isActive ? 'var(--color-ink)' : '#ffffff'}
              strokeWidth={isActive ? 2 : 1.5}
              tabIndex={0}
              role="img"
              aria-label={`${slice.label}: ${slice.amountText}, ${slice.shareText}`}
              data-active={isActive ? 'true' : undefined}
              className="cursor-pointer transition-opacity duration-100 outline-none"
              onPointerEnter={() => setActive(index)}
              onFocus={() => setActive(index)}
              onClick={() => setActive(index)}
            />
          );
        })}
      </svg>
      <div
        data-testid="donut-centre"
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center"
      >
        <div
          className="flex flex-col items-center"
          style={{ maxWidth: `${inner * 0.9}%` }}
        >
          {current ? (
            <>
              <span className="line-clamp-2 text-xs font-semibold break-words text-ink">
                {current.label}
              </span>
              <span className="font-mono text-xs text-ink-2 tabular-nums">
                {current.amountText} · {current.shareText}
              </span>
            </>
          ) : (
            <>
              <span className="text-xs text-muted">Total</span>
              <span className="font-mono text-sm font-semibold text-ink tabular-nums">
                {totalText}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
