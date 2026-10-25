/**
 * `<dpk-line-chart>` — a data-driven line chart.
 *
 * The data is one object (`data` property) or a `script[type="application/json"]`
 * child: `series` are the lines, `guides` the auxiliary lines, `marks` the
 * moments ruled through the plot, and `xAxis`/`yAxis` name the axes and may pin
 * the vertical range. The drawing is the chart atom's shape; this element only
 * turns numbers into an SVG.
 */
import {
  css,
  html,
  LitElement,
  nothing,
  svg,
  type CSSResultGroup,
  type PropertyDeclarations,
  type TemplateResult,
} from 'lit';

import { LocaleController } from '../../core/locale-controller';
import { observeJsonChild } from '../../lib/dom/base-data';
import { chartAtom } from '../atoms/index';
import { lineChartMessages } from './messages';
import {
  lineChartLayout,
  parseLineChartData,
  type LineChartData,
  type LineChartGuideLayout,
  type LineChartLayout,
  type LineChartMarkLayout,
  type LineChartSeriesLayout,
} from './model';

const chartStyles = css`
  :host {
    display: block;
    min-width: 0;
  }

  .guide {
    fill: none;
    stroke: var(--tone, var(--dpk-ink-faint));
    stroke-width: 1.25;
  }

  .guide[data-dashed] {
    stroke-dasharray: 5 4;
  }

  .axis-label {
    fill: var(--dpk-ink-faint);
    font-family: var(--dpk-mono);
    font-size: 10px;
  }
`;

const toneStyle = (tone: string): string => `--tone: var(--dpk-${tone})`;

export class DpkLineChart extends LitElement {
  static override styles: CSSResultGroup = [chartAtom, chartStyles];

  static override properties: PropertyDeclarations = {
    data: { attribute: false },
  };

  declare data: LineChartData | null;

  readonly #i18n = new LocaleController(this);
  #chart: LineChartData | null = null;
  #error: string | null = null;
  #stopJsonChild: (() => void) | null = null;

