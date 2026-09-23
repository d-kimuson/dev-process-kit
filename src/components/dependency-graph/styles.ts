import { css } from 'lit';

export const dependencyStyles = css`
  .dep-direction {
    display: flex;
    gap: 1px;
    padding: 2px;
    border: 1px solid var(--af-rule-strong);
    border-radius: var(--af-radius-xs);
  }

  .dep-direction button {
    border: 0;
    border-radius: 3px;
    padding: 3px 7px;
    background: transparent;
    color: var(--af-ink-faint);
    font-size: 9.5px;
    cursor: pointer;
  }

  .dep-direction button[aria-pressed='true'] {
    background: var(--af-blue-soft);
    color: var(--af-blue);
    font-weight: 650;
  }

  .dep-toggle {
    min-height: 26px;
    padding: 0 8px;
    font-size: 10.5px;
  }

  .dep-toggle[aria-pressed='true'] {
    border-color: color-mix(in srgb, var(--af-blue) 40%, transparent);
    background: var(--af-blue-soft);
    color: var(--af-blue);
  }

  .dep-module {
    display: flex;
    flex-direction: column;
    gap: 5px;
    padding: 11px 12px;
    border: 1px solid var(--af-rule-strong);
    border-radius: var(--af-radius-sm);
    background: var(--af-paper-raised);
    box-shadow: var(--af-shadow-xs);
    text-align: left;
    overflow: hidden;
  }

  .dep-module:hover {
    border-color: var(--af-blue);
  }

  .dep-module.is-cyclic:not(.is-selected) {
    border-color: color-mix(in srgb, var(--af-amber) 55%, transparent);
  }

  .dep-module.is-selected {
    border-color: var(--af-blue);
    background: var(--af-blue-soft);
    box-shadow: 0 0 0 3px var(--af-blue-soft);
  }

  .dep-module.is-related {
    border-color: color-mix(in srgb, var(--af-green) 55%, transparent);
    background: var(--af-green-soft);
  }

  .dep-module.is-dependency {
    border-color: color-mix(in srgb, #6e9b61 60%, transparent);
    background: color-mix(in srgb, #6e9b61 8%, transparent);
  }

  .dep-module.is-dependent {
    border-color: color-mix(in srgb, #729aaa 60%, transparent);
    background: color-mix(in srgb, #729aaa 8%, transparent);
  }

  .dep-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
    min-height: 14px;
  }

  .dep-layer {
    font-size: 9px;
    color: var(--af-ink-faint);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .dep-cycle-badge {
    flex-shrink: 0;
    padding: 1px 4px;
    border-radius: 3px;
    background: var(--af-amber-soft);
    color: var(--af-amber);
    font-size: 8.5px;
  }

  .dep-name {
    font-size: 13px;
    font-weight: 640;
    letter-spacing: -0.01em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .dep-path {
    font-family: var(--af-mono);
    font-size: 9px;
    color: var(--af-ink-faint);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .dep-edge .d-edge-path {
    stroke: var(--af-rule-strong);
    stroke-width: 1.4;
  }

  .dep-edge.is-related .d-edge-path {
    stroke: var(--af-green);
    stroke-width: 2;
  }

  .dep-edge.is-selected .d-edge-path {
    stroke: var(--af-blue);
    stroke-width: 2.6;
  }

  .dep-edge:focus-visible .d-edge-path {
    stroke: var(--af-blue);
  }

  .diagram-legend .dep-swatch-outgoing {
    border-color: #6e9b61;
  }

  .diagram-legend .dep-swatch-incoming {
    border-color: #729aaa;
  }

  .diagram-legend .dep-swatch-cycle {
    border-color: var(--af-amber);
  }

  #dep-neutral .diagram-arrow {
    fill: var(--af-rule-strong);
    stroke: var(--af-rule-strong);
  }

  #dep-outgoing .diagram-arrow {
    fill: #6e9b61;
    stroke: #6e9b61;
  }

  #dep-incoming .diagram-arrow {
    fill: #729aaa;
    stroke: #729aaa;
  }

  #dep-cycle .diagram-arrow {
    fill: var(--af-amber);
    stroke: var(--af-amber);
  }

  #dep-selected .diagram-arrow {
    fill: var(--af-blue);
    stroke: var(--af-blue);
  }
`;
