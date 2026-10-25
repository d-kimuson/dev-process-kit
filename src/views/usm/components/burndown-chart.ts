import { css, html, LitElement, nothing, svg, type TemplateResult } from 'lit';

import type { StatusTone } from '../model';

import { LocaleController } from '../../../core/locale-controller';
import { momentLabel, type BurndownPoint } from '../burndown';
import { layoutChart, readoutAt, type ChartLayout, type ChartReadout, type ChartSize } from '../burndown-chart';
import { usmMessages, type UsmMessages } from '../messages';
import { statusToneStyle } from '../render/tone';

const chartStyles = css`
  :host {
    position: relative;
    display: block;
  }
  .bd-plot {
    position: relative;
    border-radius: var(--dpk-radius-sm);
    outline: none;
  }
  .bd-plot:focus-visible {
    box-shadow: var(--dpk-focus);
  }
  .bd-svg {
    display: block;
    width: 100%;
    height: auto;
    overflow: visible;
    touch-action: pan-y;
  }
  .bd-grid-line {
    stroke: var(--dpk-rule);
    stroke-width: 1;
  }
  .bd-grid-line[data-axis='x'] {
    stroke-dasharray: 1 3;
  }
  .bd-tick,
  .bd-marker {
    fill: var(--dpk-ink-faint);
    font-family: var(--dpk-mono);
    font-size: 10px;
  }
  .bd-marker {
    font-weight: 650;
  }
  .bd-marker[data-marker='due'] {
    fill: var(--dpk-amber);
  }
  .bd-marker[data-marker='today'] {
    fill: var(--dpk-blue);
  }
  .bd-due {
    stroke: var(--dpk-amber);
    stroke-width: 1.5;
  }
  .bd-now {
    stroke: var(--dpk-blue);
    stroke-width: 1;
    stroke-dasharray: 2 3;
  }
  .bd-ideal {
    stroke: var(--dpk-ink-faint);
    stroke-width: 1.25;
    stroke-dasharray: 5 4;
  }
  .bd-line {
    fill: none;
    stroke: var(--usm-tone);
    stroke-width: 2.25;
    stroke-linejoin: round;
    stroke-linecap: round;
  }
  .bd-dot {
    fill: var(--dpk-paper-raised);
    stroke: var(--usm-tone);
    stroke-width: 2;
  }
  .bd-dot[data-now] {
    fill: var(--usm-tone);
  }
  .bd-cross {
    stroke: var(--dpk-ink-soft);
    stroke-width: 1;
    pointer-events: none;
  }
  .bd-mark {
    stroke: var(--dpk-paper-raised);
    stroke-width: 2;
    pointer-events: none;
  }
  .bd-mark[data-line='actual'] {
    fill: var(--usm-tone);
  }
  .bd-mark[data-line='ideal'] {
    fill: var(--dpk-ink-faint);
  }
  .bd-tip {
    position: absolute;
    z-index: 1;
    display: grid;
    gap: 3px;
    min-width: 116px;
    padding: 7px 10px;
    border: 1px solid var(--dpk-rule-strong);
    border-radius: var(--dpk-radius-sm);
    background: var(--dpk-paper-raised);
    box-shadow: var(--dpk-shadow-sm);
    font-size: 11.5px;
    pointer-events: none;
    white-space: nowrap;
    transform: translateX(10px);
  }
  .bd-tip[data-side='left'] {
    transform: translateX(calc(-100% - 10px));
  }
  .bd-tip-at {
    color: var(--dpk-ink-soft);
    font-family: var(--dpk-mono);
    font-size: 10.5px;
  }
  .bd-tip-row {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--dpk-ink-soft);
  }
  .bd-tip-row b {
    margin-left: auto;
    padding-left: 12px;
    color: var(--dpk-ink);
    font-family: var(--dpk-mono);
    font-variant-numeric: tabular-nums;
  }
  .bd-swatch {
    flex: none;
    width: 12px;
    height: 0;
    border-top: 2.25px solid var(--usm-tone);
  }
  .bd-swatch[data-line='ideal'] {
    border-top: 1.5px dashed var(--dpk-ink-faint);
  }
`;

