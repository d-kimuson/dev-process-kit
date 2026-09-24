import { css } from 'lit';

import { controls, popoverSurface, tokens } from '../../core/theme';

/**
 * Shared diagram chrome: shell, toolbar, tag row, canvas, world, zoom, legend
 * and the contextual comment trigger and composer. Components add their own node/edge styling on top and only
 * use the `.is-*` state classes defined here.
 */
export const diagramStyles = [
  tokens,
  controls,
  popoverSurface,
  css`
    :host {
      display: block;
      container-type: inline-size;
    }

    .diagram {
      display: flex;
      flex-direction: column;
      /* The sizing knob: the shell may be resized vertically, and the canvas
         takes whatever is left of it. */
      height: var(--diagram-height, 560px);
      min-height: 260px;
      border: 1px solid var(--dpk-rule);
      border-radius: var(--dpk-radius-lg);
      background: var(--dpk-paper-raised);
      box-shadow: var(--dpk-bevel), var(--dpk-shadow-sm);
      overflow: hidden;
      resize: vertical;
    }

    /*
     * Maximized: the shell covers the viewport. It is also a manual popover in
     * the top layer, so the UA popover box (fit-content, margin, border,
     * padding) is reset here. A vertical resize leaves an inline height behind,
     * which only !important overrides.
     */
    .diagram.is-maximized {
      position: fixed;
      inset: 0;
      z-index: 2147483000;
      width: auto !important;
      height: auto !important;
      max-width: none;
      max-height: none;
      margin: 0;
      padding: 0;
      border: 0;
      border-radius: 0;
      color: var(--dpk-ink);
      background:
        radial-gradient(
          ellipse 900px 400px at 0% 0%,
          color-mix(in srgb, var(--dpk-accent) 4%, transparent),
          transparent 70%
        ),
        var(--dpk-paper-raised);
      box-shadow: none;
      resize: none;
    }

    .diagram-maximize {
      flex-shrink: 0;
    }

    .diagram-toolbar {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
      min-height: 44px;
      padding: 8px 14px;
      border-bottom: 1px solid var(--dpk-rule);
      background: linear-gradient(180deg, var(--dpk-paper-raised), var(--dpk-paper));
      box-shadow: 0 1px 0 var(--dpk-highlight) inset;
      flex-shrink: 0;
    }

    .diagram-title {
      font-family: var(--dpk-display);
      font-size: 12.5px;
      font-weight: 660;
      letter-spacing: -0.015em;
      color: var(--dpk-ink);
    }

    .diagram-subject {
      font-size: 10px;
      color: var(--dpk-ink-faint);
      padding-left: 10px;
      border-left: 1px solid var(--dpk-rule-strong);
    }

    .diagram-toolbar-actions {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-left: auto;
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
    }

    .diagram-tags {
      display: flex;
      align-items: center;
      gap: 5px;
      flex-wrap: wrap;
      padding: 7px 12px;
      border-bottom: 1px solid var(--dpk-rule);
      background: var(--dpk-paper);
      flex-shrink: 0;
    }

    .diagram-match {
      display: flex;
      gap: 2px;
      padding: 3px;
      margin-right: 6px;
      border: 1px solid var(--dpk-rule);
      border-radius: var(--dpk-radius-sm);
      background: var(--dpk-paper-sunken);
      box-shadow: inset 0 1px 2px var(--dpk-shade-1);
    }

    .diagram-match button {
      border: 0;
      border-radius: var(--dpk-radius-xs);
      padding: 4px 8px;
      background: transparent;
      color: var(--dpk-ink-faint);
      font-size: 9.5px;
      font-weight: 600;
      letter-spacing: 0.01em;
      cursor: pointer;
      transition:
        background 160ms var(--dpk-ease),
        color 160ms var(--dpk-ease),
        box-shadow 160ms var(--dpk-ease);
    }

    .diagram-match button:hover[aria-pressed='false'] {
      color: var(--dpk-ink-soft);
    }

    .diagram-match button[aria-pressed='true'] {
      background: var(--dpk-paper-raised);
      color: var(--dpk-ink);
      font-weight: 650;
      box-shadow: var(--dpk-bevel), var(--dpk-shadow-xs);
    }

    .dpk-tag {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 4px 9px;
      border: 1px solid transparent;
      border-radius: var(--dpk-radius-xs);
      background: var(--dpk-paper-inset);
      color: var(--dpk-ink-soft);
      font-size: 10.5px;
      cursor: pointer;
      transition:
        background 140ms var(--dpk-ease),
        color 140ms var(--dpk-ease),
        border-color 140ms var(--dpk-ease),
        box-shadow 140ms var(--dpk-ease);
    }

    .dpk-tag:hover {
      background: var(--dpk-paper-sunken);
      color: var(--dpk-ink);
    }

    .dpk-tag[aria-pressed='true'] {
      border-color: color-mix(in srgb, var(--dpk-blue) 45%, transparent);
      background: var(--dpk-blue-soft);
      color: var(--dpk-blue);
      font-weight: 600;
      box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--dpk-blue) 20%, transparent);
    }

    .dpk-tag-count {
      font-family: var(--dpk-mono);
      font-size: 9px;
      opacity: 0.7;
      font-variant-numeric: tabular-nums;
    }

    .dpk-tag-clear {
      border: 0;
      background: none;
      padding: 4px 6px;
      color: var(--dpk-ink-faint);
      font-size: 10px;
      cursor: pointer;
    }

    .diagram-canvas {
      position: relative;
      flex: 1;
      min-height: 220px;
      overflow: hidden;
      touch-action: none;
      cursor: grab;
      background: var(--dpk-dots), var(--dpk-paper-sunken);
    }

    .diagram-canvas:focus-visible {
      outline: none;
      box-shadow: inset var(--dpk-focus);
    }

    .diagram-canvas.is-panning {
      cursor: grabbing;
    }

    .diagram-world {
      position: absolute;
      inset: 0 auto auto 0;
      transform-origin: 0 0;
    }

    .diagram-edges {
      position: absolute;
      inset: 0;
      overflow: visible;
      pointer-events: none;
    }

    .diagram-zoom {
      position: absolute;
      right: 12px;
      bottom: 12px;
      display: flex;
      overflow: hidden;
      border: 1px solid var(--dpk-rule-strong);
      border-radius: var(--dpk-radius-sm);
      background: var(--dpk-glass);
      backdrop-filter: blur(12px);
      box-shadow: var(--dpk-bevel), var(--dpk-shadow-sm);
    }

    .diagram-zoom button {
      border: 0;
      border-radius: 0;
      padding: 6px 9px;
      background: transparent;
      color: var(--dpk-ink-soft);
      font-size: 10.5px;
      cursor: pointer;
      transition:
        background 140ms var(--dpk-ease),
        color 140ms var(--dpk-ease);
    }

    .diagram-zoom button + button {
      border-left: 1px solid var(--dpk-rule);
    }

    .diagram-zoom button:hover {
      background: var(--dpk-paper-inset);
      color: var(--dpk-ink);
    }

    .diagram-zoom-value {
      font-family: var(--dpk-mono);
      font-variant-numeric: tabular-nums;
    }

    .diagram-legend {
      position: absolute;
      left: 12px;
      bottom: 14px;
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      max-width: calc(100% - 150px);
      padding: 4px 8px;
      border: 1px solid var(--dpk-rule);
      border-radius: var(--dpk-radius-xs);
      background: var(--dpk-glass);
      backdrop-filter: blur(10px);
      box-shadow: var(--dpk-shadow-xs);
      font-size: 9.5px;
      color: var(--dpk-ink-faint);
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
        opacity 120ms ease,
        background 160ms var(--dpk-ease),
        color 160ms var(--dpk-ease),
        border-color 160ms var(--dpk-ease),
        box-shadow 160ms var(--dpk-ease),
        transform 160ms var(--dpk-ease-spring);
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

    /* Element state, shared by every diagram so highlighting reads the same. */
    .d-node {
      position: absolute;
      cursor: pointer;
      transition:
        opacity 150ms ease,
        border-color 160ms var(--dpk-ease),
        box-shadow 160ms var(--dpk-ease),
        background 160ms var(--dpk-ease),
        transform 160ms var(--dpk-ease);
    }

    .d-node.is-dimmed,
    .d-edge.is-dimmed {
      opacity: 0.26;
    }

    .d-edge {
      outline: none;
      cursor: pointer;
    }

    .d-edge-hit {
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
        stroke 160ms var(--dpk-ease),
        stroke-width 160ms var(--dpk-ease);
    }

    .d-edge.is-selected .d-edge-path,
    .d-edge:focus-visible .d-edge-path {
      stroke: var(--dpk-ink);
      stroke-width: 2.6;
    }

    .d-edge:focus-visible .d-edge-hit {
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

    @media (max-width: 700px) {
      .diagram-subject {
        display: none;
      }
    }
  `,
];
