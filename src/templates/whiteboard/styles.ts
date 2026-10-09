import { css } from 'lit';

/** Canvas, items and chrome of `<dpk-template-whiteboard>`. */
export const whiteboardStyles = css`
  /* The board owns the whole main area; the canvas clips, never the shell. */
  .dpk-main {
    overflow: hidden;
  }

  .dpk-main-body {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
    padding: 0;
    gap: 0;
  }

  /* ---------------------------------------------------------------- canvas */

  .wb-canvas {
    position: relative;
    flex: 1 1 auto;
    min-height: 0;
    overflow: hidden;
    touch-action: none;
    background: var(--dpk-dots), var(--dpk-paper-sunken);
    cursor: default;
    outline: none;
  }

  .wb-canvas:focus-visible {
    box-shadow: inset var(--dpk-focus);
  }

  /* Space held (or a pan under way): the whole board, items included, is a handle. */
  .wb-canvas--pan-ready,
  .wb-canvas--pan-ready .wb-item,
  .wb-canvas--pan-ready .wb-frame-title {
    cursor: grab;
  }

  .wb-canvas--panning,
  .wb-canvas--panning .wb-item {
    cursor: grabbing;
  }

  .wb-canvas--gesturing,
  .wb-canvas--gesturing * {
    user-select: none;
  }

  .wb-canvas--connecting .wb-item {
    cursor: crosshair;
  }

  /* Items are things to pick up, not text to select: a press on the board
     never starts a text selection. Only the in-place editor takes one. */
  .wb-world {
    -webkit-user-select: none;
    user-select: none;
    position: absolute;
    left: 0;
    top: 0;
    width: 0;
    height: 0;
    transform-origin: 0 0;
    will-change: transform;
  }

  /* ----------------------------------------------------------------- items */

  .wb-item {
    position: absolute;
    box-sizing: border-box;
    display: flex;
    cursor: grab;
  }

  .wb-item-body {
    flex: 1 1 auto;
    min-width: 0;
    min-height: 0;
    display: flex;
    overflow: hidden;
  }

  .wb-text {
    flex: 1 1 auto;
    min-width: 0;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  /* The in-place editor is a bare field over the item's whole body, typeset
     exactly like the text it replaces, so starting an edit moves nothing. */
  .wb-editor {
    flex: 1 1 auto;
    display: block;
    box-sizing: border-box;
    width: 100%;
    min-width: 0;
    align-self: stretch;
    margin: 0;
    padding: 0;
    border: none;
    border-radius: 0;
    outline: none;
    background: transparent;
    color: inherit;
    font: inherit;
    letter-spacing: inherit;
    text-align: inherit;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    resize: none;
    overflow: auto;
    scrollbar-width: none;
    -webkit-user-select: text;
    user-select: text;
  }

  .wb-editor::placeholder {
    color: currentColor;
    opacity: 0.45;
  }

  /* A shape centers its text, so the field grows with the text and stays centered. */
  .wb-item--shape .wb-editor {
    align-self: center;
    max-height: 100%;
    field-sizing: content;
  }

  .wb-title-edit {
    position: relative;
    display: block;
  }

  .wb-title-edit > .wb-text {
    display: block;
    visibility: hidden;
    white-space: pre;
  }

  .wb-title-edit > .wb-text::before {
    content: attr(data-copy);
  }

  /* A hair wider than the copy, so the caret at the end never scrolls the text. */
  .wb-title-edit > .wb-editor {
    position: absolute;
    inset: 0 -2px 0 0;
    width: auto;
    white-space: nowrap;
    overflow: hidden;
  }

  .wb-item.is-editing {
    cursor: text;
  }

  .wb-item.is-lifted {
    cursor: grabbing;
    opacity: 0.88;
  }

  .wb-item.is-selected::before,
  .wb-item.is-target::before {
    content: '';
    position: absolute;
    inset: calc(-4px / var(--wb-zoom, 1));
    border: calc(2px / var(--wb-zoom, 1)) solid var(--dpk-blue);
    border-radius: 6px;
    pointer-events: none;
  }

  .wb-item.is-target::before {
    border-style: dashed;
    background: color-mix(in srgb, var(--dpk-blue) 8%, transparent);
  }

  /* Sticky: colored paper with a soft lift. It keeps its color in both themes. */
  .wb-item--sticky {
    padding: 16px 14px;
    border-radius: 3px;
    background: linear-gradient(170deg, rgba(255, 255, 255, 0.28), rgba(255, 255, 255, 0) 45%), var(--wb-paper);
    color: var(--wb-ink);
    font-size: calc(15px * var(--wb-font-scale, 1));
    font-weight: 560;
    line-height: 1.35;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.35),
      0 1px 2px rgba(30, 24, 10, 0.14),
      0 8px 14px -8px rgba(30, 24, 10, 0.32);
  }

  .wb-item--sticky .wb-item-body {
    align-items: flex-start;
  }

  /* Text: no box at all, just type on the board. */
  .wb-item--text {
    padding: 4px 6px;
    color: var(--dpk-ink);
    font-size: calc(20px * var(--wb-font-scale, 1));
    font-weight: 650;
    line-height: 1.3;
    letter-spacing: -0.01em;
  }

  /* Shape: the color's stroke around a tint of it, text centered. */
  .wb-item--shape {
    padding: 10px 14px;
    border: 2px solid var(--wb-stroke);
    border-radius: 8px;
    background: color-mix(in srgb, var(--wb-stroke) 16%, var(--dpk-paper-raised));
    color: var(--dpk-ink);
    font-size: calc(14px * var(--wb-font-scale, 1));
    font-weight: 600;
    line-height: 1.35;
    text-align: center;
  }

  .wb-item--ellipse {
    border-radius: 50%;
    padding: 14px 22px;
  }

  .wb-item--shape .wb-item-body {
    align-items: center;
    justify-content: center;
  }

  /* Frame: a titled area drawn behind everything; its title is a handle.
     A click on its empty inside selects it; a drag there draws a selection
     area, or moves the frame once it is selected. */
  .wb-item--frame {
    border: 1.5px solid color-mix(in srgb, var(--wb-stroke) 55%, transparent);
    border-radius: 10px;
    background: color-mix(in srgb, var(--wb-stroke) 7%, transparent);
    cursor: default;
  }

  /* Selected, the whole frame is a handle. */
  .wb-item--frame.is-selected {
    cursor: grab;
  }

  .wb-frame-title {
    position: absolute;
    left: -1px;
    bottom: 100%;
    max-width: 100%;
    margin-bottom: 6px;
    padding: 3px 10px;
    border-radius: 6px;
    background: color-mix(in srgb, var(--wb-stroke) 20%, var(--dpk-paper-raised));
    color: var(--dpk-ink);
    font-size: 13px;
    font-weight: 700;
    line-height: 1.3;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    cursor: grab;
  }

  .wb-item--frame.is-editing .wb-frame-title {
    overflow: visible;
    cursor: text;
  }

  /* Comments already left: a corner flag, readable at a glance. */
  .wb-flag {
    position: absolute;
    top: -8px;
    right: -8px;
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    box-sizing: border-box;
    border-radius: 999px;
    background: var(--dpk-accent);
    color: var(--dpk-accent-ink);
    font-family: var(--dpk-mono);
    font-size: 10px;
    font-weight: 650;
    line-height: 18px;
    text-align: center;
    pointer-events: none;
  }

  .wb-flag--inline {
    position: static;
    margin-left: 6px;
  }

  /* Selection handles keep their screen size at any zoom. */
  .wb-handle {
    position: absolute;
    z-index: 2;
    box-sizing: border-box;
    width: calc(12px / var(--wb-zoom, 1));
    height: calc(12px / var(--wb-zoom, 1));
    border: calc(2px / var(--wb-zoom, 1)) solid var(--dpk-blue);
    background: var(--dpk-paper-raised);
  }

  .wb-handle--resize {
    right: calc(-7px / var(--wb-zoom, 1));
    bottom: calc(-7px / var(--wb-zoom, 1));
    border-radius: 3px;
    cursor: nwse-resize;
  }

  .wb-handle--connect {
    top: 50%;
    right: calc(-22px / var(--wb-zoom, 1));
    width: calc(14px / var(--wb-zoom, 1));
    height: calc(14px / var(--wb-zoom, 1));
    border-radius: 50%;
    transform: translateY(-50%);
    background: var(--dpk-blue);
    cursor: crosshair;
  }

  /* A selection area being dragged out, in screen space over the board. */
  .wb-marquee {
    position: absolute;
    z-index: 35;
    box-sizing: border-box;
    border: 1px solid var(--dpk-blue);
    border-radius: 2px;
    background: color-mix(in srgb, var(--dpk-blue) 10%, transparent);
    pointer-events: none;
  }

  /* ------------------------------------------------------------ connectors */

  .wb-links {
    position: absolute;
    left: 0;
    top: 0;
    overflow: visible;
    pointer-events: none;
  }

  .wb-links marker path {
    fill: var(--dpk-ink-soft);
  }

  .wb-link {
    fill: none;
    stroke: var(--dpk-ink-soft);
    stroke-width: 2;
    stroke-linecap: round;
  }

  .wb-link.is-selected {
    stroke: var(--dpk-blue);
    stroke-width: 3;
  }

  .wb-link--draft {
    stroke: var(--dpk-blue);
    stroke-dasharray: 6 5;
  }

  .wb-link-hit {
    fill: none;
    stroke: transparent;
    stroke-width: 14;
    pointer-events: stroke;
    cursor: pointer;
  }

  .wb-link-label {
    position: absolute;
    transform: translate(-50%, -50%);
    max-width: 180px;
    padding: 2px 8px;
    border: 1px solid var(--dpk-rule);
    border-radius: 999px;
    background: var(--dpk-paper-raised);
    color: var(--dpk-ink-soft);
    font-size: 12px;
    line-height: 1.4;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    cursor: pointer;
  }

  .wb-link-label.is-selected {
    border-color: var(--dpk-blue);
    color: var(--dpk-blue);
  }

  /* ----------------------------------------------------------------- chrome */

  .wb-hint {
    position: absolute;
    left: 50%;
    top: 16px;
    z-index: 30;
    transform: translateX(-50%);
    margin: 0;
    padding: 6px 14px;
    border: 1px solid var(--dpk-rule);
    border-radius: 999px;
    background: var(--dpk-glass);
    backdrop-filter: blur(12px);
    color: var(--dpk-ink-soft);
    font-size: 12.5px;
    pointer-events: none;
  }

  .wb-hint--empty {
    top: 50%;
    transform: translate(-50%, -50%);
  }

  .wb-tools,
  .wb-zoom,
  .wb-toolbar {
    position: absolute;
    z-index: 40;
    display: flex;
    align-items: center;
    border: 1px solid var(--dpk-rule);
    border-radius: var(--dpk-radius);
    background: var(--dpk-glass);
    backdrop-filter: blur(12px);
    box-shadow: var(--dpk-bevel), var(--dpk-shadow-sm);
  }

  .wb-tools {
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    flex-direction: column;
    gap: 2px;
    padding: 4px;
  }

  .wb-tool {
    display: grid;
    place-items: center;
    width: 34px;
    height: 34px;
    border: none;
    border-radius: var(--dpk-radius-sm);
    background: transparent;
    cursor: pointer;
  }

  .wb-tool:hover,
  .wb-tool:focus-visible {
    background: var(--dpk-blue-soft);
  }

  .wb-tool-icon {
    display: block;
    box-sizing: border-box;
  }

  .wb-tool-icon--sticky {
    width: 18px;
    height: 18px;
    border-radius: 2px;
    background: #ffe27a;
    box-shadow: 0 1px 2px rgba(30, 24, 10, 0.3);
  }

  .wb-tool-icon--text::before {
    content: 'T';
    color: var(--dpk-ink);
    font-family: var(--dpk-display);
    font-size: 18px;
    font-weight: 700;
  }

  .wb-tool-icon--rect,
  .wb-tool-icon--ellipse {
    width: 20px;
    height: 14px;
    border: 2px solid var(--dpk-ink-soft);
    border-radius: 3px;
  }

  .wb-tool-icon--ellipse {
    border-radius: 50%;
  }

  .wb-tool-icon--frame {
    width: 20px;
    height: 16px;
    border: 1.5px dashed var(--dpk-ink-soft);
    border-radius: 3px;
  }

  .wb-zoom {
    right: 12px;
    bottom: 12px;
    overflow: hidden;
  }

  .wb-zoom button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: transparent;
    padding: 6px 10px;
    font-size: 12px;
    line-height: 1;
    color: var(--dpk-ink-soft);
    cursor: pointer;
  }

  .wb-zoom button svg {
    width: 13px;
    height: 13px;
  }

  .wb-zoom button:hover {
    background: var(--dpk-blue-soft);
    color: var(--dpk-blue);
  }

  .wb-zoom-pct {
    min-width: 48px;
    font-family: var(--dpk-mono);
  }

  /* The floating toolbar over the selection. */
  .wb-toolbar {
    transform: translate(-50%, -100%);
    translate: var(--wb-nudge-x, 0) var(--wb-nudge-y, 0);
    gap: 2px;
    padding: 4px;
    white-space: nowrap;
  }

  .wb-toolbar-btn {
    position: relative;
  }

  .wb-toolbar-count {
    position: absolute;
    top: -4px;
    right: -4px;
    min-width: 14px;
    height: 14px;
    border-radius: 999px;
    background: var(--dpk-accent);
    color: var(--dpk-accent-ink);
    font-family: var(--dpk-mono);
    font-size: 9px;
    line-height: 14px;
    text-align: center;
  }

  .wb-toolbar-sep {
    width: 1px;
    height: 18px;
    margin: 0 4px;
    background: var(--dpk-rule);
  }

  .wb-toolbar-label {
    min-width: 120px;
    padding: 0 6px;
    font-size: 12.5px;
  }

  /* A segmented choice (text size, line shape): a sunken track, the current
     option raised out of it. */
  .wb-choice {
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 2px;
    border-radius: var(--dpk-radius-sm);
    background: var(--dpk-paper-inset);
  }

  .wb-choice-btn {
    display: grid;
    place-items: center;
    min-width: 28px;
    height: 24px;
    padding: 0 6px;
    border: none;
    border-radius: var(--dpk-radius-xs);
    background: transparent;
    color: var(--dpk-ink-soft);
    font-family: inherit;
    font-size: 11.5px;
    font-weight: 650;
    letter-spacing: 0.02em;
    line-height: 1;
    cursor: pointer;
    transition:
      background 140ms var(--dpk-ease),
      color 140ms var(--dpk-ease),
      box-shadow 140ms var(--dpk-ease);
  }

  .wb-choice-btn--icon {
    padding: 0;
  }

  .wb-choice-btn svg {
    display: block;
    width: 16px;
    height: 16px;
  }

  .wb-choice-btn:hover {
    color: var(--dpk-ink);
  }

  .wb-choice-btn:focus-visible {
    outline: none;
    box-shadow: var(--dpk-focus);
  }

  .wb-choice-btn[aria-checked='true'] {
    background: var(--dpk-paper-raised);
    color: var(--dpk-blue-strong);
    box-shadow:
      0 0 0 0.5px var(--dpk-rule),
      0 1px 2px rgba(15, 23, 42, 0.12);
  }

  /* Stacking order: a button that drops a menu of named moves. */
  .wb-menu-anchor {
    position: relative;
    display: flex;
  }

  .wb-menu-btn {
    display: inline-flex;
    align-items: center;
    gap: 1px;
    height: 26px;
    padding: 0 4px 0 6px;
    border: none;
    border-radius: var(--dpk-radius-xs);
    background: transparent;
    color: var(--dpk-ink-soft);
    cursor: pointer;
  }

  .wb-menu-btn svg {
    display: block;
    width: 15px;
    height: 15px;
  }

  .wb-menu-btn svg:last-child {
    width: 11px;
    height: 11px;
    opacity: 0.7;
  }

  .wb-menu-btn:hover,
  .wb-menu-btn[aria-expanded='true'] {
    background: var(--dpk-paper-inset);
    color: var(--dpk-ink);
  }

  .wb-menu-btn:focus-visible {
    outline: none;
    box-shadow: var(--dpk-focus);
  }

  /* Opens toward the toolbar's middle: its button sits near the right end. */
  .wb-menu {
    position: absolute;
    right: 0;
    top: calc(100% + 8px);
    z-index: 1;
    display: flex;
    flex-direction: column;
    min-width: 200px;
    padding: 4px;
    border: 1px solid var(--dpk-rule);
    border-radius: var(--dpk-radius);
    background: var(--dpk-paper-raised);
    box-shadow: var(--dpk-bevel), var(--dpk-shadow);
  }

  .wb-menu-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 7px 8px;
    border: none;
    border-radius: var(--dpk-radius-xs);
    background: transparent;
    color: var(--dpk-ink);
    font: inherit;
    font-size: 12.5px;
    text-align: left;
    cursor: pointer;
  }

  .wb-menu-item svg {
    flex: none;
    width: 15px;
    height: 15px;
    color: var(--dpk-ink-soft);
  }

  .wb-menu-item:hover:not([disabled]),
  .wb-menu-item:focus-visible {
    outline: none;
    background: var(--dpk-blue-soft);
  }

  .wb-menu-item[disabled] {
    color: var(--dpk-ink-faint);
    cursor: default;
  }

  .wb-menu-item[disabled] svg {
    opacity: 0.5;
  }

  .wb-menu-label {
    flex: 1 1 auto;
  }

  .wb-menu-key {
    color: var(--dpk-ink-faint);
    font-family: var(--dpk-mono);
    font-size: 10.5px;
  }

  .wb-swatches {
    display: flex;
    gap: 3px;
    padding: 0 2px;
  }

  .wb-swatch {
    width: 18px;
    height: 18px;
    padding: 0;
    border: 2px solid color-mix(in srgb, var(--wb-stroke) 70%, transparent);
    border-radius: 50%;
    background: var(--wb-paper);
    cursor: pointer;
  }

  .wb-swatch[aria-checked='true'] {
    outline: 2px solid var(--dpk-blue);
    outline-offset: 1px;
  }

  /* --------------------------------------------------------------- sidebar */

  .wb-frames {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 14px 12px;
  }

  .wb-frames p {
    margin: 0;
  }

  .wb-frames-hint {
    color: var(--dpk-ink-faint);
    font-size: 11.5px;
  }

  .wb-frames ul {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin: 6px 0 0;
    padding: 0;
    list-style: none;
  }

  .wb-frame-link {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 6px 8px;
    border: none;
    border-radius: var(--dpk-radius-sm);
    background: transparent;
    color: var(--dpk-ink);
    font: inherit;
    font-size: 13px;
    text-align: left;
    cursor: pointer;
  }

  .wb-frame-link:hover {
    background: var(--dpk-blue-soft);
  }

  .wb-frame-link[aria-current='true'] {
    background: color-mix(in srgb, var(--dpk-blue-soft) 80%, transparent);
    color: var(--dpk-blue-strong);
    font-weight: 650;
  }

  .wb-frame-dot {
    flex: none;
    width: 10px;
    height: 10px;
    border-radius: 3px;
    background: var(--wb-stroke);
  }

  .wb-frame-dot--board {
    border: 1.5px dashed var(--dpk-ink-faint);
    background: transparent;
  }

  .wb-frame-name {
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .wb-frame-count {
    flex: none;
    color: var(--dpk-ink-faint);
    font-family: var(--dpk-mono);
    font-size: 10.5px;
  }
`;
