import { css } from 'lit';

/** Board chrome of `<artifact-usm>`: table, headers, rows, cells. Cards style themselves. */
export const usmStyles = css`
  :host {
    --af-usm-accent: var(--af-blue);
  }
  .map-scroll {
    /* A wide table must scroll inside itself and never widen the artifact shell. */
    min-width: 0;
    max-width: 100%;
    overflow-x: auto;
    padding-bottom: 12px;
  }
  .map {
    display: grid;
    gap: 0;
    min-width: max-content;
    border: 1px solid var(--af-rule);
    border-radius: var(--af-radius-lg);
    background: var(--af-paper-raised);
    box-shadow: var(--af-shadow);
    overflow: hidden;
  }
  .map-row {
    display: grid;
    grid-template-columns: 140px repeat(var(--cols), minmax(180px, 240px));
  }
  .map-row + .map-row {
    border-top: 1px solid var(--af-rule-strong);
  }
  .corner,
  .act-head,
  .col-head,
  .row-head,
  .cell {
    padding: 10px;
  }
  .corner {
    background: linear-gradient(135deg, var(--af-paper-sunken), var(--af-paper-inset));
    display: grid;
    gap: 2px;
    align-content: start;
  }

  /* Unit toggle above the table (group band vs one column per activity). */
  .view-tabs {
    display: inline-flex;
    justify-self: start;
    gap: 2px;
    padding: 3px;
    margin-bottom: 12px;
    border: 1px solid var(--af-rule);
    border-radius: 999px;
    background: var(--af-paper-sunken);
    box-shadow: inset 0 1px 2px rgba(20, 28, 44, 0.04);
  }

  .tab {
    padding: 4px 14px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 500;
    text-decoration: none;
    color: var(--af-ink-soft);
    white-space: nowrap;
    transition:
      background 120ms ease,
      color 120ms ease;
  }

  .tab:hover {
    color: var(--af-ink);
    background: var(--af-paper-raised);
  }

  .tab[data-current='true'] {
    background: var(--af-paper-raised);
    color: var(--af-ink);
    font-weight: 600;
    box-shadow: var(--af-shadow-xs);
  }
  .act-head {
    border-left: 1px solid var(--af-rule);
    background: linear-gradient(180deg, var(--af-paper-sunken), var(--af-paper-inset));
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 4px;
    font-size: 13px;
    font-weight: 600;
  }
  .col-head {
    border-left: 1px solid var(--af-rule);
    background: var(--af-paper-sunken);
    transition: background 150ms ease;
  }
  .col-head[data-current='true'] {
    background: linear-gradient(180deg, rgba(51, 102, 204, 0.06), rgba(51, 102, 204, 0.03));
    box-shadow: inset 0 2px 0 var(--af-blue);
  }
  .col-head h4 {
    font-size: 13px;
    margin: 0;
  }
  .row-head {
    display: flex;
    align-items: center;
    gap: 6px;
    background: var(--af-paper-sunken);
    font-size: 12px;
    font-weight: 600;
    transition: background 150ms ease;
  }

  .row-head[draggable='true'] {
    cursor: grab;
    -webkit-user-select: none;
    user-select: none;
  }

  .row-head[draggable='true'] artifact-inline-edit {
    -webkit-user-drag: none;
  }

  .row-head[draggable='true']:active {
    cursor: grabbing;
  }

  .row-grip {
    flex: 0 0 auto;
    display: inline-flex;
    color: var(--af-ink-faint);
  }

  .row-grip svg {
    display: block;
    width: 15px;
    height: 15px;
  }

  /* Row-level drag affordance: hover highlights the entire .map-row. */
  .map-row[data-draggable='true']:hover > .row-head {
    background: linear-gradient(90deg, var(--af-blue-soft), var(--af-paper-sunken));
  }
  .map-row[data-draggable='true']:hover > .cell {
    background: linear-gradient(90deg, rgba(51, 102, 204, 0.03), var(--af-paper-raised));
  }
  .map-row[data-draggable='true']:hover .row-grip {
    color: var(--af-blue);
  }
  .map-row[data-draggable='true'] {
    cursor: grab;
  }
  .map-row[data-draggable='true']:active {
    cursor: grabbing;
  }

  /*
   * Dragging state: entire row fades. Never disable pointer events on the
   * source here: Lit applies this state in the microtask right after
   * \`dragstart\`, and Blink then re-hit-tests the pointer and aborts the drag
   * when the source is no longer under it.
   */
  .map-row[data-row-dragging='true'] {
    opacity: 0.45;
  }

  /* Drop target: entire row highlights. */
  .map-row[data-row-drop='true'] {
    outline: 2px dashed var(--af-blue);
    outline-offset: -2px;
  }
  .map-row[data-row-drop='true'] > .row-head {
    background: var(--af-blue-soft);
  }
  .map-row[data-row-drop='true'] > .cell {
    background: linear-gradient(135deg, var(--af-blue-soft), rgba(51, 102, 204, 0.04));
  }
  .cell {
    border-left: 1px solid var(--af-rule);
    border-top: 1px solid var(--af-rule);
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-height: 100px;
    background: var(--af-paper-raised);
    transition: background 150ms ease;
  }
  .cell[data-drop='true'] {
    background: linear-gradient(135deg, var(--af-blue-soft), rgba(51, 102, 204, 0.04));
    outline: 2px dashed var(--af-blue);
    outline-offset: -2px;
  }
  .card-list {
    display: grid;
    gap: 8px;
    align-content: start;
    flex: 1 1 auto;
  }
  .add-cell {
    margin-top: auto;
    opacity: 0;
    transition: opacity 180ms ease;
    border: 1px dashed var(--af-rule-strong);
    border-radius: var(--af-radius-sm);
    background: transparent;
    color: var(--af-ink-faint);
    padding: 4px 8px;
    font-size: 11.5px;
  }
  .add-cell:hover {
    background: var(--af-blue-soft);
    border-color: var(--af-blue);
    color: var(--af-blue);
  }
  .cell:hover .add-cell {
    opacity: 1;
  }
  .empty {
    border: 1px dashed var(--af-rule-strong);
    border-radius: var(--af-radius-lg);
    padding: 28px 24px;
    background: var(--af-paper-raised);
    max-width: 620px;
    display: grid;
    gap: 10px;
  }
  .count {
    font-family: var(--af-mono);
    font-variant-numeric: tabular-nums;
    font-size: 10px;
    color: var(--af-ink-faint);
  }

  /* Step picker shown after a cross-activity drop. */
  .move-dialog {
    min-width: 220px;
  }
`;
