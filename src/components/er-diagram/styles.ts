import { css } from 'lit';

export const erStyles = css`
  .er-search {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .er-search .dpk-input {
    width: 150px;
    min-height: 26px;
    font-size: 11px;
  }

  .er-table {
    display: flex;
    flex-direction: column;
    border: 1px solid var(--dpk-rule-strong);
    border-radius: var(--dpk-radius-sm);
    background: var(--dpk-paper-raised);
    box-shadow: var(--dpk-bevel), var(--dpk-shadow-xs);
    overflow: hidden;
    cursor: default;
    transition:
      border-color 160ms var(--dpk-ease),
      box-shadow 160ms var(--dpk-ease),
      transform 160ms var(--dpk-ease);
  }

  .er-table:hover {
    box-shadow: var(--dpk-bevel), var(--dpk-shadow-sm);
    transform: translateY(-1px);
  }

  .er-table.is-added {
    border-color: color-mix(in srgb, var(--dpk-green) 55%, transparent);
  }

  .er-table.is-removed {
    border-color: color-mix(in srgb, var(--dpk-accent) 55%, transparent);
  }

  .er-table.is-changed {
    border-color: color-mix(in srgb, var(--dpk-amber) 55%, transparent);
  }

  .er-table.is-selected {
    border-color: var(--dpk-blue);
    box-shadow:
      var(--dpk-bevel),
      var(--dpk-shadow-sm),
      0 0 0 3px var(--dpk-blue-soft);
  }

  .er-table.is-related {
    border-color: color-mix(in srgb, var(--dpk-green) 50%, transparent);
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
    border-bottom: 1px solid var(--dpk-rule);
    border-radius: 0;
    background: var(--dpk-paper);
    text-align: left;
    cursor: pointer;
  }

  .er-head:hover {
    background: var(--dpk-paper-sunken);
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
    font-family: var(--dpk-mono);
    font-size: 10px;
  }

  .er-table.is-added .er-mark {
    background: var(--dpk-green-soft);
    color: var(--dpk-green);
  }

  .er-table.is-removed .er-mark {
    background: var(--dpk-accent-soft);
    color: var(--dpk-accent);
  }

  .er-table.is-changed .er-mark {
    background: var(--dpk-amber-soft);
    color: var(--dpk-amber);
  }

  .er-name {
    grid-area: name;
    font-family: var(--dpk-mono);
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
    color: var(--dpk-ink-faint);
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
    border-bottom: 1px solid var(--dpk-rule);
    font-size: 10.5px;
  }

  .er-field:last-child {
    border-bottom: 0;
  }

  .er-field.is-added {
    background: color-mix(in srgb, var(--dpk-green) 10%, transparent);
    box-shadow: inset 2px 0 0 var(--dpk-green);
  }

  .er-field.is-removed {
    background: color-mix(in srgb, var(--dpk-accent) 10%, transparent);
    box-shadow: inset 2px 0 0 var(--dpk-accent);
    text-decoration: line-through;
    color: var(--dpk-ink-faint);
  }

  .er-field.is-changed {
    background: color-mix(in srgb, var(--dpk-amber) 10%, transparent);
    box-shadow: inset 2px 0 0 var(--dpk-amber);
  }

  .er-field.is-match {
    box-shadow: inset 2px 0 0 var(--dpk-blue);
  }

  .er-field-mark {
    font-family: var(--dpk-mono);
    font-size: 10px;
    text-align: center;
  }

  .er-field.is-added .er-field-mark {
    color: var(--dpk-green);
  }

  .er-field.is-removed .er-field-mark {
    color: var(--dpk-accent);
  }

  .er-field.is-changed .er-field-mark {
    color: var(--dpk-amber);
  }

  .er-key {
    display: grid;
    place-items: center;
    border-radius: 3px;
    background: var(--dpk-paper-inset);
    font-family: var(--dpk-mono);
    font-size: 8.5px;
    color: var(--dpk-ink-faint);
  }

  .er-key[data-empty='true'] {
    background: transparent;
  }

  .er-field-name {
    font-family: var(--dpk-mono);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .er-field-type {
    font-size: 9.5px;
    color: var(--dpk-ink-faint);
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
    color: var(--dpk-accent);
    text-decoration: line-through;
  }

  .er-change ins {
    color: var(--dpk-green);
    text-decoration: none;
  }

  .er-edge .d-edge-path {
    stroke-width: 1.5;
  }

  .er-edge.is-added .d-edge-path {
    stroke: var(--dpk-green);
  }

  .er-edge.is-removed .d-edge-path {
    stroke: var(--dpk-accent);
    stroke-dasharray: 5 4;
  }

  .er-edge.is-selected .d-edge-path {
    stroke: var(--dpk-blue);
    stroke-width: 2.6;
  }

  .er-cardinality {
    font-family: var(--dpk-mono);
    font-size: 10px;
    fill: var(--dpk-ink-faint);
    paint-order: stroke;
    stroke: var(--dpk-paper-raised);
    stroke-width: 4px;
  }

  .er-cardinality.is-added {
    fill: var(--dpk-green);
  }

  .er-cardinality.is-removed {
    fill: var(--dpk-accent);
  }

  .diagram-legend .er-swatch-added {
    border-color: var(--dpk-green);
  }

  .diagram-legend .er-swatch-removed {
    border-color: var(--dpk-accent);
  }

  .diagram-legend .er-swatch-changed {
    border-color: var(--dpk-amber);
  }

  #er-neutral .diagram-arrow {
    fill: var(--dpk-rule-strong);
    stroke: var(--dpk-rule-strong);
  }

  #er-added .diagram-arrow {
    fill: var(--dpk-green);
    stroke: var(--dpk-green);
  }

  #er-removed .diagram-arrow {
    fill: var(--dpk-accent);
    stroke: var(--dpk-accent);
  }

  #er-selected .diagram-arrow {
    fill: var(--dpk-blue);
    stroke: var(--dpk-blue);
  }
`;
