import { css } from 'lit';

export const dependencyStyles = css`
  :host {
    --dep-neutral: var(--dpk-ink-faint);
    --dep-outgoing: var(--dpk-green);
    --dep-incoming: var(--dpk-violet);
    --dep-cycle: var(--dpk-amber);
    --dep-selected: var(--dpk-blue);
  }

  .dep-direction {
    display: flex;
    gap: 2px;
    padding: 3px;
    border: 1px solid var(--dpk-rule);
    border-radius: var(--dpk-radius-sm);
    background: var(--dpk-paper-sunken);
    box-shadow: inset 0 1px 2px var(--dpk-shade-1);
  }

  .dep-direction button {
    border: 0;
    border-radius: var(--dpk-radius-xs);
    padding: 4px 8px;
    background: transparent;
    color: var(--dpk-ink-soft);
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    transition:
      background 160ms var(--dpk-ease),
      color 160ms var(--dpk-ease),
      box-shadow 160ms var(--dpk-ease);
  }

  .dep-direction button[aria-pressed='true'] {
    background: var(--dpk-paper-raised);
    color: var(--dpk-ink);
    font-weight: 650;
    box-shadow: var(--dpk-bevel), var(--dpk-shadow-xs);
  }

  .dep-toggle {
    min-height: 26px;
    padding: 0 8px;
    font-size: 11px;
  }

  .dep-toggle[aria-pressed='true'] {
    border-color: color-mix(in srgb, var(--dpk-blue) 40%, transparent);
    background: var(--dpk-blue-soft);
    color: var(--dpk-blue);
  }

  .dep-module {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 10px 12px;
    border: 1px solid var(--dpk-ink-faint);
    border-radius: var(--dpk-radius-sm);
    background: var(--dpk-paper-raised);
    box-shadow: var(--dpk-bevel), var(--dpk-shadow-xs);
    color: var(--dpk-ink);
    text-align: left;
    overflow: hidden;
    transition:
      border-color 160ms var(--dpk-ease),
      box-shadow 160ms var(--dpk-ease),
      transform 160ms var(--dpk-ease);
  }

  .dep-module:hover {
    border-color: var(--dep-selected);
    box-shadow: var(--dpk-bevel), var(--dpk-shadow-sm);
    transform: translateY(-1px);
  }

  .dep-module.is-cyclic {
    border-color: var(--dep-cycle);
  }

  .dep-module.is-dependency {
    border-color: var(--dep-outgoing);
    background: linear-gradient(var(--dpk-green-soft), var(--dpk-green-soft)), var(--dpk-paper-raised);
  }

  .dep-module.is-dependent {
    border-color: var(--dep-incoming);
    background: linear-gradient(var(--dpk-violet-soft), var(--dpk-violet-soft)), var(--dpk-paper-raised);
  }

  .dep-module.is-selected {
    border-color: var(--dep-selected);
    background: linear-gradient(var(--dpk-blue-soft), var(--dpk-blue-soft)), var(--dpk-paper-raised);
    box-shadow:
      var(--dpk-bevel),
      var(--dpk-shadow-sm),
      0 0 0 3px color-mix(in srgb, var(--dep-selected) 28%, transparent);
  }

  .dep-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
    min-height: 17px;
  }

  .dep-layer {
    font-size: 11px;
    font-weight: 600;
    color: var(--dpk-ink-soft);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .dep-cycle-badge {
    flex-shrink: 0;
    padding: 1px 6px;
    border-radius: 999px;
    background: var(--dpk-amber-soft);
    color: color-mix(in srgb, var(--dep-cycle) 58%, var(--dpk-ink));
    font-size: 11px;
    font-weight: 650;
    line-height: 15px;
  }

  .dep-name {
    font-size: 13.5px;
    font-weight: 650;
    letter-spacing: -0.01em;
    line-height: 18px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .dep-path {
    font-family: var(--dpk-mono);
    font-size: 11px;
    line-height: 15px;
    color: var(--dpk-ink-soft);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .dep-edge {
    /* The shared edge paint (src/components/diagram/edge/styles.ts) colours the line, glyph and flow from this one property. */
    --d-edge-line: var(--dep-neutral);
  }

  .dep-edge.is-cycle {
    --d-edge-line: var(--dep-cycle);
  }

  .dep-edge.is-outgoing {
    --d-edge-line: var(--dep-outgoing);
  }

  .dep-edge.is-incoming {
    --d-edge-line: var(--dep-incoming);
  }

  .dep-edge.is-selected,
  .dep-edge:has(.d-edge-hit:focus-visible) {
    --d-edge-line: var(--dep-selected);
  }

  .dep-edge .d-edge-path {
    stroke: var(--d-edge-line);
    stroke-width: 1.5;
  }

  .dep-edge.is-cycle .d-edge-path {
    stroke-width: 2;
  }

  .dep-edge.is-related .d-edge-path {
    stroke-width: 2;
  }

  .dep-edge.is-selected .d-edge-path,
  .dep-edge:has(.d-edge-hit:focus-visible) .d-edge-path {
    stroke: var(--d-edge-line);
    stroke-width: 2.2;
  }

  /* The inline arrowhead takes the line's own colour and thickens with a highlighted line. */
  .dep-edge .d-edge-end {
    stroke-width: 1.3px;
  }

  .dep-edge.is-cycle .d-edge-end,
  .dep-edge.is-related .d-edge-end,
  .dep-edge.is-selected .d-edge-end,
  .dep-edge:has(.d-edge-hit:focus-visible) .d-edge-end {
    stroke-width: 1.6px;
  }

  .dep-junction {
    fill: var(--d-edge-line);
  }

  .diagram-legend .dep-swatch-direction {
    position: relative;
    border-color: var(--dep-neutral);
  }

  .diagram-legend .dep-swatch-direction::after {
    content: '';
    position: absolute;
    right: -1px;
    top: -5px;
    width: 6px;
    height: 8px;
    background: var(--dep-neutral);
    clip-path: polygon(0 0, 100% 50%, 0 100%);
  }

  .diagram-legend .dep-swatch-outgoing {
    border-color: var(--dep-outgoing);
  }

  .diagram-legend .dep-swatch-incoming {
    border-color: var(--dep-incoming);
  }

  .diagram-legend .dep-swatch-cycle {
    border-color: var(--dep-cycle);
  }
`;
