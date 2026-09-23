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
      border: 1px solid var(--af-rule);
      border-radius: var(--af-radius-lg);
      background: var(--af-paper-raised);
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
      color: var(--af-ink);
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
      min-height: 42px;
      padding: 7px 12px;
      border-bottom: 1px solid var(--af-rule);
      background: linear-gradient(180deg, var(--af-paper-raised), var(--af-paper));
      flex-shrink: 0;
    }

    .diagram-title {
      font-size: 12.5px;
      font-weight: 620;
      letter-spacing: -0.01em;
    }

    .diagram-subject {
      font-size: 10px;
      color: var(--af-ink-faint);
      padding-left: 10px;
      border-left: 1px solid var(--af-rule-strong);
    }

    .diagram-toolbar-actions {
      display: flex;
      align-items: center;
      gap: 5px;
      margin-left: auto;
      flex-wrap: wrap;
    }

    .diagram-stats {
      font-family: var(--af-mono);
      font-size: 10px;
      color: var(--af-ink-faint);
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }

    .diagram-tags {
      display: flex;
      align-items: center;
      gap: 4px;
      flex-wrap: wrap;
      padding: 6px 12px;
      border-bottom: 1px solid var(--af-rule);
      background: var(--af-paper);
      flex-shrink: 0;
    }

    .diagram-match {
      display: flex;
      gap: 1px;
      padding: 2px;
      margin-right: 5px;
      border: 1px solid var(--af-rule-strong);
      border-radius: var(--af-radius-xs);
    }

    .diagram-match button {
      border: 0;
      border-radius: 3px;
      padding: 3px 6px;
      background: transparent;
      color: var(--af-ink-faint);
      font-size: 9.5px;
      cursor: pointer;
    }

    .diagram-match button[aria-pressed='true'] {
      background: var(--af-blue-soft);
      color: var(--af-blue);
      font-weight: 650;
    }

    .af-tag {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 4px 8px;
      border: 1px solid transparent;
      border-radius: var(--af-radius-xs);
      background: var(--af-paper-inset);
      color: var(--af-ink-soft);
      font-size: 10.5px;
      cursor: pointer;
    }

    .af-tag:hover {
      background: var(--af-paper-sunken);
      color: var(--af-ink);
    }

    .af-tag[aria-pressed='true'] {
      border-color: color-mix(in srgb, var(--af-blue) 40%, transparent);
      background: var(--af-blue-soft);
      color: var(--af-blue);
      font-weight: 600;
    }

    .af-tag-count {
      font-family: var(--af-mono);
      font-size: 9px;
      opacity: 0.7;
      font-variant-numeric: tabular-nums;
    }

    .af-tag-clear {
      border: 0;
      background: none;
      padding: 4px 6px;
      color: var(--af-ink-faint);
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
      background-color: var(--af-paper-raised);
      background-image: radial-gradient(var(--af-rule-strong) 0.7px, transparent 0.7px);
      background-size: 22px 22px;
    }

    .diagram-canvas:focus-visible {
      outline: none;
      box-shadow: inset var(--af-focus);
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
      border: 1px solid var(--af-rule-strong);
      border-radius: var(--af-radius-sm);
      background: var(--af-paper-raised);
      box-shadow: var(--af-shadow-sm);
    }

    .diagram-zoom button {
      border: 0;
      border-radius: 0;
      padding: 6px 9px;
      background: transparent;
      font-size: 10.5px;
      cursor: pointer;
    }

    .diagram-zoom button:hover {
      background: var(--af-paper-sunken);
    }

    .diagram-legend {
      position: absolute;
      left: 12px;
      bottom: 14px;
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      max-width: calc(100% - 150px);
      padding: 3px 6px;
      border-radius: var(--af-radius-xs);
      background: color-mix(in srgb, var(--af-paper-raised) 88%, transparent);
      font-size: 9.5px;
      color: var(--af-ink-faint);
    }

    .diagram-legend span {
      display: inline-flex;
      align-items: center;
      gap: 5px;
    }

    .diagram-legend i {
      width: 16px;
      border-top: 1.6px solid var(--af-rule-strong);
    }

    .diagram-empty,
    .diagram-notice {
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      margin: 0;
      font-size: 12px;
      color: var(--af-ink-faint);
      text-align: center;
      pointer-events: none;
    }

    .diagram-notice {
      pointer-events: auto;
      padding: 12px 16px;
      border: 1px solid var(--af-rule-strong);
      border-radius: var(--af-radius);
      background: var(--af-paper-raised);
      box-shadow: var(--af-shadow-sm);
      color: var(--af-ink-soft);
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
      border: 1px solid var(--af-rule-strong);
      border-radius: var(--af-radius-sm);
      background: var(--af-paper-raised);
      color: var(--af-ink-soft);
      box-shadow: var(--af-shadow-xs);
      cursor: pointer;
      opacity: 0;
      pointer-events: none;
      transition: opacity 120ms ease;
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
      color: var(--af-accent);
      border-color: var(--af-accent);
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
      color: var(--af-accent);
    }

    /* Element state, shared by every diagram so highlighting reads the same. */
    .d-node {
      position: absolute;
      cursor: pointer;
      transition:
        opacity 150ms ease,
        border-color 150ms ease,
        box-shadow 150ms ease;
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
      stroke: var(--af-rule-strong);
      stroke-width: 1.5;
      stroke-linejoin: round;
    }

    .d-edge.is-selected .d-edge-path,
    .d-edge:focus-visible .d-edge-path {
      stroke: var(--af-ink);
      stroke-width: 2.4;
    }

    .d-edge:focus-visible .d-edge-hit {
      stroke: var(--af-blue-soft);
    }

    .d-edge-label {
      font-size: 9.5px;
      fill: var(--af-ink-faint);
      paint-order: stroke;
      stroke: var(--af-paper-raised);
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
