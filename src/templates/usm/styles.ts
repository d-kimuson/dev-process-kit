import { css } from 'lit';

/** Board chrome of `<dpk-template-usm>`: table, headers, rows, cells. Cards style themselves. */
export const usmStyles = css`
  :host {
    --dpk-usm-accent: var(--dpk-blue);
  }
  .map-scroll {
    /* A wide table must scroll inside itself and never widen the template shell. */
    min-width: 0;
    max-width: 100%;
    overflow-x: auto;
    padding-bottom: 12px;
  }
  .map {
    display: grid;
    gap: 0;
    min-width: max-content;
    border: 1px solid var(--dpk-rule);
    border-radius: var(--dpk-radius-lg);
    background: var(--dpk-paper-sunken);
    box-shadow: var(--dpk-shadow);
    overflow: hidden;
  }
  .map-row {
    display: grid;
    grid-template-columns: 140px repeat(var(--cols), minmax(180px, 240px));
  }
  .map-row + .map-row {
    border-top: 1px solid var(--dpk-rule);
  }
  .corner,
  .act-head,
  .col-head,
  .row-head,
  .cell {
    padding: 10px;
  }
  .corner {
    background: var(--dpk-paper-sunken);
    display: grid;
    gap: 3px;
    align-content: start;
  }

  /* Unit toggle above the table (group band vs one column per activity): a
     sunken track with the selected segment raised on top of it. */
  .view-tabs {
    display: inline-flex;
    justify-self: start;
    gap: 2px;
    padding: 3px;
    margin-bottom: 14px;
    border: 1px solid var(--dpk-rule);
    border-radius: 999px;
    background: var(--dpk-paper-sunken);
    box-shadow: inset 0 1px 3px var(--dpk-shade-1);
  }

  .tab {
    padding: 5px 14px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 550;
    text-decoration: none;
    color: var(--dpk-ink-soft);
    white-space: nowrap;
    transition:
      background 160ms var(--dpk-ease),
      color 160ms var(--dpk-ease),
      box-shadow 160ms var(--dpk-ease);
  }

  .tab:hover {
    color: var(--dpk-ink);
    background: var(--dpk-paper-inset);
  }

  .tab[data-current='true'] {
    background: var(--dpk-paper-raised);
    color: var(--dpk-ink);
    font-weight: 650;
    box-shadow: var(--dpk-bevel), var(--dpk-shadow-xs);
  }

  /* Activity band: raised above the working canvas and marked with a quiet
     accent edge so the grouping reads at a glance. */
  .act-head {
    position: relative;
    border-left: 1px solid var(--dpk-rule);
    background: var(--dpk-paper-raised);
    box-shadow:
      var(--dpk-bevel),
      inset 0 -1px 0 var(--dpk-rule-strong);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 4px;
    font-size: 13px;
    font-weight: 650;
    letter-spacing: -0.005em;
  }
  .act-head::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: color-mix(in srgb, var(--dpk-usm-accent) 55%, transparent);
  }
  .col-head {
    border-left: 1px solid var(--dpk-rule);
    background: var(--dpk-paper-sunken);
    transition: background 160ms var(--dpk-ease);
  }
  .col-head[data-current='true'] {
    background: color-mix(in srgb, var(--dpk-usm-accent) 7%, var(--dpk-paper-sunken));
    box-shadow: inset 0 2px 0 var(--dpk-usm-accent);
  }
  .col-head h4 {
    font-size: 13px;
    font-weight: 600;
    margin: 0;
  }

  .row-head {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  /* Milestone row label: a floating release chip in the sunken rail, not a
     flat table cell. The "add milestone" row reuses \`.row-head\` for its
     ghost button and stays a plain cell. */
  .row-head[data-milestone] {
    display: inline-flex;
    justify-self: start;
    align-self: center;
    margin: 6px 4px;
    padding: 6px 12px;
    border: 1px solid var(--dpk-rule);
    border-radius: 999px;
    background: var(--dpk-paper-raised);
    box-shadow: var(--dpk-bevel), var(--dpk-shadow-xs);
    color: var(--dpk-ink);
    font-size: 11.5px;
    font-weight: 650;
    letter-spacing: 0.01em;
    max-width: 100%;
    transition:
      background 160ms var(--dpk-ease),
      box-shadow 160ms var(--dpk-ease),
      border-color 160ms var(--dpk-ease);
  }

  .row-head[draggable='true'] {
    cursor: grab;
    -webkit-user-select: none;
    user-select: none;
  }

  .row-head[draggable='true'] dpk-component-inline-edit {
    -webkit-user-drag: none;
  }

  .row-head[draggable='true']:active {
    cursor: grabbing;
  }

  .row-grip {
    flex: 0 0 auto;
    display: inline-flex;
    color: var(--dpk-ink-faint);
  }

  .row-grip svg {
    display: block;
    width: 15px;
    height: 15px;
  }

  /* Row-level drag affordance: hover highlights the entire .map-row. */
  .map-row[data-draggable='true']:hover > .row-head {
    border-color: color-mix(in srgb, var(--dpk-blue) 45%, var(--dpk-rule));
    box-shadow: var(--dpk-bevel), var(--dpk-shadow-sm);
  }
  .map-row[data-draggable='true']:hover > .cell {
    background: var(--dpk-dots), color-mix(in srgb, var(--dpk-blue) 3%, var(--dpk-paper-sunken));
  }
  .map-row[data-draggable='true']:hover .row-grip {
    color: var(--dpk-blue);
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
    outline: 2px dashed var(--dpk-blue);
    outline-offset: -2px;
  }
  .map-row[data-row-drop='true'] > .row-head {
    border-color: var(--dpk-blue);
    background: var(--dpk-blue-soft);
  }
  .map-row[data-row-drop='true'] > .cell {
    background: var(--dpk-dots), color-mix(in srgb, var(--dpk-blue) 6%, var(--dpk-paper-sunken));
  }

  /* Cells are the working canvas: sunken, with a quiet dot lattice, so raised
     story cards read as things placed on the board. */
  .cell {
    border-left: 1px solid var(--dpk-rule);
    border-top: 1px solid var(--dpk-rule);
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-height: 100px;
    background: var(--dpk-dots), var(--dpk-paper-sunken);
    transition: background 160ms var(--dpk-ease);
  }
  .cell[data-drop='true'] {
    background: var(--dpk-dots), color-mix(in srgb, var(--dpk-blue) 8%, var(--dpk-paper-sunken));
    outline: 2px dashed var(--dpk-blue);
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
    transition:
      opacity 180ms var(--dpk-ease),
      background 160ms var(--dpk-ease),
      border-color 160ms var(--dpk-ease),
      color 160ms var(--dpk-ease);
    border: 1px dashed var(--dpk-rule-strong);
    border-radius: var(--dpk-radius-sm);
    background: transparent;
    color: var(--dpk-ink-faint);
    padding: 4px 8px;
    font-size: 11.5px;
  }
  .add-cell:hover {
    background: var(--dpk-blue-soft);
    border-color: var(--dpk-blue);
    color: var(--dpk-blue);
  }
  .cell:hover .add-cell {
    opacity: 1;
  }
  .empty {
    border: 1px dashed var(--dpk-rule-strong);
    border-radius: var(--dpk-radius-lg);
    padding: 28px 24px;
    background: var(--dpk-dots), var(--dpk-paper-sunken);
    max-width: 620px;
    display: grid;
    gap: 10px;
  }
  .count {
    font-family: var(--dpk-mono);
    font-variant-numeric: tabular-nums;
    font-size: 10px;
    color: var(--dpk-ink-faint);
  }

  /* Step picker shown after a cross-activity drop. */
  .move-dialog {
    min-width: 220px;
  }
`;
