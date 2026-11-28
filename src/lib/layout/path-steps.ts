import type { LayoutPoint } from './layered';

/**
 * Drawing a routed line as SVG path commands.
 *
 * Every board writes its own route geometry, but they all draw it the same
 * way: a polyline with its corners rounded, shortened at either end to leave
 * room for an end glyph, and finally serialised one `PathStep` at a time. This
 * module keeps those steps as data — not a string — so a later pass can read
 * the geometry it draws (line jumps, label placement) instead of re-parsing the
 * `d` attribute.
 */

/** One drawing step of a line, the way an SVG path command draws it. */
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

/** Which end of a line: `start` is where the route leaves, `end` where it arrives. */
export type EndSide = 'start' | 'end';

/**
 * Where an end sits: its `tip` (the port the glyph is drawn at) and `inward`,
 * the unit vector pointing along the line away from that port. A glyph is laid
 * out from these two, so it never has to assume the line runs left to right.
 */
export type EndFrame = { readonly tip: LayoutPoint; readonly inward: LayoutPoint };

const round = (value: number, precision: number): number => {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor || 0;
};

const point = (p: LayoutPoint): string => `${p.x} ${p.y}`;

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
export const stepsData = (steps: readonly PathStep[]): string => steps.map(command).join(' ');

/** A route's points as plain straight steps: one `move`, then a `line` per point. */
export const polylineSteps = (points: readonly LayoutPoint[]): readonly PathStep[] => {
  const [first, ...rest] = points;
  if (first === undefined) return [];
  return [{ kind: 'move', to: first }, ...rest.map((to): PathStep => ({ kind: 'line', to }))];
};

export type RoundedStepsOptions = {
  /** The corner radius. A corner never takes more than half of either segment beside it. */
  readonly radius: number;
  /** A run kept straight at the start of the route, before the first corner may bend it. */
  readonly keepStart?: number;
  /** A run kept straight at the end of the route, before the last corner may bend it. */
  readonly keepEnd?: number;
  /** Decimal places a rounded coordinate is written to. Defaults to 2. */
  readonly precision?: number;
};

/**
 * An orthogonal route with its corners rounded, so a line reads as one path
 * turning rather than two meeting.
 *
 * `keepStart`/`keepEnd` are the runs kept straight at either end of the route:
 * an end glyph is laid out along the port's own direction, not along the line,
 * so a corner that reached back into that run would leave the glyph hanging
 * beside the stroke. A corner too close to a port is left square instead.
 */
export const roundedSteps = (points: readonly LayoutPoint[], options: RoundedStepsOptions): readonly PathStep[] => {
  const { radius, keepStart = 0, keepEnd = 0, precision = 2 } = options;
  const [first, ...rest] = points;
  if (first === undefined) return [];
  const steps: PathStep[] = [{ kind: 'move', to: first }];
  rest.forEach((corner, index) => {
    const before = points[index] ?? corner;
    const after = rest[index + 1];
    if (after === undefined) {
      steps.push({ kind: 'line', to: corner });
      return;
    }
    const inLength = Math.hypot(corner.x - before.x, corner.y - before.y);
    const outLength = Math.hypot(after.x - corner.x, after.y - corner.y);
    // The first corner's in-run and the last one's out-run end at a port.
    const inRoom = index === 0 ? inLength - keepStart : inLength;
    const outRoom = rest[index + 2] === undefined ? outLength - keepEnd : outLength;
    const r = Math.min(radius, inLength / 2, outLength / 2, inRoom, outRoom);
    if (r <= 0) {
      steps.push({ kind: 'line', to: corner });
      return;
    }
    const toward = (from: LayoutPoint, to: LayoutPoint, length: number): LayoutPoint => ({
      x: round(from.x + ((to.x - from.x) / length) * r, precision),
      y: round(from.y + ((to.y - from.y) / length) * r, precision),
    });
    steps.push(
      { kind: 'line', to: toward(corner, before, inLength) },
      { kind: 'quad', control: corner, to: toward(corner, after, outLength) },
    );
  });
  return steps;
};

