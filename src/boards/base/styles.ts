import { css } from 'lit';

import { controls, popoverSurface, tokens } from '../../core/theme';

/**
 * Chrome every element with this shell shares, canvas or not: the toolbar
 * rows, the stats pill, and the contextual comment trigger. A document-flow
 * component (the kanban) uses this on its own; `canvasStyles` below adds what
 * only a pan/zoom canvas needs.
 */
export const chromeStyles = [
  tokens,
  controls,
  popoverSurface,
  css`
    :host {
      display: block;
      container-type: inline-size;
      /* A host page may set text-align on an ancestor (e.g. to center a
         preview stage); every diagram cell declares its own alignment, so
         this only stops that from leaking into whichever one does not. */
      text-align: start;
    }

    /* A board fills whatever a dpk-page (or any other full-screen container)
       gives it, in place of the maximize affordance embedded use relies on
       instead. */
    :host([data-dpk-page-content]) {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;
    }

    /* The panel is the board's frame: on a page-content board it takes the
       rest of the host instead of the embedded diagram height. */
    :host([data-dpk-page-content]) dpk-dialog-panel {
      flex: 1;
      min-height: 0;
      --dpk-dialog-panel-height: 100%;
    }

    .diagram-toolbar-rows {
      flex-shrink: 0;
      /* The toolbar arrives with the board rather than before it: one fade, so
         the rows it carries do not each announce themselves. */
      animation: dpk-fade-in var(--dpk-dur) var(--dpk-ease-out);
    }

    .diagram-toolbar-actions {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }

    .diagram-stats {
      font-family: var(--dpk-mono);
      font-size: 10px;
      font-weight: 550;
      padding: 3px 9px;
      border: 1px solid var(--dpk-rule);
      border-radius: 999px;
      background: var(--dpk-paper-sunken);
      color: var(--dpk-ink-faint);
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
      /* How much is on the canvas is a figure: it pops in once it is counted. */
      animation: dpk-pop var(--dpk-dur) var(--dpk-ease-spring);
    }

    /*
     * Contextual comments: an icon per element, revealed while the element that
     * contains it (or the element just before it) is hovered, focused or
     * selected, and always on touch devices. It opens the composer beside it.
     */
    .diagram-comment-trigger {
      display: grid;
      place-items: center;
      width: 28px;
      height: 28px;
      padding: 5px;
      border: 1px solid var(--dpk-rule-strong);
      border-radius: var(--dpk-radius-sm);
      background: var(--dpk-paper-raised);
      color: var(--dpk-ink-soft);
      box-shadow: var(--dpk-bevel), var(--dpk-shadow-xs);
      cursor: pointer;
      opacity: 0;
      pointer-events: none;
      transition:
        opacity var(--dpk-dur-fast) var(--dpk-ease),
        background var(--dpk-dur) var(--dpk-ease),
        color var(--dpk-dur) var(--dpk-ease),
        border-color var(--dpk-dur) var(--dpk-ease),
        box-shadow var(--dpk-dur) var(--dpk-ease),
        transform var(--dpk-dur) var(--dpk-ease-spring);
    }

    .diagram-comment-trigger.is-placed {
      position: absolute;
      z-index: 2;
    }

    .diagram-comment-trigger svg {
      width: 16px;
      height: 16px;
    }

    .diagram-edge-comment {
      overflow: visible;
    }

    .diagram-edge-comment .diagram-comment-trigger {
      margin: 2px;
    }

    :is(.d-node, .d-edge):is(:hover, :focus-within, .is-selected) .diagram-comment-trigger,
    :is(:hover, :focus-visible, .is-selected) + .diagram-comment-trigger,
    .diagram-comment-trigger:is(:hover, :focus-visible, [aria-expanded='true']) {
      opacity: 1;
      pointer-events: auto;
    }

    .diagram-comment-trigger:hover,
    .diagram-comment-trigger:focus-visible {
      color: var(--dpk-accent);
      border-color: var(--dpk-accent);
      background: var(--dpk-accent-soft);
      box-shadow: var(--dpk-bevel), var(--dpk-shadow-sm);
      transform: translateY(-1px);
    }

    .diagram-comment-trigger:focus-visible {
      outline: none;
      box-shadow: var(--dpk-focus);
    }

    @media (hover: none) {
      .diagram-comment-trigger {
        opacity: 1;
        pointer-events: auto;
      }
    }

    .comment-target {
      font-size: 12px;
      overflow-wrap: anywhere;
    }

    .comment-error {
      margin: 0;
      font-size: 11px;
      color: var(--dpk-accent);
    }
  `,
];

