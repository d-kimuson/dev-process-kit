import { css } from 'lit';

/** Board chrome of `<dpk-template-usm>`: table, headers, rows, cells. Cards style themselves. */
export const usmStyles = css`
  :host {
    --dpk-usm-accent: var(--dpk-blue);
  }
  /*
   * A wide table must scroll inside itself and never widen the template shell.
   * It scrolls both ways so the backbone can stick to its top and the
   * milestone column to its left: a box that scrolls only sideways still
   * becomes the sticky ancestor, and its top would never move. Capped near the
   * viewport height, it fits under the tab bar once the page brings it up.
   */
  .map-scroll {
    min-width: 0;
    max-width: 100%;
    max-height: max(320px, calc(100dvh - 170px));
    overflow: auto;
    overscroll-behavior-x: contain;
    border: 1px solid var(--dpk-rule);
    border-radius: var(--dpk-radius-lg);
    background: var(--dpk-paper-sunken);
    box-shadow: var(--dpk-shadow);
  }
  .map {
    display: grid;
    gap: 0;
    min-width: max-content;
  }
  .map-row {
    display: grid;
    grid-template-columns: 140px repeat(var(--cols), minmax(180px, 240px));
  }
  .map-row + .map-row {
    border-top: 1px solid var(--dpk-rule);
  }

  /* The backbone (activities and steps) stays at the top while the rows scroll. */
  .map-head {
    position: sticky;
    top: 0;
    z-index: 3;
    border-bottom: 1px solid var(--dpk-rule-strong);
    box-shadow: 0 8px 14px -12px var(--dpk-shade-3);
  }

  /* The leading column (axis corners and milestone labels) stays at the left
     while the steps scroll sideways; it is opaque so cards pass under it. */
  .corner:first-child,
  .row-lead {
    position: sticky;
    left: 0;
    z-index: 2;
    box-shadow: 1px 0 0 var(--dpk-rule);
  }
  .row-lead {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
    gap: 2px;
    min-width: 0;
    padding: 8px 6px 8px 4px;
    background: var(--dpk-paper-sunken);
  }
  /* Row names and their meta line share one column: past the grip (15px), its
     gap (6px) and the inline edit's own padding (4px). */
  .row-lead {
    --usm-row-indent: 25px;
  }
  .row-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 2px 8px;
    padding-left: var(--usm-row-indent);
    font-size: 10.5px;
    color: var(--dpk-ink-faint);
  }
  .row-timeframe {
    color: var(--dpk-ink-soft);
    font-weight: 600;
  }
  .row-count {
    font-family: var(--dpk-mono);
    font-variant-numeric: tabular-nums;
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

  /* Above the content: the page tabs (map / milestones) and, on the map, the
     unit toggle (group band vs one column per activity). */
  /* The grid's status filter: one toggle per status, which also reads as the
     legend of the card colors. */
  .map-toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    margin: 16px 0 12px;
  }
  .filter-label {
    margin-right: 4px;
    color: var(--dpk-ink-faint);
    font-size: 11px;
    font-weight: 650;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  .filter-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 3px 9px 3px 7px;
    border: 1px solid var(--dpk-rule-strong);
    border-radius: 999px;
    background: var(--dpk-paper-raised);
    box-shadow: var(--dpk-bevel), var(--dpk-shadow-xs);
    color: var(--dpk-ink);
    font-size: 12px;
    font-weight: 600;
    text-decoration: none;
    transition:
      background 140ms var(--dpk-ease),
      border-color 140ms var(--dpk-ease);
  }
  .filter-chip:hover {
    border-color: color-mix(in srgb, var(--usm-tone) 60%, var(--dpk-rule-strong));
  }
  .filter-chip:focus-visible {
    outline: none;
    box-shadow: var(--dpk-focus);
  }
  .filter-chip[aria-checked='true'] {
    border-color: var(--usm-tone);
    background: color-mix(in srgb, var(--usm-tone) 14%, var(--dpk-paper-raised));
    box-shadow: inset 0 0 0 1px var(--usm-tone);
  }
  .filter-count {
    line-height: 1;
    color: var(--dpk-ink-faint);
    font-family: var(--dpk-mono);
    font-size: 10.5px;
    font-variant-numeric: tabular-nums;
  }
  .filter-clear {
    margin-left: 4px;
    color: var(--dpk-blue);
    font-size: 12px;
    font-weight: 600;
    text-decoration: none;
  }
  .filter-clear:hover {
    text-decoration: underline;
  }

  .board-bar {
    border-bottom: 1px solid var(--dpk-rule);
    /* Stays on top while a long milestone list scrolls under it. */
    position: sticky;
    top: 0;
    z-index: 5;
    margin: -24px -24px 0;
    padding: 12px 24px;
    background: var(--dpk-glass);
    backdrop-filter: saturate(1.6) blur(14px);
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px 14px;
    min-width: 0;
  }

  /* The two pages: an underlined tab strip, heavier than the view toggle. */
  .page-tabs {
    display: inline-flex;
    gap: 4px;
    margin-right: auto;
  }
  .page-tabs [role='tab'] {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 7px 12px;
    border-radius: var(--dpk-radius-sm);
    color: var(--dpk-ink-soft);
    font-size: 13.5px;
    font-weight: 600;
    letter-spacing: -0.005em;
    text-decoration: none;
    white-space: nowrap;
    transition:
      color 160ms var(--dpk-ease),
      background 160ms var(--dpk-ease);
  }
  .page-tabs [role='tab']:hover {
    color: var(--dpk-ink);
    background: var(--dpk-paper-inset);
  }
  .page-tabs [role='tab']:focus-visible {
    outline: none;
    box-shadow: var(--dpk-focus);
  }
  .page-tabs [role='tab'][aria-selected='true'] {
    color: var(--dpk-ink);
    font-weight: 700;
  }
  .page-tabs [role='tab'][aria-selected='true']::after {
    content: '';
    position: absolute;
    left: 12px;
    right: 12px;
    bottom: -13px;
    height: 2px;
    border-radius: 2px;
    background: var(--dpk-usm-accent);
  }
  .page-tab-count {
    min-width: 18px;
    padding: 0 6px;
    border-radius: 999px;
    background: var(--dpk-rule);
    color: var(--dpk-ink-soft);
    font-family: var(--dpk-mono);
    font-size: 10.5px;
    font-weight: 650;
    font-variant-numeric: tabular-nums;
    line-height: 17px;
    text-align: center;
  }
  [role='tab'][aria-selected='true'] .page-tab-count {
    background: var(--dpk-blue-soft);
    color: var(--dpk-blue);
  }

  /* A sunken track with the selected segment raised on top of it. */
  .segmented {
    display: inline-flex;
    gap: 2px;
    padding: 3px;
    max-width: 100%;
    overflow-x: auto;
    scrollbar-width: none;
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

  /* Activity band: raised above the working canvas. A head spans its steps,
     so its contents stay in view beside the sticky column while the map
     scrolls sideways. */
  .act-head {
    position: relative;
    display: grid;
    align-content: start;
    gap: 7px;
    border-left: 1px solid var(--dpk-rule);
    background: var(--dpk-paper-raised);
    box-shadow:
      var(--dpk-bevel),
      inset 0 -1px 0 var(--dpk-rule-strong);
    font-size: 13px;
    font-weight: 650;
    letter-spacing: -0.005em;
  }
  .act-title,
  .act-meta,
  .act-steps {
    position: sticky;
    left: 150px;
    width: min(100%, 340px);
    min-width: 0;
  }
  .act-title {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .act-title > dpk-component-inline-edit {
    flex: 1 1 auto;
    min-width: 0;
  }
  .act-meta {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .act-meta .status-bar {
    flex: 1 1 auto;
  }
  /* Whose experience the activity is: a label, editable in place. */
  .act-actor {
    flex: none;
    max-width: 60%;
    padding: 0 4px;
    border-radius: 999px;
    background: var(--dpk-blue-soft);
    color: var(--dpk-blue);
    font-size: 11px;
    font-weight: 650;
    line-height: 20px;
  }
  .act-actor[data-empty='true'] {
    background: transparent;
    opacity: 0;
    transition: opacity 150ms ease;
  }
  .act-head:hover .act-actor[data-empty='true'],
  .act-actor[data-empty='true']:focus-within {
    opacity: 1;
  }
  /* The group view gives the steps no columns; the head lists them instead. */
  .act-steps {
    display: grid;
    gap: 3px;
    margin: 0;
    padding: 0 0 0 18px;
    color: var(--dpk-ink-soft);
    font-size: 11.5px;
    font-weight: 500;
    line-height: 1.45;
  }
  .act-steps li::marker {
    color: var(--dpk-ink-faint);
    font-family: var(--dpk-mono);
    font-size: 10px;
  }
  .act-head .count,
  .col-head .count {
    flex: 0 0 auto;
    padding: 0 6px;
    border-radius: 999px;
    background: var(--dpk-rule);
    line-height: 16px;
  }
  .col-head {
    display: flex;
    align-items: center;
    gap: 6px;
    border-left: 1px solid var(--dpk-rule);
    background: var(--dpk-paper-sunken);
    transition: background 160ms var(--dpk-ease);
  }
  .col-head h4 {
    flex: 1 1 auto;
    min-width: 0;
  }
  .col-head[data-current='true'] {
    background: color-mix(in srgb, var(--dpk-usm-accent) 8%, var(--dpk-paper-sunken));
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

  /* Milestone row label: plain text with a grip, not a chip. The "add
     milestone" row reuses \`.row-head\` for its ghost button. */
  .row-head[data-milestone] {
    align-self: stretch;
    margin: 0;
    padding: 0 6px 0 0;
    color: var(--dpk-ink);
    font-size: 12.5px;
    font-weight: 650;
    max-width: 100%;
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

  /* Row-level drag affordance: only the grip answers the hover. */
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

  /* Unassigned is a holding area, not a release: its label is quieter. */
  .map-row[data-unassigned='true'] .row-head {
    padding-left: var(--usm-row-indent);
    color: var(--dpk-ink-soft);
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
    outline: 2px dashed var(--dpk-blue);
    outline-offset: -2px;
  }
  .card-list {
    display: grid;
    gap: 10px;
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

  /* ------------------------------------------------------ milestones tab */

  /* The release slices as a timeline, like the experience section of a
     portfolio: when on the left, one node per slice on a single rail, what
     and how big on the right. Nothing is boxed; the rail carries the order. */
  .ms-overview {
    --ms-node: 30px;
    --ms-when: 132px;
    --ms-gap: 44px;
    display: grid;
    gap: 28px;
    max-width: 920px;
    padding: 28px 0 40px;
  }
  .ms-timeline {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .ms-entry,
  .ms-add {
    display: grid;
    grid-template-columns: var(--ms-when) var(--ms-node) minmax(0, 1fr);
    grid-template-areas: 'when rail body';
    column-gap: 24px;
  }
  .ms-entry {
    padding-bottom: var(--ms-gap);
  }
  .ms-when {
    grid-area: when;
    display: flex;
    justify-content: flex-end;
    padding-top: 5px;
  }
  .ms-timeframe {
    color: var(--dpk-ink);
    font-size: 13px;
    font-weight: 650;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.01em;
    text-align: right;
  }
  .ms-timeframe[data-empty='true'] {
    color: var(--dpk-ink-faint);
    font-weight: 500;
  }

  /* The rail runs through every entry's padding, so the nodes read as one line;
     it starts at the first node and fades out into the add node. */
  .ms-rail {
    grid-area: rail;
    position: relative;
    display: flex;
    justify-content: center;
  }
  .ms-rail::before {
    content: '';
    position: absolute;
    top: 0;
    bottom: calc(-1 * var(--ms-gap));
    left: calc(50% - 1px);
    width: 2px;
    border-radius: 1px;
    background: var(--dpk-rule-strong);
  }
  .ms-entry:first-child .ms-rail::before {
    top: calc(var(--ms-node) / 2);
  }
  .ms-add .ms-rail::before {
    bottom: auto;
    height: calc(var(--ms-node) / 2);
    background: repeating-linear-gradient(to bottom, var(--dpk-rule-strong) 0 3px, transparent 3px 7px);
  }
  .ms-node {
    position: relative;
    display: grid;
    place-items: center;
    width: var(--ms-node);
    height: var(--ms-node);
    box-sizing: border-box;
    border: 1px solid var(--dpk-rule-strong);
    border-radius: 50%;
    background: var(--dpk-paper-raised);
    color: var(--dpk-ink);
    font-family: var(--dpk-mono);
    font-size: 12px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    /* A ring of page color cuts the rail around the node. */
    box-shadow:
      0 0 0 5px var(--dpk-paper),
      var(--dpk-bevel),
      var(--dpk-shadow-xs);
    transition:
      border-color 160ms var(--dpk-ease),
      color 160ms var(--dpk-ease);
  }
  .ms-entry:hover .ms-node,
  .ms-entry:focus-within .ms-node {
    border-color: var(--dpk-blue);
    color: var(--dpk-blue-strong);
  }
  .ms-node--add {
    border-style: dashed;
    background: var(--dpk-paper);
    box-shadow: 0 0 0 5px var(--dpk-paper);
  }
  .ms-node--add::before,
  .ms-node--add::after {
    content: '';
    position: absolute;
    left: 50%;
    top: 50%;
    width: 10px;
    height: 1.5px;
    border-radius: 1px;
    background: var(--dpk-ink-faint);
    transform: translate(-50%, -50%);
  }
  .ms-node--add::after {
    transform: translate(-50%, -50%) rotate(90deg);
  }
  .ms-add .ms-body {
    display: flex;
    align-items: center;
    min-height: var(--ms-node);
  }
  /* The label lines up with the names above; the button's padding hangs out. */
  .ms-add .dpk-btn {
    margin-left: -12px;
  }

  .ms-body {
    grid-area: body;
    display: grid;
    gap: 10px;
    min-width: 0;
    justify-items: start;
  }
  .ms-name {
    justify-self: stretch;
    min-width: 0;
    margin: 0;
    padding-top: 1px;
    font-size: 19px;
    font-weight: 700;
    line-height: 1.4;
    letter-spacing: -0.015em;
  }
  /* The field pads its text by 4px; pull it out by as much so the name lines
     up with the description and keeps its place when editing starts. */
  .ms-name dpk-component-inline-edit {
    display: block;
    margin: 0 -4px;
  }
  .ms-description {
    margin: 0;
    max-width: 64ch;
    color: var(--dpk-ink-soft);
    font-size: 14px;
    line-height: 1.75;
    white-space: pre-wrap;
  }
  .ms-description[data-empty='true'] {
    color: var(--dpk-ink-faint);
    font-size: 13px;
  }
  .ms-facts {
    display: flex;
    flex-wrap: wrap;
    gap: 10px 36px;
    margin: 6px 0 0;
  }
  .ms-facts dt {
    margin-bottom: 3px;
    color: var(--dpk-ink-faint);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.02em;
  }
  .ms-facts dd {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 0;
    color: var(--dpk-ink-faint);
    font-size: 12px;
  }
  .ms-facts strong {
    color: var(--dpk-ink);
    font-size: 15px;
    font-weight: 650;
    font-variant-numeric: tabular-nums;
  }
  .ms-meter {
    display: block;
    width: 72px;
    height: 4px;
    border-radius: 2px;
    background: var(--dpk-paper-inset);
    overflow: hidden;
  }
  .ms-meter > span {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: var(--dpk-blue);
  }

  /* Where the slice's stories sit across the backbone, in activity tones. */
  .ms-breakdown {
    display: grid;
    gap: 10px;
    width: min(100%, 460px);
    margin-top: 4px;
  }
  .ms-breakdown .status-bar {
    height: 8px;
  }
  .ms-legend {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 16px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .ms-legend li {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--dpk-ink-soft);
    font-size: 12px;
  }
  .ms-breakdown-count {
    color: var(--dpk-ink-faint);
    font-family: var(--dpk-mono);
    font-size: 11px;
    font-variant-numeric: tabular-nums;
  }

  /* Narrow: the date moves above the name, the rail stays on the left. */
  @media (max-width: 640px) {
    .ms-overview {
      --ms-node: 26px;
    }
    .ms-entry,
    .ms-add {
      grid-template-columns: var(--ms-node) minmax(0, 1fr);
      grid-template-areas:
        'rail when'
        'rail body';
      column-gap: 16px;
    }
    .ms-add {
      grid-template-areas: 'rail body';
    }
    .ms-add .ms-when {
      display: none;
    }
    .ms-when {
      justify-content: flex-start;
      padding: 4px 0 2px;
    }
    .ms-timeframe {
      text-align: left;
    }
  }

  /* ------------------------------------------------------- statuses tab */

  /* The statuses in order, one row each: color, name, how many stories stand
     there, the palette to recolor it, and the order / delete tools. */
  .st-overview {
    display: grid;
    gap: 20px;
    max-width: 1040px;
    padding: 28px 0 40px;
  }
  .st-list {
    display: grid;
    margin: 0;
    padding: 0;
    list-style: none;
    border: 1px solid var(--dpk-rule);
    border-radius: var(--dpk-radius-lg);
    background: var(--dpk-paper-raised);
    box-shadow: var(--dpk-shadow-xs);
  }
  .st-row {
    display: grid;
    /* Fixed tool columns keep the unset row, which has no tools, in line. */
    grid-template-columns: 16px minmax(120px, 1fr) minmax(140px, 200px) 272px 84px;
    align-items: center;
    gap: 14px;
    padding: 12px 16px;
  }
  .st-row + .st-row {
    border-top: 1px solid var(--dpk-rule);
  }
  .st-row--unset {
    background: var(--dpk-paper-sunken);
    border-radius: 0 0 var(--dpk-radius-lg) var(--dpk-radius-lg);
    color: var(--dpk-ink-faint);
  }
  .st-row--unset .st-name {
    padding-left: 4px;
    font-weight: 500;
  }
  .st-name {
    min-width: 0;
    font-size: 14px;
    font-weight: 650;
  }
  .st-share {
    display: grid;
    gap: 5px;
  }
  .st-share-text {
    color: var(--dpk-ink-faint);
    font-family: var(--dpk-mono);
    font-size: 11px;
    font-variant-numeric: tabular-nums;
  }
  .st-meter {
    height: 5px;
    border-radius: 3px;
    background: var(--dpk-paper-sunken);
    overflow: hidden;
  }
  .st-meter > span {
    display: block;
    height: 100%;
    border-radius: 3px;
    background: var(--usm-tone);
  }
  .st-pickers {
    display: grid;
    gap: 6px;
  }
  .st-icons,
  .st-tones {
    display: inline-flex;
    flex-wrap: wrap;
    gap: 5px;
  }
  .st-icon {
    display: inline-grid;
    place-items: center;
    width: 22px;
    height: 22px;
    padding: 0;
    border: 1px solid transparent;
    border-radius: var(--dpk-radius-xs);
    background: transparent;
    cursor: pointer;
  }
  .st-icon:hover {
    background: var(--dpk-paper-inset);
  }
  .st-icon[aria-checked='true'] {
    border-color: var(--usm-tone);
    background: color-mix(in srgb, var(--usm-tone) 12%, transparent);
  }
  .st-icon:focus-visible {
    outline: none;
    box-shadow: var(--dpk-focus);
  }
  .st-tone {
    width: 18px;
    height: 18px;
    padding: 0;
    border: 2px solid var(--dpk-paper-raised);
    border-radius: 50%;
    background: var(--usm-tone);
    box-shadow: 0 0 0 1px var(--dpk-rule-strong);
    cursor: pointer;
    transition: box-shadow 150ms ease;
  }
  .st-tone:hover {
    box-shadow: 0 0 0 1px var(--usm-tone);
  }
  .st-tone[aria-checked='true'] {
    box-shadow: 0 0 0 2px var(--usm-tone);
  }
  .st-tone:focus-visible {
    outline: none;
    box-shadow: var(--dpk-focus);
  }
  .st-tools {
    display: inline-flex;
    gap: 2px;
  }
  .st-tools .dpk-icon-btn {
    width: 26px;
    height: 26px;
    font-size: 13px;
  }
  @media (max-width: 640px) {
    .st-row {
      grid-template-columns: 16px minmax(0, 1fr) auto;
      row-gap: 8px;
    }
    .st-share,
    .st-pickers {
      grid-column: 2 / -1;
    }
  }

  /* Step picker shown after a cross-activity drop. */
  .move-dialog {
    min-width: 220px;
  }
`;
