/**
 * How many of the section buttons the header has room for. The buttons keep
 * the panel's order: those that fit stand in the row, and the rest go to one
 * menu button after them.
 */
export type FittingInput = {
  /** Each button's width, in the panel's order. */
  readonly widths: readonly number[];
  /** The space between two buttons. */
  readonly gap: number;
  /** The width the row may take. */
  readonly available: number;
  /** The menu button's width. */
  readonly menu: number;
};

const rowWidth = (widths: readonly number[], gap: number): number =>
  widths.reduce((sum, width) => sum + width, 0) + gap * Math.max(0, widths.length - 1);

/** The number of leading buttons the row shows; the menu button takes the rest. */
export const fittingLaunchers = ({ widths, gap, available, menu }: FittingInput): number => {
  if (rowWidth(widths, gap) <= available) return widths.length;
  let count = 0;
  while (count < widths.length && rowWidth(widths.slice(0, count + 1), gap) + gap + menu <= available) count += 1;
  return count;
};
