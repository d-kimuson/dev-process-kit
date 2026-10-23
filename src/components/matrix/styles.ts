import { css } from 'lit';

/**
 * Generic chrome of `<dpk-matrix>`: the scrolling grid, its sticky head and
 * lead column, the row/column drag affordances, and a default look (padding,
 * borders, paper surfaces) for every head and cell box so a host with no CSS
 * of its own still gets a real grid rather than a bare table. Every head and
 * cell's own *content* stays the host's (slotted), styled by the host's own
 * sheet; a host that already fully styles its own head content (a raised
 * band, say) can turn the box's own padding back off with
 * `--dpk-matrix-head-pad: 0`.
 */
export const matrixStyles = css`
  :host {
    display: block;
    --dpk-matrix-row-head-width: 140px;
    --dpk-matrix-column-width: minmax(180px, 240px);
    --dpk-matrix-dock-clearance: 0px;
    /* A host with its own fully-styled head content (a raised band, say) sets
       this to 0 on its own \`<dpk-matrix>\` rather than fight the padding from
       outside the shadow root; the cell pad has no such escape hatch yet, since
       every host so far wants it. */
    --dpk-matrix-head-pad: 10px;
    --dpk-matrix-cell-pad: 10px;
    /* The width a draggable head's own grip plus the gap after it takes up
       (14px icon + 6px gap, below): exposed so a host's slotted content can
       bleed its own surface behind the grip (below) and, if it has a second
       line, indent that line to the same start the first line's text gets. */
    --dpk-matrix-grip-span: 20px;
  }
  .matrix-scroll {
    min-width: 0;
    max-width: 100%;
    overflow: auto;
    overscroll-behavior-x: contain;
    border: 1px solid var(--dpk-rule);
    border-radius: var(--dpk-radius-lg);
    background: var(--dpk-paper-sunken);
    box-shadow: var(--dpk-shadow);
  }
  .matrix-grid {
    display: grid;
    gap: 0;
    min-width: max-content;
    padding-bottom: var(--dpk-matrix-dock-clearance);
  }
  .matrix-row {
    display: grid;
    grid-template-columns: var(--dpk-matrix-row-head-width) repeat(var(--matrix-cols), var(--dpk-matrix-column-width));
  }
  .matrix-row + .matrix-row {
    border-top: 1px solid var(--dpk-rule);
  }

  /* The head stays at the top while the rows scroll. */
  .matrix-head {
    position: sticky;
    top: 0;
    z-index: 3;
    border-bottom: 1px solid var(--dpk-rule-strong);
    box-shadow: 0 8px 14px -12px var(--dpk-shade-3);
  }

  /* The lead column (the corner and every row's head) stays at the left while
     the columns scroll sideways; opaque, so cells pass under it. The
     background is set here, not left to the slotted content: a row's head
     spans the whole row (as tall as the cards stacked in any of its cells),
     taller than its own label, so without it the row's own background would
     leave that extra height transparent and a cell scrolled underneath would
     show through instead of staying hidden under the sticky column. */
  .matrix-corner,
  .matrix-row-head {
    position: sticky;
    left: 0;
    z-index: 2;
    padding: var(--dpk-matrix-head-pad);
    background: var(--dpk-paper-sunken);
    box-shadow: 1px 0 0 var(--dpk-rule);
  }

  .matrix-col-head,
  .matrix-sub-head {
    padding: var(--dpk-matrix-head-pad);
    background: var(--dpk-paper-sunken);
    border-left: 1px solid var(--dpk-rule);
  }

  /* A draggable row/column/sub-column head carries its own grip (below), laid
     out as a flex sibling of whatever the host slots in; a head with no grip
     (none draggable) still gets the same box, just with nothing in that
     slot. Baseline-aligned, not centred on the whole box: a host's head can
     hold more than one line (a name plus a meta line, a title plus a steps
     list), and the grip should still sit with the *first* line's text, the
     way it did when the host drew it inline there itself. */
  .matrix-row-head,
  .matrix-col-head,
  .matrix-sub-head {
    display: flex;
    align-items: baseline;
    gap: 6px;
  }
  .matrix-row-head ::slotted(*),
  .matrix-col-head ::slotted(*),
  .matrix-sub-head ::slotted(*) {
    flex: 1 1 auto;
    min-width: 0;
  }
  /* The grip is the component's own, but the head's background, highlight or
     border is the host's (its slotted content's) — so that surface has to
     reach under the grip too, not stop at the slot's own flex box. A
     draggable head's slotted content bleeds left by the grip's span and pads
     the same amount back in: its content stays exactly where it was, but its
     background now runs the full width of the cell, grip included (and,
     with the grip's own stacking below, paints under it rather than over
     it). A non-draggable head has no grip to bleed behind, so it is left at
     its own natural padding. */
  .matrix-row-head[draggable='true'] ::slotted(*),
  .matrix-col-head[draggable='true'] ::slotted(*),
  .matrix-sub-head[draggable='true'] ::slotted(*) {
    margin-inline-start: calc(-1 * var(--dpk-matrix-grip-span));
    padding-inline-start: var(--dpk-matrix-grip-span);
  }

  /* The grip itself: the same affordance everywhere a head can be dragged,
     rendered by the component so every host gets it for free instead of
     drawing its own. Lifted onto its own layer so the slotted content's
     bled-left background (above) paints under it, not over it. Quiet until
     the head it belongs to is hovered. */
  .matrix-grip {
    position: relative;
    z-index: 1;
    flex: none;
    display: inline-flex;
    color: var(--dpk-ink-faint);
    transition: color 140ms ease;
  }
  .matrix-grip svg {
    display: block;
    width: 14px;
    height: 14px;
  }
  .matrix-row-head:hover .matrix-grip,
  .matrix-col-head:hover .matrix-grip,
  .matrix-sub-head:hover .matrix-grip {
    color: var(--dpk-blue);
  }
  /* The working surface: a quiet dot lattice on the sunken paper, so a card a
     host places inside reads as something set down on the board rather than
     text in a table cell. */
  .matrix-cell {
    padding: var(--dpk-matrix-cell-pad);
    background: var(--dpk-dots), var(--dpk-paper-sunken);
    border-left: 1px solid var(--dpk-rule);
    border-top: 1px solid var(--dpk-rule);
  }

  /* Row drag: the head is the handle (hover/active cursor), the whole row the target. */
  .matrix-row-head[draggable='true'] {
    cursor: grab;
    -webkit-user-select: none;
    user-select: none;
  }
  .matrix-row-head[draggable='true']:active {
    cursor: grabbing;
  }
  .matrix-row[data-draggable='true'] {
    cursor: grab;
  }
  .matrix-row[data-draggable='true']:active {
    cursor: grabbing;
  }
  /*
   * Dragging state: entire row fades. Never disable pointer events on the
   * source here: Lit applies this state in the microtask right after
   * dragstart, and Blink then re-hit-tests the pointer and aborts the drag
   * when the source is no longer under it.
   */
  .matrix-row[data-row-dragging='true'] {
    opacity: 0.45;
  }
  .matrix-row[data-row-drop='true'] {
    outline: 2px dashed var(--dpk-blue);
    outline-offset: -2px;
  }

  /* Column drag: a column's or sub-column's head is its handle, like a row's. */
  .matrix-col-head[draggable='true'],
  .matrix-sub-head[draggable='true'] {
    cursor: grab;
    -webkit-user-select: none;
    user-select: none;
  }
  .matrix-col-head[draggable='true']:active,
  .matrix-sub-head[draggable='true']:active {
    cursor: grabbing;
  }
  /* The dragged column fades from head to last cell, like a dragged row. */
  .matrix-col-head[data-col-dragging='true'],
  .matrix-sub-head[data-col-dragging='true'],
  .matrix-cell[data-col-dragging='true'] {
    opacity: 0.45;
  }
  /* The column a dragged one would land in lights up from head to last cell:
     its sides run down every part and its head caps it. A column spans its
     sub-columns, so only its outer sub-columns draw its sides. */
  .matrix-col-head:is([data-col-drop='column'], [data-col-drop='subColumn']),
  .matrix-sub-head:is([data-col-drop='column'], [data-col-drop='subColumn']),
  .matrix-cell:is([data-col-drop='column'], [data-col-drop='subColumn']) {
    --matrix-col-left: 2px;
    --matrix-col-right: 2px;
    --matrix-col-top: 0px;
    box-shadow:
      inset var(--matrix-col-left) 0 0 var(--dpk-blue),
      inset calc(var(--matrix-col-right) * -1) 0 0 var(--dpk-blue),
      inset 0 var(--matrix-col-top) 0 var(--dpk-blue);
  }
  [data-col-drop='column'][data-sub-edge]:not([data-sub-edge~='first']) {
    --matrix-col-left: 0px;
  }
  [data-col-drop='column'][data-sub-edge]:not([data-sub-edge~='last']) {
    --matrix-col-right: 0px;
  }
  .matrix-col-head[data-col-drop='column'],
  .matrix-sub-head[data-col-drop='subColumn'] {
    --matrix-col-top: 2px;
  }
  .matrix-cell:is([data-col-drop='column'], [data-col-drop='subColumn']) {
    background: linear-gradient(var(--dpk-blue-soft), var(--dpk-blue-soft)), var(--dpk-dots), var(--dpk-paper-sunken);
  }
  /* The heads stay opaque: the cells scroll under them. */
  .matrix-col-head:is([data-col-drop='column'], [data-col-drop='subColumn']),
  .matrix-sub-head:is([data-col-drop='column'], [data-col-drop='subColumn']) {
    background-image: linear-gradient(var(--dpk-blue-soft), var(--dpk-blue-soft));
  }
`;
