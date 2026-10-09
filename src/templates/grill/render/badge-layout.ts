/**
 * Where the Q badges go, as plain geometry: the DOM is measured and written by
 * `positionLabels`, the decision is here.
 *
 * A diagram node wears its badges on its top-right corner, like a notification
 * count; badges a node is too narrow for wrap into rows above it. The author's
 * own markup — prose, a table — would have its words covered that way, so its
 * badges sit in a gutter on the right of the stage instead, beside the line
 * they mark, each one below the last.
 */
import { sortBy } from 'es-toolkit/array';
import { clamp } from 'es-toolkit/math';

/** A box in the layer's coordinates. */
export type BadgeRect = {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
};

export type BadgeGroup = {
  readonly target: BadgeRect;
  /** One per badge, in render order. */
  readonly widths: readonly number[];
  /** The author's markup (the gutter) rather than a node inside a component (the corner). */
  readonly gutter: boolean;
};

export type BadgeLayer = {
  readonly width: number;
  readonly height: number;
  readonly badgeHeight: number;
};

export type BadgePoint = { readonly x: number; readonly y: number };

/** Between two badges in a row. */
const GAP = 5;
/** Between two rows, and between two badges in the gutter. */
const ROW_GAP = 4;
/** How far a corner badge hangs past its node's edges. */
const OVERHANG = 8;

const cornerOf = (group: BadgeGroup, layer: BadgeLayer): BadgePoint[] => {
  const h = layer.badgeHeight;
  const start = group.target.right + OVERHANG;
  const limit = group.target.left - OVERHANG;
  const points: BadgePoint[] = [];
  let row = 0;
  let right = start;
  // The last badge is the rightmost of the bottom row; earlier ones go left, then up.
  for (let index = group.widths.length - 1; index >= 0; index -= 1) {
    const width = group.widths[index] ?? 0;
    if (right !== start && right - width < limit) {
      row += 1;
      right = start;
    }
    points[index] = { x: right - width, y: group.target.top - h / 2 - row * (h + ROW_GAP) };
    right -= width + GAP;
  }
  return points;
};

/** The gutter badges, stacked from the top down; the others are left empty. */
const gutterOf = (groups: readonly BadgeGroup[], layer: BadgeLayer): { points: BadgePoint[][]; bottom: number } => {
  const points: BadgePoint[][] = groups.map(() => []);
  const gutter = sortBy(
    groups.map((group, index) => ({ group, index })).filter(({ group }) => group.gutter),
    [({ group }) => group.target.top],
  );
  let free = Number.NEGATIVE_INFINITY;
  for (const { group, index } of gutter) {
    let top = Math.max(group.target.top, free);
    points[index] = group.widths.map((width) => {
      const point = { x: layer.width - width, y: top };
      top += layer.badgeHeight + ROW_GAP;
      return point;
    });
    free = top;
  }
  return { points, bottom: free - ROW_GAP };
};

/**
 * Where the gutter's column of badges ends, 0 without one: a stage shorter than
 * that grows to it, rather than piling the badges up at its bottom.
 */
export const gutterBottom = (groups: readonly BadgeGroup[], layer: BadgeLayer): number =>
  Math.max(0, gutterOf(groups, layer).bottom);

/** Every group's badges, in the order given: one point per width, inside the layer. */
export const layoutBadges = (groups: readonly BadgeGroup[], layer: BadgeLayer): BadgePoint[][] => {
  const gutter = gutterOf(groups, layer);
  const height = Math.max(layer.height, gutter.bottom);
  return groups.map((group, index) =>
    (group.gutter ? (gutter.points[index] ?? []) : cornerOf(group, layer)).map((point, badge) => ({
      x: clamp(point.x, 0, Math.max(0, layer.width - (group.widths[badge] ?? 0))),
      y: clamp(point.y, 0, Math.max(0, height - layer.badgeHeight)),
    })),
  );
};