/**
 * One burndown chart: the actual line, the ideal line to the due date, today
 * and the time axis. Where the pointer rests (or, from the keyboard, on the
 * point the arrow keys reach) it reads both lines out. It only draws: the
 * points come in from the host.
 */
export class DpkInternalUsmBurndownChart extends LitElement {
  static override styles = [chartStyles];

  static override properties = {
    points: { attribute: false },
    due: { attribute: false },
    now: { attribute: false },
    size: { attribute: false },
    tone: { attribute: false },
    label: { attribute: false },
    readout: { state: true },
  };

  declare points: readonly BurndownPoint[];
  /** The due date, `null` while the milestone has none. */
  declare due: number | null;
  declare now: number;
  declare size: ChartSize;
  declare tone: StatusTone;
  /** What the chart shows, for its accessible name. */
  declare label: string;
  /** What the chart reads where the pointer is; `null` while it is elsewhere. */
  declare readout: ChartReadout | null;

  readonly #i18n = new LocaleController(this);

  constructor() {
    super();
    this.points = [];
    this.due = null;
    this.now = 0;
    this.size = { width: 320, height: 160, inset: { top: 12, right: 12, bottom: 24, left: 32 } };
    this.tone = 'accent';
    this.label = '';
    this.readout = null;
  }

  protected override render(): TemplateResult {
    const m = usmMessages(this.#i18n.locale);
    const layout = layoutChart(this.points, this.due, this.now, this.size);
    const { size } = layout;
    const latest = this.points.at(-1)?.value ?? 0;
    return html`<div
      class="bd-plot"
      tabindex="0"
      role="img"
      aria-label=${m.chartAria(this.label, latest)}
      style=${statusToneStyle(this.tone)}
      @pointermove=${(event: PointerEvent) => this.#readAtPointer(layout, event)}
      @pointerleave=${() => (this.readout = null)}
      @focus=${() => this.#readDot(layout, layout.dots.length - 1)}
      @blur=${() => (this.readout = null)}
      @keydown=${(event: KeyboardEvent) => this.#onKeydown(layout, event)}
    >
      <svg class="bd-svg" viewBox=${`0 0 ${size.width} ${size.height}`} aria-hidden="true">
        ${renderAxes(m, layout)} ${renderLines(layout)} ${this.readout ? renderCross(layout, this.readout) : nothing}
      </svg>
      ${this.readout ? renderTip(m, layout, this.readout) : nothing}
    </div>`;
  }

  #readAtPointer(layout: ChartLayout, event: PointerEvent): void {
    const svgBox = this.renderRoot.querySelector('svg')?.getBoundingClientRect();
    if (!svgBox || svgBox.width === 0) return;
    this.readout = readoutAt(layout, ((event.clientX - svgBox.left) / svgBox.width) * layout.size.width);
  }

  #readDot(layout: ChartLayout, index: number): void {
    const dot = layout.dots[index];
    this.readout = dot ? readoutAt(layout, dot.x) : null;
  }

  /** The arrow keys step through the points, Home and End jump to the first and the last. */
  #onKeydown(layout: ChartLayout, event: KeyboardEvent): void {
    const last = layout.dots.length - 1;
    const current = layout.dots.findIndex((dot) => dot === this.readout?.dot);
    const index = (() => {
      switch (event.key) {
        case 'ArrowLeft':
          return Math.max(0, (current === -1 ? last : current) - 1);
        case 'ArrowRight':
          return Math.min(last, (current === -1 ? last : current) + 1);
        case 'Home':
          return 0;
        case 'End':
          return last;
        default:
          return null;
      }
    })();
    if (index === null) return;
    event.preventDefault();
    this.#readDot(layout, index);
  }
}

