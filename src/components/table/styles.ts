import { css } from 'lit';

/** Chrome of `<dpk-table>`: toolbar, headers, rows, cells. */
export const tableStyles = css`
  :host {
    display: block;
    color: var(--dpk-ink);
    font-family: var(--dpk-body);
  }

  .head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 8px;
  }

  .heading {
    font-weight: 650;
  }

  .count {
    color: var(--dpk-ink-soft);
    font-family: var(--dpk-mono);
    font-size: 12px;
  }

  .toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    margin-bottom: 10px;
  }

  .filter {
    border: 1px solid var(--dpk-rule-strong);
    border-radius: var(--dpk-radius-sm);
    background: var(--dpk-paper-raised);
    color: var(--dpk-ink);
    font: inherit;
    font-size: 13px;
    padding: 5px 9px;
    min-width: 160px;
  }

  .group-by {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--dpk-ink-soft);
    font-size: 12px;
  }

  .add-row {
    margin-inline-start: auto;
    border: 1px dashed var(--dpk-rule-strong);
    border-radius: var(--dpk-radius-sm);
    background: transparent;
    color: var(--dpk-ink-soft);
    font: inherit;
    font-size: 13px;
    padding: 5px 10px;
    cursor: pointer;
  }

  .add-row:hover {
    color: var(--dpk-accent);
    border-color: var(--dpk-accent);
  }

  .scroll {
    overflow-x: auto;
    border: 1px solid var(--dpk-rule);
    border-radius: var(--dpk-radius);
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }

  thead th {
    position: sticky;
    top: 0;
    z-index: 1;
    background: var(--dpk-paper-sunken);
    text-align: left;
    font-weight: 600;
    white-space: nowrap;
    border-bottom: 1px solid var(--dpk-rule-strong);
  }

  th,
  td {
    padding: 7px 10px;
  }

  .handle-col,
  .actions-col {
    width: 1%;
  }

  .sort {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    font-weight: 600;
    padding: 0;
    cursor: pointer;
  }

  .sort-icon svg {
    width: 12px;
    height: 12px;
    display: block;
  }

  .group-head th {
    background: var(--dpk-paper-inset);
    color: var(--dpk-ink-soft);
    font-weight: 600;
    font-size: 12px;
  }

  tbody tr[data-row] {
    border-bottom: 1px solid var(--dpk-rule);
    cursor: pointer;
  }

  tbody tr[data-row]:hover {
    background: var(--dpk-paper-sunken);
  }

  tbody tr[data-row].is-selected {
    background: color-mix(in srgb, var(--dpk-blue-soft) 70%, transparent);
  }

  tbody tr[data-row].is-dragging {
    opacity: 0.4;
  }

  tbody tr[data-row][data-drop-before] {
    box-shadow: inset 0 2px 0 0 var(--dpk-accent);
  }

  tbody tr[data-row]:focus-visible {
    outline: none;
    box-shadow: var(--dpk-focus);
  }

  td.handle {
    cursor: grab;
    color: var(--dpk-ink-faint);
  }

  td.handle svg {
    width: 14px;
    height: 14px;
    display: block;
  }

  td.editing {
    padding: 3px 6px;
  }

  .cell-input {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid var(--dpk-accent);
    border-radius: var(--dpk-radius-xs);
    background: var(--dpk-paper-raised);
    color: var(--dpk-ink);
    font: inherit;
    font-size: 13px;
    padding: 4px 6px;
  }

  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .tag {
    border-radius: var(--dpk-radius-xs);
    background: var(--dpk-paper-inset);
    color: var(--dpk-ink-soft);
    font-size: 11px;
    padding: 2px 6px;
  }

  .status {
    display: inline-flex;
    align-items: center;
    border-radius: var(--dpk-radius-xs);
    font-size: 12px;
    font-weight: 600;
    padding: 2px 8px;
  }

  .status[data-tone='gray'] {
    background: var(--dpk-paper-inset);
    color: var(--dpk-ink-soft);
  }

  .status[data-tone='blue'] {
    background: var(--dpk-blue-soft);
    color: var(--dpk-blue-strong);
  }

  .status[data-tone='green'] {
    background: var(--dpk-green-soft);
    color: var(--dpk-green);
  }

  .status[data-tone='amber'] {
    background: var(--dpk-amber-soft);
    color: var(--dpk-amber);
  }

  .status[data-tone='violet'] {
    background: var(--dpk-violet-soft);
    color: var(--dpk-violet);
  }

  .status[data-tone='red'] {
    background: var(--dpk-danger-soft);
    color: var(--dpk-danger);
  }

  .person {
    color: var(--dpk-ink-soft);
  }

  .row-actions {
    display: flex;
    gap: 2px;
    white-space: nowrap;
  }

  .comment,
  .delete {
    display: inline-grid;
    place-items: center;
    width: 24px;
    height: 24px;
    padding: 0;
    border: 0;
    border-radius: var(--dpk-radius-sm);
    background: transparent;
    color: var(--dpk-ink-soft);
    opacity: 0;
    cursor: pointer;
  }

  tr:hover .comment,
  tr:hover .delete,
  tr:focus-within .comment,
  tr:focus-within .delete {
    opacity: 1;
  }

  .comment:hover {
    color: var(--dpk-blue);
  }

  .delete:hover {
    color: var(--dpk-danger);
  }

  .comment:focus-visible,
  .delete:focus-visible {
    outline: none;
    box-shadow: var(--dpk-focus);
  }

  .comment svg,
  .delete svg {
    width: 14px;
    height: 14px;
  }

  .error,
  .empty {
    color: var(--dpk-ink-soft);
    font-size: 13px;
  }

  .error {
    color: var(--dpk-danger);
  }
`;
