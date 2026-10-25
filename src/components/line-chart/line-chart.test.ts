// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';

import { DpkLineChart, defineLineChart } from './element';
import { lineChartLayout, parseLineChartData } from './model';

defineLineChart();

const data = {
  title: 'Orders',
  caption: 'today: 42',
  series: [
    {
      id: 'actual',
      label: 'Actual',
      tone: 'blue',
      area: true,
      points: [
        { x: 'Mon', y: 12 },
        { x: 'Tue', y: 20 },
        { x: 'Wed', y: 18 },
      ],
    },
    {
      id: 'ideal',
      label: 'Target',
      tone: 'green',
      points: [
        { x: 'Mon', y: 10 },
        { x: 'Tue', y: 16 },
        { x: 'Wed', y: 22 },
      ],
    },
  ],
  guides: [
    {
      id: 'average',
      label: 'Average',
      points: [
        { x: 'Mon', y: 16 },
        { x: 'Wed', y: 16 },
      ],
    },
  ],
  marks: [{ x: 'Tue', label: 'Release', tone: 'amber' }],
  xAxis: { label: 'Day' },
  yAxis: { label: 'Orders', min: 0 },
} as const;

describe('parseLineChartData', () => {
  it('reads series, guides and marks', () => {
    const parsed = parseLineChartData(data);
    expect(parsed.series.map((series) => series.id)).toEqual(['actual', 'ideal']);
    expect(parsed.guides[0]).toMatchObject({ id: 'average', dashed: true, tone: 'ink-faint' });
    expect(parsed.marks[0]).toMatchObject({ x: 'Tue', tone: 'amber' });
    expect(parsed.yAxis).toEqual({ label: 'Orders', min: 0 });
  });

  it('rejects unknown keys and duplicate x values in one line', () => {
    expect(() => parseLineChartData({ ...data, extra: true })).toThrow();
    expect(() =>
      parseLineChartData({
        series: [
          {
            id: 'one',
            label: 'One',
            points: [
              { x: 'a', y: 1 },
              { x: 'a', y: 2 },
            ],
          },
        ],
      }),
    ).toThrow(/duplicate x/);
  });

  it('rejects duplicate line ids and an empty vertical range', () => {
    expect(() =>
      parseLineChartData({
        series: [
          { id: 'same', label: 'A', points: [] },
          { id: 'same', label: 'B', points: [] },
        ],
      }),
    ).toThrow(/duplicate series id/);
    expect(() => parseLineChartData({ series: [], yAxis: { min: 10, max: 10 } })).toThrow(/less than/);
  });
});

describe('lineChartLayout', () => {
  it('lays the shared x domain, two lines, the guide and the mark out', () => {
    const layout = lineChartLayout(parseLineChartData(data));
    expect(layout).not.toBeNull();
    if (layout === null) return;
    expect(layout.xTicks.map((tick) => tick.label)).toEqual(['Mon', 'Tue', 'Wed']);
    expect(layout.series[0]?.path.startsWith('M')).toBe(true);
    expect(layout.series[0]?.areaPath).toMatch(/Z$/);
    expect(layout.series[1]?.areaPath).toBeNull();
    expect(layout.guides[0]?.path.startsWith('M')).toBe(true);
    expect(layout.marks).toHaveLength(1);
    expect(layout.marks[0]?.x).toBeGreaterThan(layout.plot.left);
    expect(layout.yTicks.some((tick) => tick.label === '0')).toBe(true);
  });

  it('returns null with nothing to plot', () => {
    expect(lineChartLayout(parseLineChartData({ series: [] }))).toBeNull();
  });

  it('centres a single point', () => {
    const layout = lineChartLayout(
      parseLineChartData({ series: [{ id: 'one', label: 'One', points: [{ x: 'x', y: 1 }] }] }),
    );
    expect(layout).not.toBeNull();
    if (layout === null) return;
    expect(layout.series[0]?.nodes[0]?.x).toBe(layout.plot.left + layout.plot.width / 2);
  });
});

describe('dpk-line-chart', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  const mount = async (input?: unknown): Promise<DpkLineChart> => {
    const element = document.createElement('dpk-line-chart');
    if (!(element instanceof DpkLineChart)) throw new Error('not upgraded');
    if (input !== undefined) element.data = parseLineChartData(input);
    document.body.append(element);
    await element.updateComplete;
    return element;
  };

  it('draws the lines, guides and marks from data', async () => {
    const element = await mount(data);
    const root = element.shadowRoot;
    expect(root?.querySelector('.dpk-chart-title')?.textContent).toBe('Orders');
    expect(root?.querySelectorAll('.dpk-chart-line')).toHaveLength(2);
    expect(root?.querySelectorAll('.dpk-chart-area')).toHaveLength(1);
    expect(root?.querySelectorAll('.guide')).toHaveLength(1);
    expect(root?.querySelectorAll('.dpk-chart-mark')).toHaveLength(1);
    expect(root?.querySelectorAll('.dpk-chart-key')).toHaveLength(4);
  });

  it('reads the same shape from a JSON child', async () => {
    const element = document.createElement('dpk-line-chart');
    if (!(element instanceof DpkLineChart)) throw new Error('not upgraded');
    element.innerHTML = `<script type="application/json">${JSON.stringify(data)}</script>`;
    document.body.append(element);
    await element.updateComplete;
    expect(element.shadowRoot?.querySelectorAll('.dpk-chart-line')).toHaveLength(2);
  });

  it('shows an error for invalid data and an empty state with none', async () => {
    const element = document.createElement('dpk-line-chart');
    if (!(element instanceof DpkLineChart)) throw new Error('not upgraded');
    element.innerHTML = `<script type="application/json">{ "series": "no" }</script>`;
    document.body.append(element);
    await element.updateComplete;
    expect(element.shadowRoot?.textContent).toContain('Invalid chart data');

    const empty = await mount();
    expect(empty.shadowRoot?.textContent).toContain('No data to plot');
  });
});
