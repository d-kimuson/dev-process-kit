import { css } from 'lit';

/** Wall chrome of `<artifact-event-storming>`. Notes style themselves. */
export const eventStormingStyles = css`
  /* The board owns the whole main area; the viewport clips, never the shell. */
  .af-main {
    overflow: hidden;
  }

  .af-main-body {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
    padding: 0;
    gap: 0;
  }

  /* ------------------------------------------------------------- viewport */

  /* An infinite pannable surface; the dot grid scrolls with the content
     (background-position/-size are set inline from the viewport state). */
  .board-viewport {
    position: relative;
    flex: 1 1 auto;
    min-height: 0;
    overflow: hidden;
    touch-action: none;
    background-color: var(--af-paper);
    background-image: radial-gradient(circle, var(--af-rule) 1px, transparent 1px);
  }

  .board-viewport--gesturing,
  .board-viewport--gesturing * {
    user-select: none;
  }

  .board-viewport--empty {
    display: grid;
    place-items: center;
    padding: 24px;
  }

  .board-viewport:focus-visible {
    outline: none;
    box-shadow: inset var(--af-focus);
  }

  .board-content {
    position: absolute;
    left: 0;
    top: 0;
    width: max-content;
    transform-origin: 0 0;
    will-change: transform;
  }

  /* The wall is a fixed-size canvas: bands and the arrow layer are placed inside
     it at explicit coordinates, so an arrow may span several bands. */
  .wall {
    position: relative;
  }

  .band {
    position: absolute;
    display: flex;
    align-items: flex-start;
  }

  .band-canvas {
    position: relative;
    flex: 0 0 auto;
  }

  /* ---------------------------------------------------------------- slices */

  /* One causal slice: its notes framed together, read left to right.
     The frame is also the drag handle for moving the whole slice. */
  .slice {
    position: absolute;
    z-index: 1;
    border: 1px solid var(--af-rule-strong);
    border-radius: 12px;
    background: color-mix(in srgb, var(--af-paper-raised) 78%, transparent);
    box-shadow: var(--af-shadow-xs);
    cursor: grab;
  }

  .slice--selected {
    border-color: var(--af-blue);
    box-shadow:
      0 0 0 2px var(--af-blue-soft),
      var(--af-shadow-xs);
  }

  /* While a connection drag is out: everywhere it may land lights up dashed… */
  .slice--candidate {
    border: 1.5px dashed color-mix(in srgb, var(--af-blue) 55%, transparent);
  }

  /* …and the slice under the cursor confirms the landing. */
  .slice--target {
    border: 1.5px solid var(--af-blue);
    background: color-mix(in srgb, var(--af-blue-soft) 55%, transparent);
    box-shadow:
      0 0 0 3px var(--af-blue-soft),
      var(--af-shadow-sm);
  }

  /* The slice being carried by a move drag. */
  .slice--lifted {
    opacity: 0.45;
    border-style: dashed;
    cursor: grabbing;
  }

  /* Insertion bar on the side of the drop target the slice will land on. */
  .slice--insert-before::before,
  .slice--insert-after::after {
    content: '';
    position: absolute;
    top: -6px;
    bottom: -6px;
    width: 3px;
    border-radius: 2px;
    background: var(--af-blue);
  }

  .slice--insert-before::before {
    left: -10px;
  }

  .slice--insert-after::after {
    right: -10px;
  }

  /* Connection port on a slice's right edge: click continues, drag connects.
     Shown only for the hovered slice (hover is hit-tested by the element,
     with padding, so it stays up while the cursor crosses over to it). */
  .slice-port {
    position: absolute;
    z-index: 5;
    width: 26px;
    height: 26px;
    border: 1px solid var(--af-rule-strong);
    border-radius: 50%;
    background: var(--af-paper-raised);
    color: var(--af-ink-soft);
    font-size: 13px;
    line-height: 1;
    box-shadow: var(--af-shadow-xs);
    cursor: crosshair;
    opacity: 0;
    pointer-events: none;
    transition:
      opacity 120ms ease,
      border-color 120ms ease;
  }

  .slice-port--on,
  .slice-port:focus-visible {
    opacity: 1;
    pointer-events: auto;
  }

  .slice-port:hover {
    border-color: var(--af-blue);
    color: var(--af-blue);
  }

  /* Add-note chips under the hovered slice: the roles it is still missing. */
  .slice-chips {
    position: absolute;
    z-index: 6;
    display: flex;
    gap: 4px;
    padding: 2px 0;
  }

  .slice-chip {
    border: 1px dashed var(--af-rule-strong);
    border-radius: 999px;
    padding: 3px 9px;
    font-size: 10.5px;
    font-weight: 620;
    white-space: nowrap;
    color: var(--af-ink-soft);
    background: color-mix(in srgb, var(--af-paper-raised) 88%, transparent);
    cursor: pointer;
    transition:
      border-color 120ms ease,
      color 120ms ease;
  }

  .slice-chip:hover {
    border-color: var(--af-blue);
    color: var(--af-blue);
  }

  /* ------------------------------------------------------ bounded contexts */

  .context-region[data-hue='0'],
  .context-label[data-hue='0'] {
    --ctx-rgb: 51, 102, 204;
  }
  .context-region[data-hue='1'],
  .context-label[data-hue='1'] {
    --ctx-rgb: 13, 148, 136;
  }
  .context-region[data-hue='2'],
  .context-label[data-hue='2'] {
    --ctx-rgb: 174, 110, 6;
  }
  .context-region[data-hue='3'],
  .context-label[data-hue='3'] {
    --ctx-rgb: 124, 58, 237;
  }
  .context-region[data-hue='4'],
  .context-label[data-hue='4'] {
    --ctx-rgb: 190, 50, 100;
  }

  .context-region {
    position: absolute;
    z-index: 0;
    border: 1.5px dashed rgba(var(--ctx-rgb), 0.33);
    border-radius: 10px;
    background: rgba(var(--ctx-rgb), 0.05);
    pointer-events: none;
  }

  /* The label rides the region's top edge and carries the rename/dissolve UI. */
  .context-label {
    position: absolute;
    z-index: 7;
    transform: translateY(-55%);
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .context-label-name {
    border: none;
    border-radius: 999px;
    padding: 3px 10px;
    font-family: var(--af-mono);
    font-size: 9.5px;
    font-weight: 650;
    letter-spacing: 0.13em;
    text-transform: uppercase;
    white-space: nowrap;
    color: #fff;
    background: rgba(var(--ctx-rgb), 0.9);
    cursor: pointer;
    box-shadow: var(--af-shadow-xs);
  }

  .context-label-name:hover {
    background: rgba(var(--ctx-rgb), 1);
  }

  .context-label-x {
    width: 18px;
    height: 18px;
    border: none;
    border-radius: 50%;
    font-size: 9px;
    line-height: 1;
    color: rgba(var(--ctx-rgb), 0.9);
    background: color-mix(in srgb, var(--af-paper-raised) 92%, transparent);
    box-shadow: var(--af-shadow-xs);
    cursor: pointer;
    opacity: 0;
    transition: opacity 120ms ease;
  }

  .context-label:hover .context-label-x,
  .context-label-x:focus-visible {
    opacity: 1;
  }

  /* ---------------------------------------------------------------- arrows */

  .links-layer {
    position: absolute;
    inset: 0;
    /* Causality strokes are annotations drawn over the wall. */
    z-index: 4;
    pointer-events: none;
    overflow: visible;
  }

  /* Stroke must come from a stylesheet, not a presentation attribute:
     a var() inside stroke="..." is not substituted and the line stays invisible. */
  .link-path {
    fill: none;
    stroke: var(--af-ink-soft);
    stroke-width: 1.6;
    stroke-linecap: round;
    opacity: 0.6;
  }

  /* Invisible fat stroke on top of the line: a mistaken connection is easy to
     pick, and picking it never starts a wall gesture. */
  .link-hit {
    fill: none;
    stroke: transparent;
    stroke-width: 14;
    stroke-linecap: round;
    pointer-events: stroke;
    cursor: pointer;
  }

  .link-path.is-selected {
    stroke: var(--af-blue);
    stroke-width: 2.6;
    opacity: 1;
  }

  .link-label {
    font-family: var(--af-mono);
    font-size: 9px;
    letter-spacing: 0.06em;
    fill: var(--af-ink-soft);
    paint-order: stroke;
    stroke: var(--af-paper-raised);
    stroke-width: 3;
    stroke-linejoin: round;
  }

  .links-layer marker path {
    fill: var(--af-ink-soft);
    opacity: 0.75;
  }

  /* --------------------------------------------------------------- gesture */

  /* Overlays live in viewport space, above the transformed content. */
  .gesture-layer {
    position: absolute;
    inset: 0;
    z-index: 30;
    width: 100%;
    height: 100%;
    pointer-events: none;
    overflow: visible;
  }

  .connect-line {
    fill: none;
    stroke: var(--af-blue);
    stroke-width: 2;
    stroke-linecap: round;
    stroke-dasharray: 6 4;
  }

  .connect-tip {
    fill: var(--af-blue);
  }

  .select-rect {
    position: absolute;
    z-index: 30;
    border: 1px solid var(--af-blue);
    background: color-mix(in srgb, var(--af-blue-soft) 40%, transparent);
    pointer-events: none;
  }

  /* ------------------------------------------------------------ floating UI */

  .board-hud {
    position: absolute;
    left: 12px;
    bottom: 12px;
    z-index: 40;
    display: flex;
    gap: 12px;
    align-items: center;
    padding: 5px 12px;
    border: 1px solid var(--af-rule);
    border-radius: 999px;
    font-family: var(--af-mono);
    font-size: 10px;
    letter-spacing: 0.05em;
    color: var(--af-ink-faint);
    background: color-mix(in srgb, var(--af-paper-raised) 82%, transparent);
    backdrop-filter: blur(6px);
    pointer-events: none;
  }

  .board-hint {
    color: var(--af-ink-faint);
    opacity: 0.8;
  }

  .board-zoom {
    position: absolute;
    right: 12px;
    bottom: 12px;
    z-index: 40;
    display: flex;
    align-items: center;
    border: 1px solid var(--af-rule);
    border-radius: 8px;
    background: color-mix(in srgb, var(--af-paper-raised) 88%, transparent);
    backdrop-filter: blur(6px);
    box-shadow: var(--af-shadow-xs);
    overflow: hidden;
  }

  .board-zoom button {
    border: none;
    background: transparent;
    padding: 6px 10px;
    font-size: 12px;
    line-height: 1;
    color: var(--af-ink-soft);
    cursor: pointer;
  }

  .board-zoom button:hover {
    background: var(--af-blue-soft);
    color: var(--af-blue);
  }

  .board-zoom .board-zoom-pct {
    min-width: 48px;
    font-family: var(--af-mono);
    font-size: 10.5px;
  }

  .board-selection {
    position: absolute;
    left: 50%;
    bottom: 14px;
    transform: translateX(-50%);
    z-index: 45;
    display: flex;
    gap: 8px;
    align-items: center;
    padding: 8px 12px;
    border: 1px solid var(--af-rule-strong);
    border-radius: 10px;
    background: color-mix(in srgb, var(--af-paper-raised) 94%, transparent);
    backdrop-filter: blur(6px);
    box-shadow: var(--af-shadow);
  }

  .board-selection-count {
    font-family: var(--af-mono);
    font-size: 10.5px;
    color: var(--af-ink-soft);
    white-space: nowrap;
  }

  .board-selection-hint {
    font-size: 10.5px;
    color: var(--af-ink-faint);
    white-space: nowrap;
  }

  /* ----------------------------------------------------------------- empty */

  .empty {
    border: 1px dashed var(--af-rule-strong);
    border-radius: var(--af-radius-lg);
    padding: 28px 24px;
    background: var(--af-paper-raised);
    max-width: 560px;
    display: grid;
    gap: 10px;
    box-shadow: var(--af-shadow-sm);
    justify-items: start;
  }

  /* --------------------------------------------------------------- pickers */

  .context-pop {
    min-width: 220px;
  }

  /* -------------------------------------------------------- append picker */

  /* The palette travels in --es-note-bg/-ink, so a chip previews what it adds. */
  .append-menu {
    min-width: 220px;
  }

  .append-menu .type-options {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4px;
  }

  .type-chip {
    border: 1px solid rgba(0, 0, 0, 0.12);
    border-radius: 4px;
    padding: 6px 8px;
    font-size: 11px;
    font-weight: 620;
    text-align: left;
    background: var(--es-note-bg, var(--af-paper-raised));
    color: var(--es-note-ink, var(--af-ink));
    cursor: pointer;
    transition: transform 120ms ease;
  }

  .type-chip:hover {
    transform: translateY(-1px);
    box-shadow: var(--af-shadow-sm);
  }

  .link-add .af-select {
    flex: 1 1 auto;
    min-width: 0;
  }
`;
