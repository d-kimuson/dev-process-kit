import { css } from 'lit';

/**
 * The chart atom: a framed plot with its head above it, shared by the line-chart
 * component and author-drawn SVG. The component sets --tone per series and mark.
 */
export const chartAtom = css`
  /*
   * A chart: a framed plot with its head above it. CSS only — the author draws
   * the SVG and this styles it, so a line chart reads as the kit's own: rules
   * in the grid, an axis, ticks, the line with the area under it, its points,
   * the ideal it should have followed and the mark where a moment is called
   * out.
   */
  :where(.dpk-chart) {
    display: grid;
    gap: 8px;
    margin: 0;
    padding: 14px 16px 10px;
    border: 1px solid var(--dpk-rule);
    border-radius: var(--dpk-radius-lg);
    background: var(--dpk-paper-raised);
    box-shadow: var(--dpk-shadow-xs);
  }

  :where(.dpk-chart-head) {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 4px 12px;
  }

  :where(.dpk-chart-title) {
    color: var(--dpk-ink);
    font-size: 13px;
    font-weight: 650;
  }

  :where(.dpk-chart-value) {
    margin-inline-start: auto;
    color: var(--dpk-ink-soft);
    font-family: var(--dpk-mono);
    font-size: 12px;
    font-variant-numeric: tabular-nums;
  }

  :where(.dpk-chart-plot) {
    position: relative;
    min-width: 0;
  }

  :where(.dpk-chart-plot) > :where(svg) {
    display: block;
    width: 100%;
    height: auto;
    overflow: visible;
  }

  :where(.dpk-chart-grid) :where(line, path) {
    fill: none;
    stroke: var(--dpk-rule);
    stroke-width: 1;
  }

  :where(.dpk-chart-axis) :where(line, path) {
    fill: none;
    stroke: var(--dpk-rule-strong);
    stroke-width: 1;
  }

  /* Ticks read as text on both sides: an SVG text is filled, an HTML one is colored. */
  :where(.dpk-chart-tick) {
    color: var(--dpk-ink-faint);
    fill: currentColor;
    font-family: var(--dpk-mono);
    font-size: 10px;
    font-variant-numeric: tabular-nums;
  }

  :where(.dpk-chart-line) {
    fill: none;
    stroke: var(--tone, var(--dpk-blue));
    stroke-width: 2.25;
    stroke-linejoin: round;
    stroke-linecap: round;
  }

  :where(.dpk-chart-area) {
    fill: color-mix(in srgb, var(--tone, var(--dpk-blue)) 14%, transparent);
    stroke: none;
  }

  :where(.dpk-chart-point) {
    fill: var(--dpk-paper-raised);
    stroke: var(--tone, var(--dpk-blue));
    stroke-width: 2;
  }

  /* Where the line should have gone: the same shape, dashed and gray. */
  :where(.dpk-chart-ideal) {
    fill: none;
    stroke: var(--dpk-ink-faint);
    stroke-width: 1.25;
    stroke-dasharray: 5 4;
  }

  /* The moment the chart calls out, ruled down through the plot. */
  :where(.dpk-chart-mark) {
    stroke: var(--tone, var(--dpk-accent));
    stroke-width: 1.5;
    stroke-dasharray: 2 3;
  }

  :where(.dpk-chart-mark-label) {
    color: var(--tone, var(--dpk-accent));
    fill: currentColor;
    font-family: var(--dpk-mono);
    font-size: 10px;
    font-weight: 650;
  }

  :where(.dpk-chart-legend) {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 12px;
    color: var(--dpk-ink-soft);
    font-size: 11px;
  }

  :where(.dpk-chart-key) {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    min-width: 0;
  }

  :where(.dpk-chart-key)::before {
    content: '';
    flex: none;
    width: 14px;
    height: 2px;
    border-radius: 1px;
    background: var(--tone, var(--dpk-blue));
  }

  :where(.dpk-chart-key[data-variant='area'])::before {
    height: 8px;
    border-radius: 3px;
    background: color-mix(in srgb, var(--tone, var(--dpk-blue)) 24%, transparent);
    box-shadow: inset 0 -2px 0 var(--tone, var(--dpk-blue));
  }

  :where(.dpk-chart-key[data-variant='dashed'])::before {
    height: 0;
    border-top: 1.5px dashed var(--tone, var(--dpk-ink-faint));
    background: none;
  }

  :where(.dpk-chart-key[data-variant='mark'])::before {
    width: 2px;
    height: 11px;
    background: var(--tone, var(--dpk-accent));
  }

  :where(.dpk-chart-empty) {
    color: var(--dpk-ink-faint);
    font-size: 12px;
  }
`;
