/**
 * Pure model of `<dpk-line-chart>`: strict data parsing and the geometry of the
 * SVG it renders. No DOM, no Lit — `element.ts` only draws what this returns.
 *
 * `series` are the lines; `guides` are the auxiliary lines (an ideal, a
 * baseline); `marks` are the moments ruled down through the plot. One x domain
 * is shared by all of them, in the order the data writes it.
 */
import * as v from 'valibot';

import { entityIdSchema } from '../../core/schema';

export const CHART_TONES = ['blue', 'green', 'amber', 'violet', 'accent', 'ink-faint'] as const;
export type LineChartTone = (typeof CHART_TONES)[number];

export type LineChartPoint = {
  readonly x: string;
  readonly y: number;
};

export type LineChartSeries = {
  readonly id: string;
  readonly label: string;
  readonly points: readonly LineChartPoint[];
  readonly tone: LineChartTone;
  readonly area: boolean;
};

export type LineChartGuide = {
  readonly id: string;
  readonly label: string;
  readonly points: readonly LineChartPoint[];
  readonly tone: LineChartTone;
  readonly dashed: boolean;
};

export type LineChartMark = {
  readonly x: string;
  readonly label: string;
  readonly tone: LineChartTone;
};

export type LineChartAxis = {
  readonly label?: string | undefined;
  readonly min?: number | undefined;
  readonly max?: number | undefined;
};

export type LineChartData = {
  readonly title: string;
  readonly caption: string;
  readonly series: readonly LineChartSeries[];
  readonly guides: readonly LineChartGuide[];
  readonly marks: readonly LineChartMark[];
  readonly xAxis: LineChartAxis;
  readonly yAxis: LineChartAxis;
};

const pointSchema = v.strictObject({
  x: v.pipe(v.string(), v.minLength(1)),
  y: v.pipe(v.number(), v.finite()),
});

const seriesSchema = v.strictObject({
  id: entityIdSchema,
  label: v.pipe(v.string(), v.minLength(1)),
  points: v.array(pointSchema),
  tone: v.optional(v.picklist(CHART_TONES), 'blue'),
  area: v.optional(v.boolean(), false),
});

const guideSchema = v.strictObject({
  id: entityIdSchema,
  label: v.pipe(v.string(), v.minLength(1)),
  points: v.array(pointSchema),
  tone: v.optional(v.picklist(CHART_TONES), 'ink-faint'),
  dashed: v.optional(v.boolean(), true),
});

const markSchema = v.strictObject({
  x: v.pipe(v.string(), v.minLength(1)),
  label: v.pipe(v.string(), v.minLength(1)),
  tone: v.optional(v.picklist(CHART_TONES), 'accent'),
});

const axisSchema = v.strictObject({
  label: v.optional(v.string()),
  min: v.optional(v.pipe(v.number(), v.finite())),
  max: v.optional(v.pipe(v.number(), v.finite())),
});

const lineChartSchema = v.strictObject({
  title: v.optional(v.string(), ''),
  caption: v.optional(v.string(), ''),
  series: v.optional(v.array(seriesSchema), []),
  guides: v.optional(v.array(guideSchema), []),
  marks: v.optional(v.array(markSchema), []),
  xAxis: v.optional(axisSchema, {}),
  yAxis: v.optional(axisSchema, {}),
});

const assertUnique = (values: readonly string[], what: string): void => {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) throw new Error(`duplicate ${what}: ${value}`);
    seen.add(value);
  }
};

const assertPoints = (points: readonly LineChartPoint[], label: string): void => {
  assertUnique(
    points.map((point) => point.x),
    `x in "${label}"`,
  );
};

export const emptyLineChartData = (): LineChartData => ({
  title: '',
  caption: '',
  series: [],
  guides: [],
  marks: [],
  xAxis: {},
  yAxis: {},
});

export const parseLineChartData = (input: unknown): LineChartData => {
  const parsed = v.parse(lineChartSchema, input);
  assertUnique(
    parsed.series.map((series) => series.id),
    'series id',
  );
  assertUnique(
    parsed.guides.map((guide) => guide.id),
    'guide id',
  );
  for (const series of parsed.series) assertPoints(series.points, series.label);
  for (const guide of parsed.guides) assertPoints(guide.points, guide.label);
  if (parsed.yAxis.min !== undefined && parsed.yAxis.max !== undefined && parsed.yAxis.min >= parsed.yAxis.max) {
    throw new Error('yAxis.min must be less than yAxis.max');
  }
  return parsed;
};

export type LineChartSeriesLayout = LineChartSeries & {
  readonly path: string;
  readonly areaPath: string | null;
  readonly nodes: readonly { readonly x: number; readonly y: number }[];
};

export type LineChartGuideLayout = LineChartGuide & {
  readonly path: string;
};

export type LineChartMarkLayout = Omit<LineChartMark, 'x'> & {
  readonly x: number;
};

export type LineChartLayout = {
  readonly width: number;
  readonly height: number;
  readonly plot: { readonly left: number; readonly top: number; readonly width: number; readonly height: number };
  readonly series: readonly LineChartSeriesLayout[];
  readonly guides: readonly LineChartGuideLayout[];
  readonly marks: readonly LineChartMarkLayout[];
  readonly xTicks: readonly { readonly x: number; readonly label: string }[];
  readonly yTicks: readonly { readonly y: number; readonly label: string }[];
};