/** The value grid, the time grid at every tick, the due date and today. */
const renderAxes = (m: UsmMessages, layout: ChartLayout) => {
  const { plot, size } = layout;
  const labelY = size.height - 8;
  return svg`
    ${layout.yTicks.map(
      (tick) => svg`<line class="bd-grid-line" x1=${plot.left} x2=${plot.right} y1=${tick.y} y2=${tick.y}></line>
        <text class="bd-tick" x=${plot.left - 6} y=${tick.y} text-anchor="end" dominant-baseline="middle">${tick.value}</text>`,
    )}
    ${layout.xTicks.map(
      (
        tick,
      ) => svg`<line class="bd-grid-line" data-axis="x" x1=${tick.x} x2=${tick.x} y1=${plot.top} y2=${plot.bottom}></line>
        <text class="bd-tick" data-axis="x" x=${tick.x} y=${labelY} text-anchor="middle">${m.axisDate(tick.at, layout.xUnit)}</text>`,
    )}
    ${
      layout.dueX === null || layout.idealSpan === null
        ? nothing
        : svg`<line class="bd-due" x1=${layout.dueX} x2=${layout.dueX} y1=${plot.top} y2=${plot.bottom}></line>
          <text class="bd-marker" data-marker="due" x=${layout.dueX - 4} y=${plot.top + 10} text-anchor="end">${`${m.chartDue} ${m.axisDate(layout.idealSpan.due, 'day')}`}</text>`
    }
    <line class="bd-now" x1=${layout.nowX} x2=${layout.nowX} y1=${plot.top} y2=${plot.bottom}></line>
    <text class="bd-marker" data-marker="today" x=${layout.nowX + 4} y=${plot.top + 10} text-anchor="start">${m.chartToday}</text>
  `;
};

const renderLines = (layout: ChartLayout) => svg`
  ${
    layout.ideal
      ? svg`<line class="bd-ideal" x1=${layout.ideal.x1} y1=${layout.ideal.y1} x2=${layout.ideal.x2} y2=${layout.ideal.y2}></line>`
      : nothing
  }
  <polyline class="bd-line" points=${layout.line}></polyline>
  ${layout.dots.map(
    (dot) =>
      svg`<circle class="bd-dot" data-now=${dot.snapshotId === undefined ? 'true' : nothing} cx=${dot.x} cy=${dot.y} r="3.5"></circle>`,
  )}
`;

/** The line down the plot where the pointer is, and a mark on each line there. */
const renderCross = (layout: ChartLayout, readout: ChartReadout) => svg`
  <line class="bd-cross" x1=${readout.x} x2=${readout.x} y1=${layout.plot.top} y2=${layout.plot.bottom}></line>
  ${readout.idealY === null ? nothing : svg`<circle class="bd-mark" data-line="ideal" cx=${readout.x} cy=${readout.idealY} r="3.5"></circle>`}
  ${readout.actualY === null ? nothing : svg`<circle class="bd-mark" data-line="actual" cx=${readout.x} cy=${readout.actualY} r="4.5"></circle>`}
`;

/** Both lines' values where the pointer is, beside it (on its left past the middle). */
const renderTip = (m: UsmMessages, layout: ChartLayout, readout: ChartReadout): TemplateResult => {
  const { size, plot } = layout;
  const side = readout.x > size.width * 0.6 ? 'left' : 'right';
  const at = readout.dot
    ? readout.dot.snapshotId === undefined
      ? `${m.chartNow} · ${momentLabel(readout.dot.at)}`
      : momentLabel(readout.dot.at)
    : m.axisDate(readout.at, 'day');
  return html`<div
    class="bd-tip"
    data-testid="usm-chart-readout"
    data-side=${side}
    style=${`left: ${(readout.x / size.width) * 100}%; top: calc(${(plot.top / size.height) * 100}% + 20px)`}
  >
    <span class="bd-tip-at">${at}</span>
    ${
      readout.actual === null
        ? nothing
        : html`<span class="bd-tip-row" data-line="actual"
            ><span class="bd-swatch" data-line="actual"></span>${m.chartActual}<b>${readout.actual}</b></span
          >`
    }
    ${
      readout.ideal === null
        ? nothing
        : html`<span class="bd-tip-row" data-line="ideal"
            ><span class="bd-swatch" data-line="ideal"></span>${m.chartIdeal}<b>${readout.ideal}</b></span
          >`
    }
  </div>`;
};

export const defineUsmBurndownChart = (): void => {
  if (!customElements.get('dpk-internal-usm-burndown-chart'))
    customElements.define('dpk-internal-usm-burndown-chart', DpkInternalUsmBurndownChart);
};
