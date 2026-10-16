import type { BurndownPoint } from './burndown';

const DAY = 24 * 60 * 60 * 1000;
/** The room a time axis label needs, in viewBox units: it decides how fine the ticks can be. */
const TICK_ROOM = 48;
/** How close (in viewBox units) the pointer must come to a point to read that point. */
const SNAP = 8;

/** How far apart the time axis ticks are. */
export type AxisUnit = 'day' | 'week' | 'biweek' | 'month' | 'quarter' | 'year';

/** The drawing area of a chart, in its own viewBox units. */
export type ChartSize = {
  readonly width: number;
  readonly height: number;
  /** Room left around the plot for the axis labels. */
  readonly inset: { readonly top: number; readonly right: number; readonly bottom: number; readonly left: number };
};

export type ChartDot = {
  readonly x: number;
  readonly y: number;
  readonly at: number;
  readonly value: number;
  /** The snapshot it was read from; the last dot (the map now) has none. */
  readonly snapshotId?: string;
};

/** Where everything of one burndown chart goes. Pure geometry: the renderer only draws it. */
export type ChartLayout = {
  readonly size: ChartSize;
  readonly plot: { readonly left: number; readonly top: number; readonly right: number; readonly bottom: number };
  /** The actual line, as an SVG `points` list. */
  readonly line: string;
  readonly dots: readonly ChartDot[];
  /** From the first point straight down to 0 at the due date; `null` without a due date. */
  readonly ideal: { readonly x1: number; readonly y1: number; readonly x2: number; readonly y2: number } | null;
  readonly nowX: number;
  readonly dueX: number | null;
  readonly yTicks: readonly { readonly y: number; readonly value: number }[];
  /** The value at the top of the plot. */
  readonly valueTop: number;
  readonly xUnit: AxisUnit;
  readonly xTicks: readonly { readonly x: number; readonly at: number }[];
  /** The time the plot spans, left edge to right edge. */
  readonly domain: { readonly start: number; readonly end: number };
  /** Where the ideal line starts (the first point) and where it reaches 0; `null` without a due date. */
  readonly idealSpan: { readonly at: number; readonly value: number; readonly due: number } | null;
};

/**
 * Lays out a burndown: time runs from the first point to the due date (or
 * now, whichever is later), the values from 0 up to a round number above
 * the highest one.
 */
export const layoutChart = (
  points: readonly BurndownPoint[],
  due: number | null,
  now: number,
  size: ChartSize,
): ChartLayout => {
  const plot = {
    left: size.inset.left,
    top: size.inset.top,
    right: size.width - size.inset.right,
    bottom: size.height - size.inset.bottom,
  };
  const ats = [...points.map((point) => point.at), now, ...(due === null ? [] : [due])];
  let start = Math.min(...ats);
  let end = Math.max(...ats);
  if (end - start < DAY) {
    start -= DAY / 2;
    end += DAY / 2;
  }
  const ticks = valueTicks(Math.max(0, ...points.map((point) => point.value)));
  const top = ticks.at(-1) ?? 1;
  const x = (at: number): number => plot.left + ((at - start) / (end - start)) * (plot.right - plot.left);
  const y = (value: number): number => plot.bottom - (value / top) * (plot.bottom - plot.top);
  const dots = points.map((point) => ({
    x: x(point.at),
    y: y(point.value),
    at: point.at,
    value: point.value,
    ...(point.snapshotId === undefined ? {} : { snapshotId: point.snapshotId }),
  }));
  const first = dots[0];
  const time = timeTicks(start, end, Math.floor((plot.right - plot.left) / TICK_ROOM));
  return {
    size,
    plot,
    line: dots.map((dot) => `${round(dot.x)},${round(dot.y)}`).join(' '),
    dots,
    ideal: due === null || !first ? null : { x1: first.x, y1: first.y, x2: x(due), y2: y(0) },
    nowX: x(now),
    dueX: due === null ? null : x(due),
    yTicks: ticks.map((value) => ({ y: y(value), value })),
    valueTop: top,
    xUnit: time.unit,
    xTicks: time.ats.map((at) => ({ x: x(at), at })),
    domain: { start, end },
    idealSpan: due === null || !first ? null : { at: first.at, value: first.value, due },
  };
};

/**
 * The value axis ticks, from 0 up to the first tick at or above `max`: a
 * whole step of 1, 2, 2.5 or 5 × 10ⁿ chosen so there are about four of them.
 */
export const valueTicks = (max: number): readonly number[] => {
  const step = tickStep(max / 4);
  const count = Math.max(1, Math.ceil(max / step));
  return Array.from({ length: count + 1 }, (_tick, index) => index * step);
};

/** The smallest whole step of 1, 2, 2.5 or 5 × 10ⁿ at or above `span`. */
const tickStep = (span: number): number => {
  if (span <= 1) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(span));
  const factor = [1, 2, 2.5, 5, 10].find((each) => Number.isInteger(each * magnitude) && each * magnitude >= span);
  return (factor ?? 10) * magnitude;
};

const round = (value: number): number => Math.round(value * 100) / 100;