/**
 * What only a pan/zoom canvas needs on top of the shared chrome: the sizing
 * knob, the world box edges lay out in, the legend and empty/error notices
 * placed over the canvas, and the shared node/edge element states (selected,
 * related, dimmed).
 */
export const canvasStyles = css`
  /*
   * The shell is a panel: header, tag row, viewport. The sizing knob is
   * --diagram-height; the panel may be resized vertically, and the canvas
   * takes whatever is left of it.
   */
  .diagram {
    --dpk-dialog-panel-height: var(--diagram-height, 560px);
    --dpk-dialog-panel-min-height: 260px;
  }

  /* A board has no fixed height to fall back to: it takes all of what its
     full-screen host (e.g. dpk-page) gives it, same as any other board. */
  :host([data-dpk-page-content]) .diagram {
    --dpk-dialog-panel-height: 100%;
    flex: 1 1 0%;
    min-height: 0;
  }

  /* The world inside the viewport: its content box, which nodes and edges lay out in. */
  .diagram-world {
    position: relative;
    width: 100%;
    height: 100%;
  }

  .diagram-overlay {
    display: contents;
  }

  .diagram-edges {
    position: absolute;
    inset: 0;
    overflow: visible;
    pointer-events: none;
    /*
     * The edges are drawn after the frame they connect: one fade over the whole
     * layer, a step after the panel arrives. One animation on one element, not
     * one per edge — a plan of four hundred links must not cost four hundred
     * animations. (A true stroke draw-in is not possible from CSS alone here:
     * each board writes its own path data, so no path has a known length to
     * dash against.)
     */
    animation: dpk-fade-in var(--dpk-dur-slow) var(--dpk-ease-out) backwards;
    animation-delay: calc(var(--dpk-stagger) * 2);
  }

  .diagram-legend {
    position: absolute;
    left: 12px;
    bottom: calc(14px + var(--dpk-dock-overlap, 0px));
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    max-width: calc(100% - 240px);
    padding: 4px 8px;
    border: 1px solid var(--dpk-rule);
    border-radius: var(--dpk-radius-xs);
    background: var(--dpk-glass);
    backdrop-filter: blur(10px);
    box-shadow: var(--dpk-shadow-xs);
    font-size: 9.5px;
    color: var(--dpk-ink-faint);
    /* The key to the canvas arrives last, once there is something to read. */
    animation: dpk-rise-in var(--dpk-dur) var(--dpk-ease-out) backwards;
    animation-delay: calc(var(--dpk-stagger) * 3);
  }

  .diagram-legend span {
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }

  .diagram-legend i {
    width: 16px;
    border-top: 1.6px solid var(--dpk-rule-strong);
  }

  .diagram-empty,
  .diagram-notice {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    margin: 0;
    max-width: min(80%, 360px);
    font-size: 12px;
    color: var(--dpk-ink-faint);
    text-align: center;
    pointer-events: none;
    /* Fade only: these two are centered by a transform of their own, so an
       entrance that moved them would knock them off the canvas middle. */
    animation: dpk-fade-in var(--dpk-dur-slow) var(--dpk-ease-out) backwards;
    animation-delay: calc(var(--dpk-stagger) * 2);
  }

  .diagram-empty {
    padding: 16px 26px;
    border: 1.5px dashed var(--dpk-rule-strong);
    border-radius: var(--dpk-radius);
    background: color-mix(in srgb, var(--dpk-paper-raised) 55%, transparent);
  }

  .diagram-notice {
    pointer-events: auto;
    padding: 12px 16px 12px 19px;
    border: 1px solid color-mix(in srgb, var(--dpk-danger) 35%, transparent);
    border-radius: var(--dpk-radius);
    background: linear-gradient(90deg, var(--dpk-danger) 0 3px, transparent 3px), var(--dpk-danger-soft);
    box-shadow: var(--dpk-bevel), var(--dpk-shadow);
    color: var(--dpk-ink-soft);
    text-align: left;
  }

  .diagram-notice p {
    margin: 0 0 9px;
  }

  /* Element state, shared by every diagram so highlighting reads the same. */
  .d-node {
    position: absolute;
    cursor: pointer;
    transition:
      opacity var(--dpk-dur-fast) var(--dpk-ease),
      border-color var(--dpk-dur) var(--dpk-ease),
      box-shadow var(--dpk-dur) var(--dpk-ease),
      background var(--dpk-dur) var(--dpk-ease),
      transform var(--dpk-dur) var(--dpk-ease);
  }

  /*
   * A node lifts a hair under the pointer, as a card does — the same
   * --dpk-lift, so a board and a page of cards feel like one product. Written
   * at :where() specificity on purpose: a board that gives its own node a
   * bigger gesture (a scale, a tone, a different offset) keeps it.
   */
  :where(.d-node):hover:not(.is-dragging) {
    transform: translateY(var(--dpk-lift));
  }

  .d-node.is-dimmed,
  .d-edge.is-dimmed {
    opacity: 0.26;
  }

  /* While a node's whole-body drag has passed the movement threshold. */
  .d-node.is-dragging {
    cursor: grabbing;
    transition: none;
    z-index: 3;
  }

  .d-edge {
    outline: none;
    cursor: pointer;
  }

  /*
   * The hit area — not the <g> — is what actually takes focus (it is the
   * one with tabindex), and it spans the whole route between the two
   * tables an edge joins. Left to the UA, its default focus ring would
   * outline that whole bounding box instead of the line; the line's own
   * stroke is the feedback instead, below.
   */
  .d-edge-hit {
    outline: none;
    fill: none;
    stroke: transparent;
    stroke-width: 16;
    pointer-events: stroke;
    cursor: pointer;
  }

  .d-edge-path {
    fill: none;
    stroke: var(--dpk-rule-strong);
    stroke-width: 1.5;
    stroke-linejoin: round;
    stroke-linecap: round;
    transition:
      stroke var(--dpk-dur) var(--dpk-ease),
      stroke-width var(--dpk-dur) var(--dpk-ease);
  }

  .d-edge.is-selected .d-edge-path,
  .d-edge:has(.d-edge-hit:focus-visible) .d-edge-path {
    stroke: var(--dpk-ink);
    stroke-width: 2.6;
  }

  .d-edge:has(.d-edge-hit:focus-visible) .d-edge-hit {
    stroke: var(--dpk-blue-soft);
  }

  .d-edge-label {
    font-size: 9.5px;
    fill: var(--dpk-ink-faint);
    paint-order: stroke;
    stroke: var(--dpk-paper-raised);
    stroke-width: 5px;
    stroke-linejoin: round;
  }

  .d-edge-label.is-dimmed {
    opacity: 0.3;
  }
`;

/**
 * Shared diagram chrome on top of the panel (a canvas) and tag filter elements:
 * the stats, world, legend, empty state and the contextual comment trigger and
 * composer. Components add their own node/edge styling on top and only
 * use the `.is-*` state classes defined here.
 */
export const diagramStyles = [...chromeStyles, canvasStyles];