/**
 * Shortens the run at either end of `steps` by `start`/`end`, so a glyph's own
 * footprint sits at the very end of the line rather than past its last bend.
 *
 * Only a plain `line` step touching the endpoint is shortened; a curve next to
 * the endpoint (a rounded corner's `quad`, or a `cubic` S-curve) is left whole,
 * and its end stops past the glyph's run instead. When the two ends share one
 * run (a two-point line), the trims are clamped to meet at its midpoint rather
 * than cross, so the line never reverses.
 */
export const trimSteps = (steps: readonly PathStep[], start: number, end: number): readonly PathStep[] => {
  if (steps.length < 2 || (start === 0 && end === 0)) return steps;
  const head = steps[0];
  const firstRun = steps[1];
  const tail = steps.at(-1);
  const beforeTail = steps.at(-2);
  const canStart = start > 0 && head?.kind === 'move' && firstRun?.kind === 'line';
  const canEnd = end > 0 && tail?.kind === 'line' && beforeTail !== undefined;
  if (!canStart && !canEnd) return steps;

  const distance = (a: LayoutPoint, b: LayoutPoint): number => Math.hypot(b.x - a.x, b.y - a.y);
  const startRun = canStart ? distance(head.to, firstRun.to) : 0;
  const endRun = canEnd ? distance(beforeTail.to, tail.to) : 0;

  let startAmount = start;
  let endAmount = end;
  // A single straight line is shortened from both ends; clamp so they meet at
  // the middle instead of crossing when their trims add up past the run.
  if (canStart && canEnd && steps.length === 2 && startAmount + endAmount > startRun) {
    startAmount = startRun / 2;
    endAmount = endRun / 2;
  }

  const trimmed = [...steps];
  if (canStart && startAmount > 0 && startAmount < startRun) {
    trimmed[0] = {
      kind: 'move',
      to: {
        x: head.to.x + ((firstRun.to.x - head.to.x) / startRun) * startAmount,
        y: head.to.y + ((firstRun.to.y - head.to.y) / startRun) * startAmount,
      },
    };
  }
  if (canEnd && endAmount > 0 && endAmount < endRun) {
    trimmed[trimmed.length - 1] = {
      kind: 'line',
      to: {
        x: tail.to.x - ((tail.to.x - beforeTail.to.x) / endRun) * endAmount,
        y: tail.to.y - ((tail.to.y - beforeTail.to.y) / endRun) * endAmount,
      },
    };
  }
  return trimmed;
};

/**
 * An end of `points` as a frame: the tip, and the unit vector into the line.
 * A route with no length falls back to its port side (out to the right at the
 * start, in from the left at the end), matching the direction a glyph assumes
 * when there is nothing to measure.
 */
export const endFrame = (points: readonly LayoutPoint[], side: EndSide): EndFrame => {
  const ordered = side === 'start' ? points : [...points].reverse();
  const tip = ordered[0];
  const next = ordered.find((p) => tip !== undefined && (p.x !== tip.x || p.y !== tip.y));
  if (tip === undefined || next === undefined) {
    return { tip: tip ?? { x: 0, y: 0 }, inward: { x: side === 'start' ? 1 : -1, y: 0 } };
  }
  const length = Math.hypot(next.x - tip.x, next.y - tip.y);
  return { tip, inward: { x: (next.x - tip.x) / length, y: (next.y - tip.y) / length } };
};

const NUMBER = /[-+]?(?:\d*\.\d+|\d+\.?)(?:e[-+]?\d+)?/gi;

/** One command of a `d` and its numbers; the letters exclude `e` so an exponent stays inside its number. */
const COMMAND = /[MLQCSTAHVZmlqcstahvz][^MLQCSTAHVZmlqcstahvz]*/g;

/**
 * The end point of each `M`/`L`/`Q`/`C` command of a path's `d`, for tests and
 * QA that need the geometry a `d` was drawn from. An `A` (the arc a line jump
 * draws) is skipped: it bends the line without adding a vertex to reason about.
 */
export const pathDataPoints = (d: string): readonly LayoutPoint[] => {
  const out: LayoutPoint[] = [];
  for (const token of d.match(COMMAND) ?? []) {
    if (!/[MLQC]/i.test(token.charAt(0))) continue;
    const numbers = (token.slice(1).match(NUMBER) ?? []).map(Number);
    const x = numbers.at(-2);
    const y = numbers.at(-1);
    if (x !== undefined && y !== undefined) out.push({ x, y });
  }
  return out;
};