/**
 * The time axis ticks between `start` and `end` (local midnights): by the
 * finest unit that keeps them to `max` — days, Monday weeks, every other
 * Monday, months, quarters, then years.
 */
export const timeTicks = (start: number, end: number, max: number): { unit: AxisUnit; ats: readonly number[] } => {
  const limit = Math.max(1, max);
  const units: readonly AxisUnit[] = ['day', 'week', 'biweek', 'month', 'quarter'];
  for (const unit of units) {
    const ats = ticksOf(unit, start, end, limit);
    if (ats !== null) return { unit, ats };
  }
  return { unit: 'year', ats: ticksOf('year', start, end, Infinity) ?? [] };
};

/** Every `unit` boundary from `start` to `end`, or `null` once there are more than `limit`. */
const ticksOf = (unit: AxisUnit, start: number, end: number, limit: number): readonly number[] | null => {
  const ats: number[] = [];
  for (let at = firstBoundary(unit, start); at <= end; at = nextBoundary(unit, at)) {
    if (ats.length === limit) return null;
    ats.push(at);
  }
  return ats;
};

const firstBoundary = (unit: AxisUnit, start: number): number => {
  const date = new Date(start);
  const [year, month, day] = [date.getFullYear(), date.getMonth(), date.getDate()];
  const atOrAfter = (candidate: Date, next: () => Date): number =>
    candidate.getTime() >= start ? candidate.getTime() : next().getTime();
  switch (unit) {
    case 'day':
      return atOrAfter(new Date(year, month, day), () => new Date(year, month, day + 1));
    case 'week':
    case 'biweek': {
      const midnight = atOrAfter(new Date(year, month, day), () => new Date(year, month, day + 1));
      const from = new Date(midnight);
      const toMonday = (8 - from.getDay()) % 7;
      return new Date(from.getFullYear(), from.getMonth(), from.getDate() + toMonday).getTime();
    }
    case 'month':
      return atOrAfter(new Date(year, month, 1), () => new Date(year, month + 1, 1));
    case 'quarter': {
      const quarter = month - (month % 3);
      return atOrAfter(new Date(year, quarter, 1), () => new Date(year, quarter + 3, 1));
    }
    case 'year':
      return atOrAfter(new Date(year, 0, 1), () => new Date(year + 1, 0, 1));
  }
};

const nextBoundary = (unit: AxisUnit, at: number): number => {
  const date = new Date(at);
  const [year, month, day] = [date.getFullYear(), date.getMonth(), date.getDate()];
  const days = { day: 1, week: 7, biweek: 14 } as const;
  const months = { month: 1, quarter: 3, year: 12 } as const;
  return unit === 'day' || unit === 'week' || unit === 'biweek'
    ? new Date(year, month, day + days[unit]).getTime()
    : new Date(year, month + months[unit], 1).getTime();
};

/** What a chart reads where the pointer is: the time there and both lines' values (`null` where a line has none). */
export type ChartReadout = {
  readonly x: number;
  readonly at: number;
  readonly actual: number | null;
  readonly ideal: number | null;
  /** Where each value sits on the plot, to mark it there. */
  readonly actualY: number | null;
  readonly idealY: number | null;
  /** The point the pointer is on, if it is close to one. */
  readonly dot: ChartDot | null;
};

/** Reads the chart at `x` (viewBox units): on a point when one is close, else at that moment of the plot. */
export const readoutAt = (layout: ChartLayout, x: number): ChartReadout => {
  const { plot, domain, dots } = layout;
  const clamped = Math.min(plot.right, Math.max(plot.left, x));
  const nearest = dots.reduce<ChartDot | null>(
    (best, dot) => (best === null || Math.abs(dot.x - clamped) < Math.abs(best.x - clamped) ? dot : best),
    null,
  );
  const dot = nearest !== null && Math.abs(nearest.x - clamped) <= SNAP ? nearest : null;
  const at = dot?.at ?? domain.start + ((clamped - plot.left) / (plot.right - plot.left)) * (domain.end - domain.start);
  const actual = dot?.value ?? actualAt(dots, at);
  const ideal = idealAt(layout, at);
  const y = (value: number | null): number | null =>
    value === null ? null : round(plot.bottom - (value / layout.valueTop) * (plot.bottom - plot.top));
  return { x: dot?.x ?? clamped, at, actual, ideal, actualY: y(actual), idealY: y(ideal), dot };
};

/** The actual line between the two points around `at`; `null` outside the points. */
const actualAt = (dots: readonly ChartDot[], at: number): number | null => {
  const after = dots.findIndex((dot) => dot.at >= at);
  const next = dots[after];
  if (!next) return null;
  if (next.at === at) return next.value;
  const previous = dots[after - 1];
  if (!previous) return null;
  return round(previous.value + ((next.value - previous.value) * (at - previous.at)) / (next.at - previous.at));
};

const idealAt = (layout: ChartLayout, at: number): number | null => {
  const span = layout.idealSpan;
  if (span === null || at < span.at || at > span.due) return null;
  return round((span.value * (span.due - at)) / (span.due - span.at));
};
