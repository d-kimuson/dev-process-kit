import type { LayoutPoint } from './layered';

import { stepsData, type PathStep } from './path-steps';

/**
 * Line jumps: where one route crosses another, a small arc lifts it over the
 * one it crosses, so a reader can follow a line through a crossing instead of
 * guessing which way each one turned. Only a level run jumps, over an upright
 * line or a curve; the crossed line stays straight.
 */

/** How high a jump rises over the line it crosses, and half its width over a single one. */
export const LINE_JUMP_RADIUS = 6;

/** How far apart a run's two ends may sit and still count as level: a rounded corner ends on a point rounded to two decimals. */
const LEVEL_TOLERANCE = 0.01;

/** Points a curve is flattened into, enough to place a jump within a fraction of a pixel. */
const CURVE_SAMPLES = 24;

/**
 * The distance a jump keeps from a line's own end glyphs, measured from the
 * end of the route. A plain number applies to both ends; a function answers
 * per line, because a board whose two ends carry different glyphs needs a
 * different gap at each (`start` is the route's first point, `end` its last).
 */
export type JumpClearance = number | ((id: string) => { readonly start: number; readonly end: number });

export type JumpOptions = {
  readonly clearance: JumpClearance;
  /**
   * Which shared trunk a line belongs to, if any. Two lines in one bundle are
   * drawn as one line and split apart, so they must never jump each other:
   * their crossing is not a crossing a reader could confuse.
   */
  readonly bundle?: (id: string) => string | null;
  /** The jump's own radius, half its width. Defaults to `LINE_JUMP_RADIUS`. */
  readonly radius?: number;
};

type Piece = readonly [LayoutPoint, LayoutPoint];

/**
 * A line's pieces with their bounds, so a run skips every line that cannot
 * reach it, and its two ends, whose glyphs a jump keeps clear of.
 */
type Flattened = {
  readonly pieces: readonly Piece[];
  readonly ends: readonly LayoutPoint[];
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
};

const endsOf = (steps: readonly PathStep[]): readonly LayoutPoint[] =>
  [steps[0]?.to, steps.at(-1)?.to].filter((end): end is LayoutPoint => end !== undefined);

const sampled = (at: (t: number) => LayoutPoint): LayoutPoint[] =>
  Array.from({ length: CURVE_SAMPLES }, (_, index) => at((index + 1) / CURVE_SAMPLES));

/** The straight pieces a line is drawn with, curves flattened. */
const piecesOf = (steps: readonly PathStep[]): readonly Piece[] => {
  const pieces: Piece[] = [];
  let at: LayoutPoint | null = null;
  for (const step of steps) {
    if (step.kind === 'move' || at === null) {
      at = step.to;
      continue;
    }
    const from: LayoutPoint = at;
    const points =
      step.kind === 'line'
        ? [step.to]
        : step.kind === 'quad'
          ? sampled((t) => ({
              x: (1 - t) ** 2 * from.x + 2 * (1 - t) * t * step.control.x + t ** 2 * step.to.x,
              y: (1 - t) ** 2 * from.y + 2 * (1 - t) * t * step.control.y + t ** 2 * step.to.y,
            }))
          : sampled((t) => ({
              x:
                (1 - t) ** 3 * from.x +
                3 * (1 - t) ** 2 * t * step.control1.x +
                3 * (1 - t) * t ** 2 * step.control2.x +
                t ** 3 * step.to.x,
              y:
                (1 - t) ** 3 * from.y +
                3 * (1 - t) ** 2 * t * step.control1.y +
                3 * (1 - t) * t ** 2 * step.control2.y +
                t ** 3 * step.to.y,
            }));
    let previous = from;
    for (const next of points) {
      pieces.push([previous, next]);
      previous = next;
    }
    at = step.to;
  }
  return pieces;
};

const flattened = (steps: readonly PathStep[]): Flattened => {
  const pieces = piecesOf(steps);
  const xs = pieces.flatMap(([p, q]) => [p.x, q.x]);
  const ys = pieces.flatMap(([p, q]) => [p.y, q.y]);
  return {
    pieces,
    ends: endsOf(steps),
    left: Math.min(...xs),
    right: Math.max(...xs),
    top: Math.min(...ys),
    bottom: Math.max(...ys),
  };
};

