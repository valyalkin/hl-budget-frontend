/** The 12 category colours from globals.css, in rank order (research R-010). */
export const CATEGORY_COLORS = Array.from(
  { length: 12 },
  (_, i) => `var(--color-cat-${i + 1})`,
);

/**
 * One colour per slice. The palette repeats after 12, but never on neighbouring slices, the last
 * slice included (it touches the first).
 */
export function sliceColors(count: number): string[] {
  const colors = Array.from(
    { length: count },
    (_, i) => i % CATEGORY_COLORS.length,
  );
  const last = colors.length - 1;
  if (last > 0 && colors[last] === colors[0]) {
    colors[last] = (colors[last - 1] ?? 0) === 5 ? 6 : 5;
  }
  return colors.map((i) => CATEGORY_COLORS[i] ?? CATEGORY_COLORS[0] ?? '');
}
