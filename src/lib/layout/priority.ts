/** Measured widths are fractional and rounded differently by each engine. */
const TOLERANCE = 0.5;

export type PriorityFitInput = {
  /** The widths of the items, in their order. */
  readonly widths: readonly number[];
  /** The width the items and the more button share. */
  readonly available: number;
  /** The space between two items. */
  readonly gap: number;
  /** The width of the button that lists the hidden items, with the space before it. */
  readonly moreWidth: number;
  /** The index of the item that stays shown however little room there is (the current one); `-1` for none. */
  readonly keep: number;
};

/**
 * The "priority+" fit of a row of items: which of them (by index) move behind
 * a more button so the rest fit on one line. Nothing moves while all fit.
 * Otherwise the kept item stays, and the others are shown in order until the
 * first that would not fit beside the more button; it and the ones after it
 * are hidden, so the shown items read as the start of the row.
 */
export const fitPriority = ({ widths, available, gap, moreWidth, keep }: PriorityFitInput): readonly number[] => {
  const total = widths.reduce((sum, width) => sum + width, 0) + gap * Math.max(0, widths.length - 1);
  if (total <= available + TOLERANCE) return [];
  const budget = available - moreWidth + TOLERANCE;
  const shown = new Set<number>();
  let used = 0;
  const show = (index: number): void => {
    used += (shown.size === 0 ? 0 : gap) + (widths[index] ?? 0);
    shown.add(index);
  };
  if (keep >= 0 && keep < widths.length) show(keep);
  for (const [index, width] of widths.entries()) {
    if (shown.has(index)) continue;
    if (used + (shown.size === 0 ? 0 : gap) + width > budget) break;
    show(index);
  }
  return widths.flatMap((_, index) => (shown.has(index) ? [] : [index]));
};
