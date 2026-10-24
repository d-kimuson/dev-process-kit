import { css } from 'lit';

/*
 * Table cards after Liam ERD: a quiet card with a tinted header, one compact
 * row per column (icon, name, type on the right) and thin relation curves that
 * attach to the column rows. Hovering or selecting a table, a column row or a
 * relation lights the keys it reaches — the relations, the tables at their
 * ends and the two columns each joins — in the one relational accent (blue);
 * no table dims, only the relations left unlit fade. Green, red and amber
 * stay reserved for the diff.
 */
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

  /* ---- Bounded Context grouping ---- */

  /*
   * One padded box per Bounded Context, behind the aggregate frames and everything else: a
   * wider, solid region framing a whole BC. Unlike \`.er-aggregate\` it is never draggable (plain
   * backdrop, \`pointer-events: none\`) and \`is-bc-dimmed\` is purely visual — see the filter rule below.
   */
  .er-bc {
    position: absolute;
    box-sizing: border-box;
    border: 1.5px solid color-mix(in srgb, var(--dpk-ink-faint) 35%, transparent);
    border-radius: var(--dpk-radius);
    background: color-mix(in srgb, var(--dpk-paper-inset) 35%, transparent);
    pointer-events: none;
    transition: opacity 160ms ease;
  }

  .er-bc-label {
    position: absolute;
    left: 12px;
    top: 6px;
    padding: 2px 9px;
    border-radius: 999px;
    background: var(--dpk-paper-inset);
    font-family: var(--dpk-mono);
    font-size: 10.5px;
    font-weight: 600;
    color: var(--dpk-ink-soft);
    white-space: nowrap;
    /*
     * At the fit-to-content zoom of a large diagram \`--dpk-zoom-scale\` (set by the
     * viewport on the world element, see viewport.ts) can be well under 1, which would
     * shrink this label below reading size along with everything else. Counter-scale it
     * so its on-screen size never drops under its own 1x authored size; zooming in past
     * 100% still grows it like any other content (the \`clamp\` floors at 1).
     *
     * The upper bound (2.2) is not cosmetic: the label's on-screen size divided by
     * \`view.scale\` is its effective footprint in *world* space — the space the layout's
     * fixed padding (\`BC_LABEL_SPACE\` in view.ts) was sized against. Floored-but-uncapped
     * growth (as zoom keeps shrinking) makes that footprint grow without bound, which is
     * exactly what let this label grow into the first nested aggregate's label at low
     * zoom. Capping the scale factor caps the footprint at (natural size × 2.2) for *any*
     * zoom, which \`BC_LABEL_SPACE\` is sized to clear; see the comment there.
     */
    transform-origin: top left;
    transform: scale(clamp(1, calc(1 / var(--dpk-zoom-scale, 1)), 2.2));
  }

  /* ---- Aggregate grouping ---- */

  /*
   * One padded, dashed box per aggregate, behind its tables and the relation lines. Its own area still
   * takes pointer events (grab its outline, or any gap it covers between tables, to drag every member
   * table together); a table drawn on top of it keeps first claim on the same point, same as always.
   */
  .er-aggregate {
    position: absolute;
    box-sizing: border-box;
    border: 1.5px dashed color-mix(in srgb, var(--dpk-ink-faint) 55%, transparent);
    border-radius: var(--dpk-radius);
    cursor: grab;
    touch-action: none;
  }

  /* While an aggregate's whole-group drag has passed the movement threshold. */
  .er-aggregate.is-dragging {
    cursor: grabbing;
  }

  .er-aggregate-label {
    position: absolute;
    left: 10px;
    top: 4px;
    padding: 1px 7px;
    border-radius: 999px;
    background: var(--dpk-paper-inset);
    font-family: var(--dpk-mono);
    font-size: 9.5px;
    font-weight: 560;
    color: var(--dpk-ink-faint);
    white-space: nowrap;
    /* Same zoomed-out floor and footprint cap as \`.er-bc-label\` above, one nesting level down. */
    transform-origin: top left;
    transform: scale(clamp(1, calc(1 / var(--dpk-zoom-scale, 1)), 2.2));
  }

  /* ---- Table card ---- */

  .er-table {
    /* Where a row's name starts: the left padding plus the icon and its gap. */
    --er-indent: 33px;
    display: flex;
    flex-direction: column;
    border: 1px solid var(--dpk-rule-strong);
    border-radius: var(--dpk-radius-xs);
    background: var(--dpk-paper-raised);
    box-shadow: var(--dpk-shadow-sm);
    overflow: hidden;
    cursor: default;
    transition: opacity 160ms ease;
  }

  .er-table.has-diff {
    /* Plus the change mark's column. */
    --er-indent: 50px;
  }

  .er-table.is-added {
    border-color: color-mix(in srgb, var(--dpk-green) 60%, transparent);
  }

  .er-table.is-removed {
    border-style: dashed;
    border-color: color-mix(in srgb, var(--dpk-accent) 60%, transparent);
  }

  .er-table.is-changed {
    border-color: color-mix(in srgb, var(--dpk-amber) 55%, transparent);
  }

  .er-table.is-lit {
    border-color: var(--dpk-blue);
    box-shadow:
      var(--dpk-shadow-sm),
      0 0 18px color-mix(in srgb, var(--dpk-blue) 30%, transparent);
  }

  .er-table.is-selected {
    border-color: var(--dpk-blue);
    box-shadow:
      inset 0 0 0 1px var(--dpk-blue),
      var(--dpk-shadow-sm),
      0 0 22px color-mix(in srgb, var(--dpk-blue) 40%, transparent);
  }

  .er-head {
    display: flex;
    align-items: center;
    gap: 2px;
    min-height: 48px;
    flex-shrink: 0;
    padding-right: 6px;
    border-bottom: 1px solid var(--dpk-rule);
    background: color-mix(in srgb, var(--dpk-paper-inset) 60%, var(--dpk-paper-raised));
  }

  .er-head-select {
    display: flex;
    align-items: center;
    gap: 7px;
    flex: 1;
    min-width: 0;
    align-self: stretch;
    padding: 8px 4px 8px 10px;
    border: 0;
    background: none;
    color: var(--dpk-ink);
    font: inherit;
    text-align: left;
    cursor: pointer;
  }

  .er-head-select:focus-visible {
    outline: none;
    box-shadow: inset 0 0 0 2px var(--dpk-blue);
  }

  /* Stacked: the id (what the schema is read by) on top, the descriptive name under it. */
  .er-title {
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
    flex: 1;
  }

  .er-title-top {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0 7px;
    min-width: 0;
  }

  .er-name {
    /* The id is what the schema is read by: it wraps rather than being cut. */
    min-width: 0;
    overflow-wrap: anywhere;
    font-size: 13px;
    font-weight: 600;
    letter-spacing: -0.01em;
  }

  .er-table.is-removed .er-name {
    text-decoration: line-through;
    color: var(--dpk-ink-soft);
  }

  .er-label {
    flex: 0 1 auto;
    min-width: 0;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 11px;
    color: var(--dpk-ink-faint);
  }

  /* A table's major structural pattern (Immutable / STI / …): an auxiliary badge, never a filter. */
  .er-pattern-badge {
    flex-shrink: 0;
    padding: 1px 6px;
    border-radius: 999px;
    border: 1px solid var(--dpk-rule-strong);
    background: var(--dpk-paper-inset);
    font-family: var(--dpk-mono);
    font-size: 9px;
    font-weight: 560;
    color: var(--dpk-ink-soft);
    white-space: nowrap;
  }

  .er-status {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    flex-shrink: 0;
    padding: 1px 6px;
    border-radius: 999px;
    font-size: 10px;
    font-weight: 560;
    line-height: 1.5;
  }

  .er-status > span {
    font-family: var(--dpk-mono);
  }

  .er-table.is-added .er-status {
    background: var(--dpk-green-soft);
    color: var(--dpk-green);
  }

  .er-table.is-removed .er-status {
    background: var(--dpk-accent-soft);
    color: var(--dpk-accent);
  }

  .er-table.is-changed .er-status {
    background: var(--dpk-amber-soft);
    color: var(--dpk-amber);
  }

  .er-head .diagram-comment-trigger {
    flex-shrink: 0;
    width: 24px;
    height: 24px;
    padding: 4px;
    border-radius: var(--dpk-radius-xs);
  }

  .er-head .diagram-comment-trigger svg {
    width: 14px;
    height: 14px;
  }

  /* ---- Column rows ---- */

  .er-fields {
    display: flex;
    flex-direction: column;
  }

  .er-field {
    flex-shrink: 0;
    border-bottom: 1px solid var(--dpk-rule);
    font-size: 12px;
    transition: background 120ms ease;
  }

  .er-field:last-child {
    border-bottom: 0;
  }

  .er-field:hover {
    background: color-mix(in srgb, var(--dpk-paper-inset) 45%, transparent);
  }

  .er-field-line {
    display: grid;
    /*
     * The name keeps a floor (long enough for a handful of glyphs either script):
     * without it, a wide type diff squeezes an unbroken identifier down toward
     * 0 and it wraps one character per line instead of a few.
     */
    grid-template-columns: auto 16px minmax(64px, 1fr) auto auto;
    align-items: center;
    gap: 7px;
    min-height: 31px;
    padding: 4px 6px 4px 10px;
  }

  .er-field-mark {
    width: 10px;
    font-family: var(--dpk-mono);
    font-size: 11px;
    font-weight: 600;
    text-align: center;
  }

  /* Without a diff the mark's column goes away, and the name starts at the icon. */
  .er-table:not(.has-diff) .er-field-mark {
    display: none;
  }

  .er-table:not(.has-diff) .er-field-line {
    grid-template-columns: 16px minmax(64px, 1fr) auto auto;
  }

  .er-icon {
    display: grid;
    place-items: center;
    width: 16px;
    color: var(--dpk-ink-faint);
  }

  .er-icon svg {
    width: 13px;
    height: 13px;
  }

  .er-icon:is([data-icon='primary'], [data-icon='foreign']) {
    color: var(--dpk-blue);
  }

  .er-icon[data-icon='not-null'] {
    color: var(--dpk-ink-soft);
  }

  .er-icon[data-icon='not-null'] svg {
    fill: currentColor;
  }

  .er-field-name {
    min-width: 0;
    overflow-wrap: anywhere;
    color: var(--dpk-ink);
  }

  .er-key {
    display: inline-block;
    margin-left: 6px;
    padding: 0 4px;
    border-radius: 3px;
    background: var(--dpk-paper-inset);
    font-family: var(--dpk-mono);
    font-size: 9px;
    line-height: 1.6;
    color: var(--dpk-ink-soft);
    vertical-align: 1px;
  }

  /* A changed type breaks between its old and new value, never inside a word. */
  .er-field-type {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    align-items: baseline;
    gap: 0 5px;
    max-width: 168px;
    min-width: 0;
    font-family: var(--dpk-mono);
    font-size: 11px;
    color: var(--dpk-ink-faint);
    text-align: right;
  }

  .er-field-type > :is(del, ins) {
    white-space: nowrap;
  }

  .er-field-action {
    display: flex;
    align-items: center;
    gap: 2px;
  }

  .er-field-edit {
    width: 20px;
    height: 20px;
    padding: 3px;
    opacity: 0;
  }

  .er-field-edit svg {
    width: 12px;
    height: 12px;
  }

  .er-field:hover .er-field-edit,
  .er-field:focus-within .er-field-edit {
    opacity: 1;
  }

  @media (hover: none) {
    .er-field-edit {
      opacity: 1;
    }
  }

  /* A column's own supplementary note (never diffed, like a table's own name), under its row. */
  .er-field-description {
    margin: -4px 0 6px;
    padding: 0 8px 0 var(--er-indent);
    overflow-wrap: anywhere;
    font-size: 10.5px;
    line-height: 1.4;
    color: var(--dpk-ink-faint);
  }

  /* A joined column: the row a lit relation lands on reads as the key it is. */
  .er-field.is-lit {
    background: color-mix(in srgb, var(--dpk-blue) 16%, var(--dpk-paper-raised));
  }

  .er-field.is-lit .er-field-name {
    /*
     * Color only: a weight change shifts a long name's own wrap points
     * (bold glyphs are wider), so hovering or selecting would jitter the
     * row it highlights instead of just tinting it.
     */
    color: var(--dpk-blue);
  }

  .er-field.is-lit .er-field-type {
    color: var(--dpk-ink-soft);
  }

  .er-field.is-added {
    background: color-mix(in srgb, var(--dpk-green) 9%, transparent);
  }

  .er-field.is-removed {
    background: color-mix(in srgb, var(--dpk-accent) 8%, transparent);
  }

  .er-field.is-removed :is(.er-field-name, .er-field-type) {
    text-decoration: line-through;
    color: var(--dpk-ink-faint);
  }

  .er-field.is-changed {
    background: color-mix(in srgb, var(--dpk-amber) 9%, transparent);
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

  .er-field.is-match {
    box-shadow: inset 0 0 0 1px var(--dpk-blue);
  }

  /* Old and new values side by side: the type in its own cell, the rest under the row. */
  .er-field del {
    color: var(--dpk-accent);
    text-decoration: line-through;
  }

  .er-field ins {
    color: var(--dpk-green);
    text-decoration: none;
  }

  .er-deltas {
    display: flex;
    flex-wrap: wrap;
    gap: 2px 12px;
    margin: -3px 0 0;
    padding: 0 8px 6px var(--er-indent);
    list-style: none;
    font-family: var(--dpk-mono);
    font-size: 10px;
    line-height: 1.5;
  }

  .er-delta {
    display: flex;
    align-items: baseline;
    gap: 4px;
    min-width: 0;
    overflow-wrap: anywhere;
    color: var(--dpk-ink-faint);
  }

  .er-delta-name {
    font-family: var(--dpk-body);
    font-size: 9.5px;
  }

  /* ---- Table-level constraints ---- */

  /* Composite UNIQUE / PK, CHECK, EXCLUDE: a compact, quiet section under the column list. */
  .er-constraints {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin: 0;
    padding: 7px 10px 7px var(--er-indent);
    border-top: 1px solid var(--dpk-rule);
    list-style: none;
    font-family: var(--dpk-mono);
    font-size: 10px;
    color: var(--dpk-ink-faint);
  }

  .er-constraint {
    overflow-wrap: anywhere;
  }

  /* ---- Legend ---- */

  /*
   * The shared diagram legend is pinned bottom-left over the canvas. The ER
   * fit view is left-heavy (the world is taller than it is wide), so that
   * corner is where the bottom row of cards sits; the right side is the empty
   * one. Keep the legend off the schema.
   */
  .diagram-legend {
    left: auto;
    right: 12px;
  }

  /* ---- Relations ---- */

  .er-edge {
    --er-line: color-mix(in srgb, var(--dpk-ink-faint) 75%, transparent);
  }

  .er-edge.is-added {
    --er-line: var(--dpk-green);
  }

  .er-edge.is-removed {
    --er-line: var(--dpk-accent);
  }

  .er-edge.is-changed {
    --er-line: var(--dpk-amber);
  }

  .er-edge.is-same:is(.is-lit, .is-selected) {
    --er-line: var(--dpk-blue);
  }

  .er-edge .d-edge-path {
    stroke: var(--er-line);
    stroke-width: 1.25;
  }

  /* While something is lit, the relations it does not reach step back. */
  .er-edge {
    transition: opacity 160ms ease;
  }

  .er-edge.is-faded {
    opacity: 0.28;
  }

  .er-edge.is-removed .d-edge-path {
    stroke-dasharray: 5 4;
  }

  .er-edge:is(.is-lit, :hover, :focus-visible) .d-edge-path {
    stroke: var(--er-line);
    stroke-width: 1.75;
  }

  .er-edge.is-selected .d-edge-path {
    stroke: var(--er-line);
    stroke-width: 2.25;
  }

  /* Dots running from the referenced column to the FK column while lit. */
  .er-edge-flow {
    fill: none;
    stroke: none;
    pointer-events: none;
  }

  .er-edge:is(.is-lit, .is-selected) .er-edge-flow {
    stroke: var(--er-line);
    stroke-width: 3;
    stroke-linecap: round;
    stroke-dasharray: 0.1 13;
    animation: er-flow 900ms linear infinite;
  }

  @keyframes er-flow {
    to {
      stroke-dashoffset: -13.1;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .er-edge:is(.is-lit, .is-selected) .er-edge-flow {
      animation: none;
    }
  }

  /* Crow's foot ends take the line's colour; the "zero" circle is hollow. */
  .er-end {
    pointer-events: none;
    fill: var(--dpk-paper-sunken);
    stroke: var(--er-line);
    stroke-width: 1.25;
    stroke-linecap: round;
  }

  .er-edge:is(.is-lit, .is-selected) .er-end {
    stroke-width: 1.75;
  }

  /*
   * Multiplicities are part of the relation's meaning, not hover decoration:
   * the reader reported that 1..N was simply absent until a pointer happened
   * to land on the line. They stay visible at rest (settled to a slightly
   * softer ink) and sharpen on hover/selection. The label boxes are placed
   * beside the stroke, so showing them does not cover the line.
   */
  .er-cardinality,
  .er-relation-label {
    paint-order: stroke;
    stroke: var(--dpk-paper-sunken);
    stroke-linejoin: round;
    fill: var(--dpk-ink-soft);
    opacity: 0.85;
    transition: opacity 120ms ease;
  }

  .er-edge:is(.is-lit, .is-selected, .is-changed, :hover, :focus-within) :is(.er-cardinality, .er-relation-label) {
    opacity: 1;
  }

  .er-cardinality {
    font-family: var(--dpk-mono);
    font-size: 10px;
    stroke-width: 5px;
  }

  .er-relation-label {
    font-size: 10px;
    font-style: italic;
    stroke-width: 4px;
  }

  .er-edge.is-same:is(.is-lit, .is-selected) :is(.er-cardinality, .er-relation-label) {
    fill: var(--dpk-blue);
  }

  .er-cardinality.is-added,
  .er-relation-label.is-added {
    fill: var(--dpk-green);
  }

  .er-cardinality.is-removed,
  .er-relation-label.is-removed {
    fill: var(--dpk-accent);
  }

  .er-cardinality.is-changed,
  .er-relation-label.is-changed {
    fill: var(--dpk-amber);
  }

  .er-was {
    fill: var(--dpk-accent);
    text-decoration: line-through;
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

  /* ---- Bounded Context filter: dim, don't hide ---- */

  /*
   * Choosing a Bounded Context in the tag filter never hides the other tables (\`filtered()\` in
   * element.ts keeps them in \`visible\` on purpose): everything outside it, and every relation
   * touching one, just dims, so the chosen BC's place in the whole schema still reads while the
   * view pans/zooms onto it. After \`.is-faded\` so the two combine (an edge the selection also
   * faded) toward the more dimmed result, not back toward full opacity.
   */
  .er-table.is-bc-dimmed,
  .er-bc.is-bc-dimmed {
    opacity: 0.3;
  }

  .er-edge.is-bc-dimmed {
    opacity: 0.12;
  }

  /* ---- Adding and editing columns ---- */

  .er-add {
    border-top: 1px solid var(--dpk-rule);
  }

  .er-add-button {
    display: flex;
    align-items: center;
    gap: 7px;
    width: 100%;
    min-height: 30px;
    padding: 4px 10px 4px calc(var(--er-indent) - 23px);
    border: 0;
    background: none;
    color: var(--dpk-ink-faint);
    font-family: var(--dpk-body);
    font-size: 11.5px;
    text-align: left;
    cursor: pointer;
    transition:
      background 120ms ease,
      color 120ms ease;
  }

  .er-add-button:hover {
    background: color-mix(in srgb, var(--dpk-paper-inset) 45%, transparent);
    color: var(--dpk-ink);
  }

  .er-add-button:focus-visible {
    outline: none;
    color: var(--dpk-ink);
    box-shadow: inset 0 0 0 2px var(--dpk-blue);
  }

  .er-add-button.is-open {
    background: color-mix(in srgb, var(--dpk-blue) 9%, transparent);
    color: var(--dpk-ink);
  }

  /* The row being edited stays in place under the editor, ringed. */
  .er-field.is-editing {
    background: color-mix(in srgb, var(--dpk-blue) 9%, var(--dpk-paper-raised));
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--dpk-blue) 65%, transparent);
  }

  .er-field.is-editing .er-field-edit {
    opacity: 1;
    color: var(--dpk-blue);
  }

  /* The editor: a small card in the top layer, like a tooltip, under its row. */
  .er-editor {
    box-sizing: border-box;
    position: fixed;
    inset: auto;
    margin: 0;
    overflow: auto;
    display: grid;
    gap: 10px;
    padding: 10px 12px 12px;
    border: 1px solid var(--dpk-rule-strong);
    border-radius: var(--dpk-radius-sm);
    background: var(--dpk-paper-raised);
    box-shadow: var(--dpk-shadow);
    color: var(--dpk-ink);
    font-family: var(--dpk-body);
    font-size: 12px;
    animation: er-editor-in 140ms var(--dpk-ease);
  }

  @keyframes er-editor-in {
    from {
      opacity: 0;
      transform: translateY(-3px);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .er-editor {
      animation: none;
    }
  }

  .er-editor-head {
    display: flex;
    align-items: center;
    gap: 7px;
    min-width: 0;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--dpk-rule);
  }

  .er-editor-title {
    flex-shrink: 0;
    font-size: 11.5px;
    font-weight: 600;
  }

  .er-editor-target {
    min-width: 0;
    margin-left: auto;
    overflow: hidden;
    font-family: var(--dpk-mono);
    font-size: 11px;
    color: var(--dpk-ink-faint);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .er-editor-fields {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: minmax(0, 1fr);
    gap: 8px;
  }

  .er-editor-field {
    display: grid;
    gap: 4px;
    min-width: 0;
  }

  .er-editor-field .dpk-input {
    min-height: 28px;
    padding: 3px 8px;
    font-family: var(--dpk-mono);
    font-size: 11.5px;
  }

  .er-editor-field .dpk-input[aria-invalid='true'] {
    border-color: var(--dpk-accent);
  }

  .er-editor-combo {
    min-width: 0;
  }

  /* A manual popover in the top layer, placed by the element; the UA popover box is reset. */
  .er-type-options {
    box-sizing: border-box;
    position: fixed;
    inset: auto;
    align-content: start;
    gap: 1px;
    margin: 0;
    padding: 4px;
    overflow-y: auto;
    overscroll-behavior: contain;
    border: 1px solid var(--dpk-rule-strong);
    border-radius: var(--dpk-radius-sm);
    background: var(--dpk-paper-raised);
    box-shadow: var(--dpk-shadow);
    color: var(--dpk-ink);
    list-style: none;
  }

  .er-type-options:popover-open {
    display: grid;
  }

  .er-type-options [role='option'] {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    padding: 4px 8px;
    border-radius: var(--dpk-radius-xs);
    color: var(--dpk-ink-soft);
    font-size: 11.5px;
    cursor: pointer;
  }

  .er-type-options [role='option']:hover,
  .er-type-options [role='option'][aria-selected='true'] {
    background: var(--dpk-paper-sunken);
    color: var(--dpk-ink);
  }

  .er-type-options code {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: var(--dpk-mono);
  }

  .er-type-options [data-kind='new'] .er-icon {
    color: var(--dpk-green);
  }

  .er-type-option-hint {
    flex: none;
    margin-left: auto;
    padding-left: 8px;
    color: var(--dpk-ink-faint);
    font-size: 10.5px;
  }

  .er-editor-check {
    display: flex;
    align-items: center;
    gap: 6px;
    width: fit-content;
    font-size: 11.5px;
    color: var(--dpk-ink-soft);
    cursor: pointer;
  }

  .er-editor-check input {
    width: 13px;
    height: 13px;
    margin: 0;
    accent-color: var(--dpk-blue);
    cursor: pointer;
  }

  /*
   * The keyboard hint and the delete-relations note each sit on their own full-width line
   * above the buttons: squeezed into the row beside them, either wraps one character per line.
   */
  .er-editor-foot {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .er-editor-keys {
    font-size: 10px;
    color: var(--dpk-ink-faint);
  }

  .er-editor-actions {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .er-editor-actions-right {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-left: auto;
  }

  .er-editor-foot .dpk-btn {
    min-height: 26px;
    padding: 0 12px;
    font-size: 11.5px;
  }

  .er-editor-note,
  .er-error {
    margin: 0;
    font-size: 10.5px;
    line-height: 1.45;
  }

  .er-editor-note {
    color: var(--dpk-accent);
  }

  .er-error {
    padding: 5px 8px;
    border-radius: var(--dpk-radius-xs);
    background: var(--dpk-accent-soft);
    color: var(--dpk-accent);
  }

  /*
   * Slotted into dpk-dialog-panel's own floating controls bar, beside zoom and
   * maximize: the \`.dpk-segmented\` atom (via \`controlAtom\`, composed into
   * this component's own styles) trimmed down to that bar's compact height.
   * \`renderControls\` wraps both segmented groups (columns shown, grouping
   * frames) in \`.er-controls-row\` so they sit side by side as one slotted
   * flex item.
   */
  .er-controls-row {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .er-column-filter,
  .er-grouping-filter {
    height: 28px;
  }

  .er-column-filter > button,
  .er-grouping-filter > button {
    padding: 0 10px;
    font-size: 10.5px;
  }
`;