  constructor() {
    super();
    this.data = null;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#stopJsonChild = observeJsonChild(this, parseLineChartData, (result) => {
      if (result.ok) {
        this.data = result.value;
        this.#error = null;
      } else {
        this.#chart = null;
        this.#error = result.error;
      }
      this.requestUpdate();
    });
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#stopJsonChild?.();
    this.#stopJsonChild = null;
  }

  protected override willUpdate(changed: Map<PropertyKey, unknown>): void {
    if (!changed.has('data')) return;
    if (this.data === null) {
      this.#chart = null;
      return;
    }
    try {
      this.#chart = parseLineChartData(this.data);
      this.#error = null;
    } catch (error) {
      this.#chart = null;
      this.#error = error instanceof Error ? error.message : String(error);
    }
  }

  protected override render(): TemplateResult {
    const m = lineChartMessages(this.#i18n.locale);
    const chart = this.#chart;
    const layout = chart === null ? null : lineChartLayout(chart);
    if (this.#error !== null) {
      return this.#frame(html`<p class="dpk-chart-empty">${m.invalid(this.#error)}</p>`);
    }
    if (chart === null || layout === null) return this.#frame(html`<p class="dpk-chart-empty">${m.empty}</p>`);
    const title = chart.title === '' ? m.aria : chart.title;
    return html`<section class="dpk-chart" aria-label=${title}>
      ${
        chart.title === '' && chart.caption === ''
          ? nothing
          : html`<header class="dpk-chart-head">
              ${chart.title === '' ? nothing : html`<span class="dpk-chart-title">${chart.title}</span>`}
              ${chart.caption === '' ? nothing : html`<span class="dpk-chart-value">${chart.caption}</span>`}
            </header>`
      }
      <div class="dpk-chart-plot">${this.#renderSvg(chart, layout, title)}</div>
      ${this.#renderLegend(chart)}
    </section>`;
  }

  #frame(content: TemplateResult): TemplateResult {
    return html`<section class="dpk-chart" role="status">${content}</section>`;
  }

  #renderSvg(chart: LineChartData, layout: LineChartLayout, title: string): TemplateResult {
    const { plot, width, height } = layout;
    const baseline = plot.top + plot.height;
    return html`<svg viewBox="0 0 ${width} ${height}" role="img" aria-label=${title}>
      <title>${title}</title>
      <g class="dpk-chart-grid">
        ${layout.yTicks.map(
          (tick) => svg`<line x1=${plot.left} x2=${plot.left + plot.width} y1=${tick.y} y2=${tick.y}></line>`,
        )}
      </g>
      <g class="dpk-chart-axis">
        <line x1=${plot.left} x2=${plot.left} y1=${plot.top} y2=${baseline}></line>
        <line x1=${plot.left} x2=${plot.left + plot.width} y1=${baseline} y2=${baseline}></line>
      </g>
      ${layout.yTicks.map(
        (tick) =>
          svg`<text class="dpk-chart-tick" x=${plot.left - 8} y=${tick.y + 3} text-anchor="end">${tick.label}</text>`,
      )}
      ${layout.xTicks.map(
        (tick) =>
          svg`<text class="dpk-chart-tick" x=${tick.x} y=${baseline + 16} text-anchor="middle">${tick.label}</text>`,
      )}
      ${
        chart.xAxis.label === undefined
          ? nothing
          : svg`<text class="axis-label" x=${plot.left + plot.width / 2} y=${height - 3} text-anchor="middle">${chart.xAxis.label}</text>`
      }
      ${
        chart.yAxis.label === undefined
          ? nothing
          : svg`<text class="axis-label" x=${12} y=${plot.top + plot.height / 2} text-anchor="middle" transform="rotate(-90 12 ${plot.top + plot.height / 2})">${chart.yAxis.label}</text>`
      }
      ${layout.guides.map((guide) => this.#renderGuide(guide))}
      ${layout.series.map((series) => this.#renderSeries(series))}
      ${layout.marks.map((mark) => this.#renderMark(mark, plot.top, baseline))}
    </svg>`;
  }

  #renderSeries(series: LineChartSeriesLayout): TemplateResult | typeof nothing {
    if (series.path === '') return nothing;
    return html`${series.areaPath === null ? nothing : html`<path class="dpk-chart-area" d=${series.areaPath} style=${toneStyle(series.tone)}></path>`}
      <path class="dpk-chart-line" d=${series.path} style=${toneStyle(series.tone)}></path>
      ${series.nodes.map(
        (node) =>
          html`<circle
            class="dpk-chart-point"
            cx=${node.x}
            cy=${node.y}
            r="2.5"
            style=${toneStyle(series.tone)}
          ></circle>`,
      )}`;
  }

  #renderGuide(guide: LineChartGuideLayout): TemplateResult | typeof nothing {
    if (guide.path === '') return nothing;
    return html`<path
      class="guide"
      d=${guide.path}
      style=${toneStyle(guide.tone)}
      ?data-dashed=${guide.dashed}
    ></path>`;
  }

  #renderMark(mark: LineChartMarkLayout, top: number, baseline: number): TemplateResult {
    return html`<line
        class="dpk-chart-mark"
        x1=${mark.x}
        x2=${mark.x}
        y1=${top}
        y2=${baseline}
        style=${toneStyle(mark.tone)}
      ></line>
      <text class="dpk-chart-mark-label" x=${mark.x + 4} y=${top + 10} style=${toneStyle(mark.tone)}
        >${mark.label}</text
      >`;
  }

  #renderLegend(chart: LineChartData): TemplateResult | typeof nothing {
    if (chart.series.length === 0 && chart.guides.length === 0 && chart.marks.length === 0) return nothing;
    return html`<div class="dpk-chart-legend">
      ${chart.series.map(
        (series) =>
          html`<span class="dpk-chart-key" data-variant=${series.area ? 'area' : 'line'} style=${toneStyle(series.tone)}
            >${series.label}</span
          >`,
      )}
      ${chart.guides.map(
        (guide) =>
          html`<span class="dpk-chart-key" data-variant="dashed" style=${toneStyle(guide.tone)}>${guide.label}</span>`,
      )}
      ${chart.marks.map(
        (mark) =>
          html`<span class="dpk-chart-key" data-variant="mark" style=${toneStyle(mark.tone)}>${mark.label}</span>`,
      )}
    </div>`;
  }
}

export const defineLineChart = (): void => {
  if (!customElements.get('dpk-line-chart')) customElements.define('dpk-line-chart', DpkLineChart);
};
