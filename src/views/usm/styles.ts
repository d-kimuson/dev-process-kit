import { css } from 'lit';

/** Board chrome of `<dpk-view-usm>`: table, headers, rows, cells. Cards style themselves. */
export const usmStyles = css`
  :host {
    --dpk-usm-accent: var(--dpk-blue);
  }
  /*
   * A wide table must scroll inside itself and never widen the template shell.
   * It scrolls both ways so the backbone can stick to its top and the
   * milestone column to its left: a box that scrolls only sideways still
   * becomes the sticky ancestor, and its top would never move. It takes the
   * height left under the board head (tabs and toolbar), down to the page's
   * bottom edge: the hand-off dock floats over its corner, and the map's own
   * padding lets the last row scroll clear of it, so the page body keeps no
   * second clearance under it.
   *
   * The map's row is the space that is actually left, never a fixed minimum:
   * the supplements bar at the foot of the column is sticky and takes its own
   * height out of the column, so a floor taller than what remains would push the
   * map's last rows under that bar — off screen, with nothing left to scroll
   * them into view. The map itself scrolls; it does not need to be tall.
   */
  .dpk-main-body:has(> dpk-matrix) {
    flex: 1 1 0;
    min-height: 0;
    grid-template-rows: auto minmax(0, 1fr);
    padding-bottom: 16px;
  }
  /* The grid, its scroll, its sticky head and lead column are \`<dpk-matrix>\`'s
     own; this only wires the hand-off dock's clearance through to matrix's
     own variable, which it does not otherwise know about. Every head here
     (\`.corner\`, \`.act-head\`, \`.col-head\`, \`.row-lead\`) already carries its
     own full padding, so matrix's own generic head padding is kept to a
     small edge buffer rather than stack a second full inset around each
     one — just enough room that a grip never sits flush against the
     column/row rule it's next to, the way every head had before this board
     moved its padding onto \`<dpk-matrix>\`; the cell keeps matrix's own
     padding and paper surface, now that \`.cell\` no longer sets either
     itself. */
  dpk-matrix {
    --dpk-matrix-dock-clearance: var(--dpk-dock-clearance, 0px);
    --dpk-matrix-head-pad: 4px;
    /* A grid item will not shrink below its own content unless told to; the map
       is a scroll frame, so it may be exactly as tall as the row it was given. */
    min-height: 0;
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
  /* Row names and their meta line share one column: past \`<dpk-matrix>\`'s own
     grip and gap (its exposed span) and the inline edit's own padding (4px). */
  .row-lead {
    --usm-row-indent: calc(var(--dpk-matrix-grip-span, 22px) + 4px);
  }
  /* \`<dpk-matrix>\`'s own grip bleed (\`margin-inline-start: -grip-span\` plus a
     matching \`padding-inline-start\`) lands on this box, the slot's direct
     child — but this box's own left padding above (4px, for the ungripped
     case) is a physical property on the same side, so it wins the cascade
     over the matrix's logical one and leaves the title undercompensated,
     pulled in under the grip instead of past it. Matching the matrix's own
     target value here, rather than fighting over which side wins, keeps the
     title's start exactly where the grip's own gap ends (the same inset a
     column head's flat, ungrouped slot node gets for free). The column heads
     below carry the identical fix, for the identical reason. */
  .row-lead[draggable='true'] {
    padding-inline-start: var(--dpk-matrix-grip-span, 22px);
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
  .corner {
    display: grid;
    gap: 3px;
    align-content: start;
  }
  /* The backbone is read on every scroll, so its rows are kept short: the
     axis labels sit tight and the step names get a single slim line. */
  .corner {
    gap: 1px;
    padding: 7px 10px;
    line-height: 1.3;
    text-wrap: balance;
  }

  /* Above the content: the page tabs (map / milestones) and, on the map, the
     unit toggle (group band vs one column per activity). */

  /* The board bar and the map's toolbar stay on top together while a long
     milestone list or the map scrolls under them. */
  .board-head {
    position: sticky;
    top: 0;
    z-index: 5;
    margin: -24px -24px 0;
    background: var(--dpk-glass);
    backdrop-filter: saturate(1.6) blur(14px);
    min-width: 0;
  }

  .board-bar {
    --usm-bar-pad: 6px;
    border-bottom: 1px solid var(--dpk-rule);
    padding: var(--usm-bar-pad) 24px;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px 14px;
    min-width: 0;
  }

  /* The pages: an underlined tab strip, heavier than the view toggle. The
     tabs that do not fit fold behind the more button beside it (\`.page-nav\`);
     the bottom padding keeps the selected tab's underline, which sits on the
     bar's bottom rule, inside the clip. */
  .page-tabs {
    --dpk-tabstrip-pad: var(--usm-bar-pad);
    --dpk-tabstrip-accent: var(--dpk-usm-accent);
    display: inline-flex;
    margin-bottom: calc(-1 * var(--usm-bar-pad) - 1px);
    padding-bottom: calc(var(--usm-bar-pad) + 1px);
    border-bottom: none;
    overflow: hidden;
  }

  /* Activity band: raised above the working canvas. A head spans its steps,
     so its contents stay in view beside the sticky column while the map
     scrolls sideways. */
  .act-head {
    position: relative;
    display: grid;
    align-content: start;
    gap: 4px;
    padding: 7px 10px 11px;
    background: var(--dpk-paper-raised);
    box-shadow:
      var(--dpk-bevel),
      inset 0 -1px 0 var(--dpk-rule-strong);
    font-size: 13px;
    font-weight: 650;
    letter-spacing: -0.005em;
  }
  /* Same undercompensation as \`.row-lead\` above, same fix: this box's own
     left padding (10px, physical) otherwise wins over \`<dpk-matrix>\`'s grip
     bleed compensation (logical), leaving the title pulled in under the
     grip. */
  .act-head[draggable='true'] {
    padding-inline-start: var(--dpk-matrix-grip-span, 22px);
  }
  .act-title,
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
  /* The name keeps its whole line while it fits; the actor beside it gives
     way (truncates) first, down to an ellipsis. */
  .act-name {
    display: flex;
    flex: 1 1 auto;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }
  .act-name > dpk-inline-edit {
    flex: none;
    max-width: calc(100% - 32px);
  }
  /* How far the group's stories have come: a strip along the head's bottom
     edge, as wide as the steps it spans, so it costs the band no line. */
  .act-head > .status-bar {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 4px;
    gap: 1px;
  }
  .act-head > .status-bar .status-bar-part {
    border-radius: 0;
  }
  /* Whose experience the activity is: a label beside the name, editable in place. */
  .act-actor {
    display: flex;
    flex: 0 1 auto;
    min-width: 24px;
    max-width: 60%;
    padding: 0 4px;
    border-radius: 999px;
    background: var(--dpk-blue-soft);
    color: var(--dpk-blue);
    font-size: 11px;
    font-weight: 650;
    line-height: 20px;
  }
  .act-actor > dpk-inline-edit {
    min-width: 0;
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
  .col-head {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 5px 10px;
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
  /* Same undercompensation as \`.row-lead\` above, same fix. */
  .col-head[draggable='true'] {
    padding-inline-start: var(--dpk-matrix-grip-span, 22px);
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
    padding: 10px;
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

  /* \`<dpk-matrix>\` is the row's drag handle, grip and cursor now; this only
     keeps a browser-native drag affordance off the name editor inside it. */
  .row-head dpk-inline-edit {
    -webkit-user-drag: none;
  }

  /* Column drag: a group's head or a step's head is its column's handle, the
     way a row head is a milestone's; \`<dpk-matrix>\` is the handle, grip and
     cursor now. This only keeps native drag off the editors inside. */
  .act-head dpk-inline-edit,
  .col-head dpk-inline-edit {
    -webkit-user-drag: none;
  }

  /* Unassigned is a holding area, not a release: its label is quieter. */
  .row-head[data-unassigned='true'] {
    padding-left: var(--usm-row-indent);
    color: var(--dpk-ink-soft);
  }

  /* Cells are the working canvas: sunken, with a quiet dot lattice, so raised
     story cards read as things placed on the board. */
  /* The padding and the sunken dot surface are \`<dpk-matrix>\`'s own now; this
     only stacks cards inside the cell it already gives us. */
  .cell {
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-height: 100px;
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
  /* The add button (the kit's add atom) shows on the cell's hover only. */
  .add-cell {
    margin-top: auto;
    opacity: 0;
    transition:
      opacity 180ms var(--dpk-ease),
      background 160ms var(--dpk-ease),
      border-color 160ms var(--dpk-ease),
      color 160ms var(--dpk-ease);
  }
  .add-cell:focus-visible {
    opacity: 1;
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
  .ms-name dpk-inline-edit {
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

  /*
   * The statuses, labels and members overviews are no longer styled here: they
   * are rendered by <dpk-usm-settings-section>, which carries its own copy of
   * that CSS in its own shadow root, because the settings dialog may be drawn
   * by the element that owns the page's chrome (see that file).
   */

  /* Step picker shown after a cross-activity drop. */
  .move-dialog {
    min-width: 220px;
  }
  .move-dialog .dpk-rich-select {
    width: 100%;
  }

  /* ----------------------------------------------------------- table tab */

  /* The flat view of every story: dpk-table supplies its own
     chrome, this just gives it the page's margins. */
  .story-table {
    display: block;
    max-width: 1200px;
    padding: 28px 0 40px;
  }
`;
