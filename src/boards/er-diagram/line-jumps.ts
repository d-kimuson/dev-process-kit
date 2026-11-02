import type { LayoutPoint } from '../../lib/layout/layered';

import { END_GLYPH_REACH } from './notation';

/** One drawing step of a relation's line, the way an SVG path command draws it. */
export type PathStep =
  | { readonly kind: 'move'; readonly to: LayoutPoint }
  | { readonly kind: 'line'; readonly to: LayoutPoint }
  | { readonly kind: 'quad'; readonly control: LayoutPoint; readonly to: LayoutPoint }
  | {
      readonly kind: 'cubic';
      readonly control1: LayoutPoint;
      readonly control2: LayoutPoint;
      readonly to: LayoutPoint;
    };

const point = (p: LayoutPoint): string => `${p.x} ${p.y}`;

const round = (value: number): number => Math.round(value * 100) / 100 || 0;

const command = (step: PathStep): string => {
  switch (step.kind) {
    case 'move':
      return `M${point(step.to)}`;
    case 'line':
      return `L${point(step.to)}`;
    case 'quad':
      return `Q${point(step.control)} ${point(step.to)}`;
    case 'cubic':
      return `C${point(step.control1)} ${point(step.control2)} ${point(step.to)}`;
  }
};

/** The SVG path data that draws `steps`. */
export const pathData = (steps: readonly PathStep[]): string => steps.map(command).join(' ');

/** How high a jump rises over the line it crosses, and half its width over a single one. */
export const LINE_JUMP_RADIUS = 6;

/** Crossings closer than this along a run share one wider jump instead of two cramped ones. */
const JUMP_MERGE_GAP = 2 * LINE_JUMP_RADIUS + 2;

/** How far apart a run's two ends may sit and still count as level: a rounded corner ends on a point rounded to two decimals. */
const LEVEL_TOLERANCE = 0.01;

/** Points a curve is flattened into, enough to place a jump within a fraction of a pixel. */
const CURVE_SAMPLES = 24;

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

// The ends of a line, where its glyphs sit.
const endsOf = (steps: readonly PathStep[]): readonly LayoutPoint[] =>
  [steps[0]?.to, steps.at(-1)?.to].filter((end) => end !== undefined);

// Whether a jump at `p` stays clear of the glyphs at `ends`.
const clearOf = (ends: readonly LayoutPoint[], p: LayoutPoint): boolean =>
  ends.every((end) => Math.hypot(p.x - end.x, p.y - end.y) >= END_GLYPH_REACH + LINE_JUMP_RADIUS);

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

/**
 * Every line's path data, its level runs jumping with a small arc over each
 * line of `bridged` that crosses them, so the reader can follow one line
 * through a crossing instead of guessing which way it turned. Only a level
 * run jumps, over an upright line or a curve; the crossed line stays straight.
 *
 * `bridged` is what is drawn right now: a line hidden until something lights
 * it is not jumped over while hidden, or a jump would bridge empty space. A jump keeps
 * clear of the end glyphs (`END_GLYPH_REACH` from either end) of both lines,
 * the one jumping and the one jumped over.
 */
export const jumpedPaths = (
  lines: ReadonlyMap<string, readonly PathStep[]>,
  bridged: ReadonlySet<string>,
): ReadonlyMap<string, string> => {
  const others = new Map([...lines].filter(([id]) => bridged.has(id)).map(([id, steps]) => [id, flattened(steps)]));
  return new Map(
    [...lines].map(([id, steps]) => {
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
          parts.push(command(step));
          continue;
        }
        const y = from.y;
        const direction = Math.sign(step.to.x - from.x);
        const low = Math.min(from.x, step.to.x) + LINE_JUMP_RADIUS + 1;
        const high = Math.max(from.x, step.to.x) - LINE_JUMP_RADIUS - 1;
        const xs = [...others]
          .filter(
            ([other, bounds]) =>
              other !== id && bounds.top < y && bounds.bottom > y && bounds.left < high && bounds.right > low,
          )
          .flatMap(([, other]) => crossingsAt(other.pieces, y).filter((x) => clearOf(other.ends, { x, y })))
          .filter((x) => x > low && x < high && clearOf(ends, { x, y }))
          .sort((a, b) => (a - b) * direction);
        const jumps: { first: number; last: number }[] = [];
        for (const x of xs) {
          const open = jumps.at(-1);
          if (open !== undefined && Math.abs(x - open.last) < JUMP_MERGE_GAP) open.last = x;
          else jumps.push({ first: x, last: x });
        }
        // Clockwise when heading right, anticlockwise heading left: the arc always rises.
        const sweep = direction > 0 ? 1 : 0;
        for (const jump of jumps) {
          const rx = round(Math.abs(jump.last - jump.first) / 2 + LINE_JUMP_RADIUS);
          parts.push(
            `L${round(jump.first - LINE_JUMP_RADIUS * direction)} ${y}`,
            `A${rx} ${LINE_JUMP_RADIUS} 0 0 ${sweep} ${round(jump.last + LINE_JUMP_RADIUS * direction)} ${y}`,
          );
        }
        parts.push(command(step));
      }
      return [id, parts.join(' ')] as const;
    }),
  );
};