const PAD = { top: 22, right: 18, bottom: 38, left: 52 } as const;
const MAX_X_TICKS = 6;

const xKeysOf = (data: LineChartData): readonly string[] => {
  const keys: string[] = [];
  const seen = new Set<string>();
  for (const item of [...data.series, ...data.guides]) {
    for (const point of item.points) {
      if (seen.has(point.x)) continue;
      seen.add(point.x);
      keys.push(point.x);
    }
  }
  return keys;
};

const yRangeOf = (data: LineChartData): { min: number; max: number } | null => {
  const values = [...data.series, ...data.guides].flatMap((item) => item.points.map((point) => point.y));
  if (values.length === 0) return null;
  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);
  const min = data.yAxis.min ?? Math.min(0, dataMin);
  let max = data.yAxis.max ?? dataMax;
  if (max <= min) max = min + 1;
  if (data.yAxis.max === undefined) {
    const span = max - min;
    max += span * 0.08;
  }
  return { min, max };
};

const linePath = (points: readonly { readonly x: number; readonly y: number }[]): string => {
  if (points.length === 0) return '';
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'}${round(point.x)} ${round(point.y)}`).join(' ');
};

const areaPathOf = (points: readonly { readonly x: number; readonly y: number }[], baseline: number): string | null => {
  if (points.length === 0) return null;
  return `${linePath(points)} L${round(points.at(-1)?.x ?? 0)} ${round(baseline)} L${round(points[0]?.x ?? 0)} ${round(baseline)} Z`;
};

const round = (value: number): number => Math.round(value * 100) / 100;

const formatValue = (value: number): string => {
  if (Number.isInteger(value)) return String(value);
  return String(Math.round(value * 10) / 10);
};

const niceStep = (span: number, count: number): number => {
  const rough = span / Math.max(1, count);
  const power = 10 ** Math.floor(Math.log10(rough));
  const normalized = rough / power;
  const factor = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return factor * power;
};

const yTicksOf = (min: number, max: number, yAt: (value: number) => number): LineChartLayout['yTicks'] => {
  const step = niceStep(max - min, 4);
  const first = Math.ceil(min / step) * step;
  const ticks: { y: number; label: string }[] = [];
  for (let value = first; value <= max + step / 1000; value += step) {
    ticks.push({ y: yAt(value), label: formatValue(value) });
  }
  // Always name the bottom of the plot, even when the steps do not land there.
  const baseline = yAt(min);
  if (!ticks.some((tick) => Math.abs(tick.y - baseline) < 0.01)) {
    ticks.push({ y: baseline, label: formatValue(min) });
  }
  return ticks;
};

const xTicksOf = (keys: readonly string[], xAt: (index: number) => number): LineChartLayout['xTicks'] => {
  if (keys.length === 0) return [];
  if (keys.length <= MAX_X_TICKS) return keys.map((label, index) => ({ x: xAt(index), label }));
  const indices = Array.from({ length: MAX_X_TICKS }, (_, index) =>
    Math.round((index * (keys.length - 1)) / (MAX_X_TICKS - 1)),
  );
  return [...new Set(indices)].map((index) => ({ x: xAt(index), label: keys[index] ?? '' }));
};

export const lineChartLayout = (data: LineChartData, width = 720, height = 280): LineChartLayout | null => {
  const keys = xKeysOf(data);
  const range = yRangeOf(data);
  if (keys.length === 0 || range === null) return null;
  const plot = {
    left: PAD.left,
    top: PAD.top,
    width: width - PAD.left - PAD.right,
    height: height - PAD.top - PAD.bottom,
  };
  const indexOf = new Map(keys.map((key, index) => [key, index] as const));
  const xAt = (index: number): number =>
    keys.length === 1 ? plot.left + plot.width / 2 : plot.left + (index / (keys.length - 1)) * plot.width;
  const yAt = (value: number): number => plot.top + (1 - (value - range.min) / (range.max - range.min)) * plot.height;
  const nodesOf = (points: readonly LineChartPoint[]) =>
    points
      .flatMap((point) => {
        const index = indexOf.get(point.x);
        return index === undefined ? [] : [{ x: xAt(index), y: yAt(point.y) }];
      })
      .sort((a, b) => a.x - b.x);
  const baseline = plot.top + plot.height;

  return {
    width,
    height,
    plot,
    series: data.series.map((series) => {
      const nodes = nodesOf(series.points);
      return {
        ...series,
        nodes,
        path: linePath(nodes),
        areaPath: series.area ? areaPathOf(nodes, baseline) : null,
      };
    }),
    guides: data.guides.map((guide) => ({ ...guide, path: linePath(nodesOf(guide.points)) })),
    marks: data.marks.flatMap((mark) => {
      const index = indexOf.get(mark.x);
      return index === undefined ? [] : [{ ...mark, x: xAt(index) }];
    }),
    xTicks: xTicksOf(keys, xAt),
    yTicks: yTicksOf(range.min, range.max, yAt),
  };
};
