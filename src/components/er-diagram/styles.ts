import { css } from 'lit';

export const erStyles = css`
  .er-search {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .er-search .af-input {
    width: 150px;
    min-height: 26px;
    font-size: 11px;
  }

  .er-table {
    display: flex;
    flex-direction: column;
    border: 1px solid var(--af-rule-strong);
    border-radius: var(--af-radius-sm);
    background: var(--af-paper-raised);
    box-shadow: var(--af-shadow-xs);
    overflow: hidden;
    cursor: default;
  }

  .er-table.is-added {
    border-color: color-mix(in srgb, var(--af-green) 55%, transparent);
  }

  .er-table.is-removed {
    border-color: color-mix(in srgb, var(--af-accent) 55%, transparent);
  }

  .er-table.is-changed {
    border-color: color-mix(in srgb, var(--af-amber) 55%, transparent);
  }

  .er-table.is-selected {
    border-color: var(--af-blue);
    box-shadow: 0 0 0 3px var(--af-blue-soft);
  }

  .er-table.is-related {
    border-color: color-mix(in srgb, var(--af-green) 50%, transparent);
  }

  .er-head {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    grid-template-areas:
      'mark name status'
      'mark label status';
    align-items: center;
    gap: 1px 8px;
    width: 100%;
    min-height: 42px;
    padding: 7px 11px;
    border: 0;
    border-bottom: 1px solid var(--af-rule);
    border-radius: 0;
    background: var(--af-paper);
    text-align: left;
    cursor: pointer;
  }

  .er-head:hover {
    background: var(--af-paper-sunken);
  }

  .er-table:has(> .diagram-comment-trigger) .er-head {
    padding-right: 46px;
  }

  .er-table > .diagram-comment-trigger {
    position: absolute;
    top: 8px;
    right: 8px;
  }

  .er-table:hover,
  .er-table:focus-within,
  .er-edge:hover,
  .er-edge:focus-within {
    opacity: 1;
  }

  .er-mark {
    grid-area: mark;
    display: grid;
    place-items: center;
    width: 16px;
    height: 16px;
    border-radius: 3px;
    font-family: var(--af-mono);
    font-size: 10px;
  }

  .er-table.is-added .er-mark {
    background: var(--af-green-soft);
    color: var(--af-green);
  }

  .er-table.is-removed .er-mark {
    background: var(--af-accent-soft);
    color: var(--af-accent);
  }

  .er-table.is-changed .er-mark {
    background: var(--af-amber-soft);
    color: var(--af-amber);
  }

  .er-name {
    grid-area: name;
    font-family: var(--af-mono);
    font-size: 12px;
    font-weight: 640;
    letter-spacing: -0.01em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .er-label {
    grid-area: label;
    font-size: 9.5px;
    color: var(--af-ink-faint);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .er-status {
    grid-area: status;
    font-size: 8.5px;
    text-align: right;
  }

  .er-fields {
    display: flex;
    flex-direction: column;
  }

  .er-field {
    display: grid;
    grid-template-columns: 14px 26px minmax(0, 1fr) auto;
    align-items: center;
    gap: 6px;
    padding: 0 10px;
    border-bottom: 1px solid var(--af-rule);
    font-size: 10.5px;
  }

  .er-field:last-child {
    border-bottom: 0;
  }

  .er-field.is-added {
    background: color-mix(in srgb, var(--af-green) 7%, transparent);
  }

  .er-field.is-removed {
    background: color-mix(in srgb, var(--af-accent) 7%, transparent);
    text-decoration: line-through;
    color: var(--af-ink-faint);
  }

  .er-field.is-changed {
    background: color-mix(in srgb, var(--af-amber) 7%, transparent);
  }

  .er-field.is-match {
    box-shadow: inset 2px 0 0 var(--af-blue);
  }

  .er-field-mark {
    font-family: var(--af-mono);
    font-size: 10px;
    text-align: center;
  }

  .er-field.is-added .er-field-mark {
    color: var(--af-green);
  }

  .er-field.is-removed .er-field-mark {
    color: var(--af-accent);
  }

  .er-field.is-changed .er-field-mark {
    color: var(--af-amber);
  }

  .er-key {
    display: grid;
    place-items: center;
    border-radius: 3px;
    background: var(--af-paper-inset);
    font-family: var(--af-mono);
    font-size: 8.5px;
    color: var(--af-ink-faint);
  }

  .er-key[data-empty='true'] {
    background: transparent;
  }

  .er-field-name {
    font-family: var(--af-mono);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .er-field-type {
    font-size: 9.5px;
    color: var(--af-ink-faint);
    white-space: nowrap;
  }

  .er-change {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    font-size: 9px;
    line-height: 1.6;
    white-space: nowrap;
    text-align: right;
  }

  .er-change del {
    color: var(--af-accent);
    text-decoration: line-through;
  }

  .er-change ins {
    color: var(--af-green);
    text-decoration: none;
  }

  .er-edge .d-edge-path {
    stroke-width: 1.5;
  }

  .er-edge.is-added .d-edge-path {
    stroke: var(--af-green);
  }

  .er-edge.is-removed .d-edge-path {
    stroke: var(--af-accent);
    stroke-dasharray: 5 4;
  }

  .er-edge.is-selected .d-edge-path {
    stroke: var(--af-blue);
    stroke-width: 2.6;
  }

  .er-cardinality {
    font-family: var(--af-mono);
    font-size: 10px;
    fill: var(--af-ink-faint);
    paint-order: stroke;
    stroke: var(--af-paper-raised);
    stroke-width: 4px;
  }

  .er-cardinality.is-added {
    fill: var(--af-green);
  }

  .er-cardinality.is-removed {
    fill: var(--af-accent);
  }

  .diagram-legend .er-swatch-added {
    border-color: var(--af-green);
  }

  .diagram-legend .er-swatch-removed {
    border-color: var(--af-accent);
  }

  .diagram-legend .er-swatch-changed {
    border-color: var(--af-amber);
  }

  #er-neutral .diagram-arrow {
    fill: var(--af-rule-strong);
    stroke: var(--af-rule-strong);
  }

  #er-added .diagram-arrow {
    fill: var(--af-green);
    stroke: var(--af-green);
  }

  #er-removed .diagram-arrow {
    fill: var(--af-accent);
    stroke: var(--af-accent);
  }

  #er-selected .diagram-arrow {
    fill: var(--af-blue);
    stroke: var(--af-blue);
  }
`;