/**
 * Where `pieces` pass through the level `y`. Each piece is half-open, so a
 * crossing exactly at a joint between two pieces counts once; a line that
 * starts or ends on the level merely meets it, and does not count.
 */
const crossingsAt = (pieces: readonly Piece[], y: number): readonly number[] =>
  pieces.flatMap(([p, q], index) => {
    if (p.y < y === q.y < y) return [];
    if ((index === 0 && p.y === y) || (index === pieces.length - 1 && q.y === y)) return [];
    return [p.x + ((q.x - p.x) * (y - p.y)) / (q.y - p.y)];
  });

const clearancesOf = (clearance: JumpClearance, id: string): { readonly start: number; readonly end: number } =>
  typeof clearance === 'number' ? { start: clearance, end: clearance } : clearance(id);

/** Whether a jump at `p` stays clear of a line's end glyphs, whose reach differs by end. */
const clearOf = (ends: readonly LayoutPoint[], p: LayoutPoint, start: number, end: number, radius: number): boolean =>
  ends.every((tip, index) => Math.hypot(p.x - tip.x, p.y - tip.y) >= (index === 0 ? start : end) + radius);

const round = (value: number): number => Math.round(value * 100) / 100 || 0;

/**
 * Every line's path data, its level runs jumping with a small arc over each
 * line of `bridged` that crosses them.
 *
 * `bridged` is what is drawn right now: a line hidden until something lights
 * it is not jumped over while hidden, or a jump would bridge empty space.
 */
export const jumpedPaths = (
  lines: ReadonlyMap<string, readonly PathStep[]>,
  bridged: ReadonlySet<string>,
  options: JumpOptions,
): ReadonlyMap<string, string> => {
  const radius = options.radius ?? LINE_JUMP_RADIUS;
  const mergeGap = 2 * radius + 2;
  const bundleOf = options.bundle ?? (() => null);
  const others = new Map([...lines].filter(([id]) => bridged.has(id)).map(([id, steps]) => [id, flattened(steps)]));
  return new Map(
    [...lines].map(([id, steps]) => {
      const own = clearancesOf(options.clearance, id);
      const ownBundle = bundleOf(id);
      const ends = endsOf(steps);
      const parts: string[] = [];
      let at: LayoutPoint | null = null;
      for (const step of steps) {
        const from = at;
        at = step.to;
        if (
          step.kind !== 'line' ||
          from === null ||
          Math.abs(from.y - step.to.y) > LEVEL_TOLERANCE ||
          from.x === step.to.x
        ) {
          parts.push(stepsData([step]));
          continue;
        }
        const y = from.y;
        const direction = Math.sign(step.to.x - from.x);
        const low = Math.min(from.x, step.to.x) + radius + 1;
        const high = Math.max(from.x, step.to.x) - radius - 1;
        const xs = [...others]
          .filter(([other]) => other !== id && !(ownBundle !== null && bundleOf(other) === ownBundle))
          .filter(([, bounds]) => bounds.top < y && bounds.bottom > y && bounds.left < high && bounds.right > low)
          .flatMap(([other, bounds]) => {
            const theirs = clearancesOf(options.clearance, other);
            return crossingsAt(bounds.pieces, y).filter((x) =>
              clearOf(bounds.ends, { x, y }, theirs.start, theirs.end, radius),
            );
          })
          .filter((x) => x > low && x < high && clearOf(ends, { x, y }, own.start, own.end, radius))
          .sort((a, b) => (a - b) * direction);
        const jumps: { first: number; last: number }[] = [];
        for (const x of xs) {
          const open = jumps.at(-1);
          if (open !== undefined && Math.abs(x - open.last) < mergeGap) open.last = x;
          else jumps.push({ first: x, last: x });
        }
        // Clockwise when heading right, anticlockwise heading left: the arc always rises.
        const sweep = direction > 0 ? 1 : 0;
        for (const jump of jumps) {
          const rx = round(Math.abs(jump.last - jump.first) / 2 + radius);
          parts.push(
            `L${round(jump.first - radius * direction)} ${y}`,
            `A${rx} ${radius} 0 0 ${sweep} ${round(jump.last + radius * direction)} ${y}`,
          );
        }
        parts.push(stepsData([step]));
      }
      return [id, parts.join(' ')] as const;
    }),
  );
};
