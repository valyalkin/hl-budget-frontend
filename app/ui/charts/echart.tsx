'use client';

import { type CSSProperties, useEffect, useRef, useState } from 'react';

/** What an ECharts instance needs to offer here; the real one has much more. */
type Chart = {
  setOption: (option: object, opts: { notMerge: boolean }) => void;
  resize: () => void;
  dispose: () => void;
  dispatchAction: (payload: object) => void;
};

/** Below this chart width, labels shorten and ticks thin out (research R-005). */
const NARROW_PX = 480;

const NEXT = new Set(['ArrowRight', 'ArrowDown']);
const PREVIOUS = new Set(['ArrowLeft', 'ArrowUp']);

function prefersReducedMotion(): boolean {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * One ECharts chart (specs/011 research R-004, R-006). ECharts is imported only in the browser,
 * after mount. The option is rebuilt when `dataKey` changes or the width crosses 480px; otherwise
 * the chart is only resized.
 *
 * The chart is an image named by `label`. Over it lies a transparent slider for the keyboard:
 * focus it and the arrow keys (Home, End) step through the items, showing each one's tooltip and
 * reading it out as the slider's value. Escape or leaving hides the tooltip. Pointers pass through
 * the slider to the chart, where hovering or tapping an item shows its tooltip; a tap outside the
 * chart hides it.
 */
export default function EChart({
  label,
  itemsLabel,
  count,
  dataKey,
  buildOption,
  describe,
  height,
  phoneHeight = height,
  className,
}: {
  label: string;
  /** What the keyboard steps through, such as "Months": the slider's name. */
  itemsLabel: string;
  /** How many items the keyboard can step through. */
  count: number;
  /** Changes whenever the data drawn changes. */
  dataKey: string;
  buildOption: (context: { narrow: boolean; reducedMotion: boolean }) => object;
  describe: (index: number) => string;
  /** Height in px; `phoneHeight` below 640px wide. */
  height: number;
  phoneHeight?: number;
  className?: string;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const buildRef = useRef(buildOption);
  const [narrow, setNarrow] = useState(false);
  const [ready, setReady] = useState(false);
  const [index, setIndex] = useState<number | null>(null);

  useEffect(() => {
    buildRef.current = buildOption;
  });

  // Start ECharts once, in the browser; resize it with its box.
  useEffect(() => {
    const box = boxRef.current;
    if (!box) {
      return;
    }
    let cancelled = false;
    let observer: ResizeObserver | undefined;
    const measure = () =>
      setNarrow(box.clientWidth > 0 && box.clientWidth < NARROW_PX);
    void import('@/app/ui/charts/echarts-setup').then(({ init }) => {
      if (cancelled) {
        return;
      }
      chartRef.current = init(box, null, { renderer: 'svg' }) as Chart;
      measure();
      setReady(true);
      if (typeof ResizeObserver !== 'undefined') {
        observer = new ResizeObserver(() => {
          chartRef.current?.resize();
          measure();
        });
        observer.observe(box);
      }
    });
    return () => {
      cancelled = true;
      observer?.disconnect();
      chartRef.current?.dispose();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!ready) {
      return;
    }
    chartRef.current?.setOption(
      buildRef.current({ narrow, reducedMotion: prefersReducedMotion() }),
      { notMerge: true },
    );
  }, [ready, dataKey, narrow]);

  const show = (next: number) => {
    setIndex(next);
    chartRef.current?.dispatchAction({
      type: 'showTip',
      seriesIndex: 0,
      dataIndex: next,
    });
  };

  const hide = () => {
    setIndex(null);
    chartRef.current?.dispatchAction({ type: 'hideTip' });
  };

  // A tap anywhere outside the chart hides its tooltip (US5 scenario 4).
  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const box = boxRef.current;
      if (box && event.target instanceof Node && !box.contains(event.target)) {
        chartRef.current?.dispatchAction({ type: 'hideTip' });
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  const onKeyDown = (event: React.KeyboardEvent) => {
    const last = count - 1;
    let next: number | null = null;
    if (NEXT.has(event.key)) {
      next = index === null ? 0 : Math.min(last, index + 1);
    } else if (PREVIOUS.has(event.key)) {
      next = index === null ? 0 : Math.max(0, index - 1);
    } else if (event.key === 'Home') {
      next = 0;
    } else if (event.key === 'End') {
      next = last;
    } else if (event.key === 'Escape') {
      hide();
      return;
    }
    if (next !== null && count > 0) {
      event.preventDefault();
      show(next);
    }
  };

  const style = {
    '--chart-h': `${height}px`,
    '--chart-h-phone': `${phoneHeight}px`,
  } as CSSProperties;

  return (
    <div
      className={`relative h-(--chart-h) w-full max-sm:h-(--chart-h-phone) ${className ?? ''}`}
      style={style}
    >
      <div ref={boxRef} role="img" aria-label={label} className="size-full" />
      <div
        role="slider"
        tabIndex={0}
        aria-label={itemsLabel}
        aria-valuemin={0}
        aria-valuemax={Math.max(0, count - 1)}
        aria-valuenow={index ?? 0}
        aria-valuetext={
          index === null
            ? 'Use the arrow keys to read each one'
            : describe(index)
        }
        onFocus={() => {
          if (count > 0) {
            show(index ?? 0);
          }
        }}
        onBlur={hide}
        onKeyDown={onKeyDown}
        className="pointer-events-none absolute inset-0 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      />
    </div>
  );
}
