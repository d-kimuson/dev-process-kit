import { css } from 'lit';

export const dependencyStyles = css`
  .dep-direction {
    display: flex;
    gap: 1px;
    padding: 2px;
    border: 1px solid var(--dpk-rule-strong);
    border-radius: var(--dpk-radius-xs);
  }

  .dep-direction button {
    border: 0;
    border-radius: 3px;
    padding: 3px 7px;
    background: transparent;
    color: var(--dpk-ink-faint);
    font-size: 9.5px;
    cursor: pointer;
  }

  .dep-direction button[aria-pressed='true'] {
    background: var(--dpk-blue-soft);
    color: var(--dpk-blue);
    font-weight: 650;
  }

  .dep-toggle {
    min-height: 26px;
    padding: 0 8px;
    font-size: 10.5px;
  }

  .dep-toggle[aria-pressed='true'] {
    border-color: color-mix(in srgb, var(--dpk-blue) 40%, transparent);
    background: var(--dpk-blue-soft);
    color: var(--dpk-blue);
  }

  .dep-module {
    display: flex;
    flex-direction: column;
    gap: 5px;
    padding: 11px 12px;
    border: 1px solid var(--dpk-rule-strong);
    border-radius: var(--dpk-radius-sm);
    background: var(--dpk-paper-raised);
    box-shadow: var(--dpk-shadow-xs);
    text-align: left;
    overflow: hidden;
  }

  .dep-module:hover {
    border-color: var(--dpk-blue);
  }

  .dep-module.is-cyclic:not(.is-selected) {
    border-color: color-mix(in srgb, var(--dpk-amber) 55%, transparent);
  }

  .dep-module.is-selected {
    border-color: var(--dpk-blue);
    background: var(--dpk-blue-soft);
    box-shadow: 0 0 0 3px var(--dpk-blue-soft);
  }

  .dep-module.is-related {
    border-color: color-mix(in srgb, var(--dpk-green) 55%, transparent);
    background: var(--dpk-green-soft);
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
    color: var(--dpk-ink-faint);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .dep-cycle-badge {
    flex-shrink: 0;
    padding: 1px 4px;
    border-radius: 3px;
    background: var(--dpk-amber-soft);
    color: var(--dpk-amber);
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
    font-family: var(--dpk-mono);
    font-size: 9px;
    color: var(--dpk-ink-faint);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .dep-edge .d-edge-path {
    stroke: var(--dpk-rule-strong);
    stroke-width: 1.4;
  }

  .dep-edge.is-related .d-edge-path {
    stroke: var(--dpk-green);
    stroke-width: 2;
  }

  .dep-edge.is-selected .d-edge-path {
    stroke: var(--dpk-blue);
    stroke-width: 2.6;
  }

  .dep-edge:focus-visible .d-edge-path {
    stroke: var(--dpk-blue);
  }

  .diagram-legend .dep-swatch-outgoing {
    border-color: #6e9b61;
  }

  .diagram-legend .dep-swatch-incoming {
    border-color: #729aaa;
  }

  .diagram-legend .dep-swatch-cycle {
    border-color: var(--dpk-amber);
  }

  #dep-neutral .diagram-arrow {
    fill: var(--dpk-rule-strong);
    stroke: var(--dpk-rule-strong);
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
    fill: var(--dpk-amber);
    stroke: var(--dpk-amber);
  }

  #dep-selected .diagram-arrow {
    fill: var(--dpk-blue);
    stroke: var(--dpk-blue);
  }
`;
