import { css } from 'lit';

import { CONTAINED_DIALOG } from '../../lib/dom/contained-dialog';

/** Sidebar navigation, stage and preview frames of `<dpk-view-prototype>`. */
export const prototypeStyles = css`
  :host {
    --dpk-prototype-accent: var(--dpk-blue);
  }

  /* ---------------------------------------------------------------- sidebar */

  .nav {
    display: grid;
    gap: 14px;
    align-content: start;
    min-width: 188px;
  }

  .field {
    display: grid;
    gap: 5px;
  }

  /* Scenario or app: the segmented atom, stretched across the top of the sidebar. */
  .view-switch {
    display: flex;
  }

  .view-option {
    flex: 1 1 0;
    text-align: center;
  }

  .app-hint {
    margin: -6px 0 0;
    font-size: 11.5px;
    line-height: 1.55;
    color: var(--dpk-ink-faint);
  }

  .app-group {
    display: grid;
    gap: 4px;
  }

  .app-group-heading {
    margin: 0;
    padding-left: 9px;
    font-size: 11px;
    font-weight: 600;
    color: var(--dpk-ink-soft);
  }

  .app-description {
    margin: 2px 0 0;
    font-size: 11.5px;
    line-height: 1.5;
    color: var(--dpk-ink-faint);
  }

  .step-screen {
    color: var(--dpk-ink);
    font-size: 12.5px;
    font-weight: 550;
  }

  .screen-description {
    font-size: 12.5px;
    line-height: 1.6;
    color: var(--dpk-ink);
  }

  .app-tree {
    display: grid;
    gap: 4px;
  }

  .app-origin {
    margin: 0;
    padding-left: 9px;
    font-family: var(--dpk-mono);
    font-size: 10.5px;
    font-weight: 500;
    color: var(--dpk-ink-faint);
    overflow-wrap: anywhere;
  }

  .tree {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 2px;
  }

  /* A path below another one is indented under it, with a guide line. */
  .tree .tree {
    margin-left: 14px;
    padding-left: 6px;
    border-left: 1px solid var(--dpk-rule);
  }

  .tree-node {
    display: grid;
    gap: 2px;
  }

  .tree-row {
    position: relative;
    border-radius: var(--dpk-radius-sm);
    transition: background 140ms ease;
  }

  .tree-row:has(a):hover {
    background: var(--dpk-paper-inset);
  }

  .tree-row[data-current='true'] {
    background: linear-gradient(
      180deg,
      color-mix(in srgb, var(--dpk-prototype-accent) 10%, var(--dpk-paper-raised)),
      color-mix(in srgb, var(--dpk-prototype-accent) 5%, var(--dpk-paper-raised))
    );
    box-shadow:
      inset 0 0 0 1px color-mix(in srgb, var(--dpk-prototype-accent) 22%, transparent),
      var(--dpk-shadow-xs);
  }

  .tree-link {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 2px 8px;
    padding: 6px 4px 6px 9px;
    text-decoration: none;
    color: var(--dpk-ink-soft);
    font-size: 12.5px;
  }

  .tree-path {
    font-family: var(--dpk-mono);
    font-size: 11.5px;
    color: var(--dpk-ink);
    overflow-wrap: anywhere;
  }

  span.tree-link .tree-path {
    color: var(--dpk-ink-faint);
  }

  .tree-title {
    min-width: 0;
    color: var(--dpk-ink-soft);
  }

  .tree-row[data-current='true'] .tree-path,
  .tree-row[data-current='true'] .tree-title {
    color: var(--dpk-ink);
    font-weight: 550;
  }

  .tree-link .step-note {
    align-self: center;
  }

  .tree-link:focus-visible {
    outline: none;
    border-radius: var(--dpk-radius-sm);
    box-shadow: var(--dpk-focus);
  }

  .steps.app-screens {
    max-height: none;
  }

  .steps-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    padding-bottom: 5px;
    border-bottom: 1px solid var(--dpk-rule);
  }

  .steps {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    /* A row is no wider than the list: a long step name ends in an ellipsis. */
    grid-template-columns: minmax(0, 1fr);
    gap: 2px;
    max-height: 38vh;
    overflow: auto;
  }

  .step-row {
    position: relative;
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 0 4px 0 9px;
    border-radius: var(--dpk-radius-sm);
    transition:
      background 140ms ease,
      box-shadow 140ms ease;
  }

  .step-row:hover {
    background: var(--dpk-paper-inset);
  }

  .step-row[data-current='true'] {
    background: linear-gradient(
      180deg,
      color-mix(in srgb, var(--dpk-prototype-accent) 10%, var(--dpk-paper-raised)),
      color-mix(in srgb, var(--dpk-prototype-accent) 5%, var(--dpk-paper-raised))
    );
    box-shadow:
      inset 0 0 0 1px color-mix(in srgb, var(--dpk-prototype-accent) 22%, transparent),
      var(--dpk-shadow-xs);
  }

  .step-link {
    display: flex;
    flex: 1;
    min-width: 0;
    align-items: center;
    gap: 7px;
    padding: 7px 0;
    text-decoration: none;
    color: var(--dpk-ink-soft);
    font-size: 12.5px;
    font-weight: 460;
  }

  .step-row[data-current='true'] .step-link {
    color: var(--dpk-ink);
    font-weight: 550;
  }

  .step-index {
    flex: 0 0 auto;
    min-width: 17px;
    padding: 1px 4px;
    border-radius: var(--dpk-radius-xs);
    background: var(--dpk-paper-inset);
    font-family: var(--dpk-mono);
    font-size: 9.5px;
    font-variant-numeric: tabular-nums;
    text-align: center;
    color: var(--dpk-ink-faint);
    transition:
      background 140ms ease,
      color 140ms ease;
  }

  .step-row[data-current='true'] .step-index {
    background: linear-gradient(180deg, var(--dpk-blue), var(--dpk-blue-strong));
    color: #fff;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.28);
  }

  .step-name {
    min-width: 0;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .step-note {
    margin-left: auto;
    min-width: 16px;
    padding: 1px 5px;
    border-radius: 999px;
    background: var(--dpk-accent);
    color: var(--dpk-accent-ink);
    font-family: var(--dpk-mono);
    font-size: 9px;
    font-variant-numeric: tabular-nums;
    text-align: center;
  }

  .row-tools {
    display: flex;
    gap: 0;
    opacity: 0;
    transition: opacity 120ms ease;
  }

  .step-row:hover .row-tools,
  .step-row[data-current='true'] .row-tools {
    opacity: 1;
  }

  .detail {
    display: grid;
    /* As wide as the panel, not as a description's widest table or code line: those scroll. */
    grid-template-columns: minmax(0, 1fr);
    gap: 12px;
    padding: 12px 12px 14px;
    border: 1px solid var(--dpk-rule);
    border-radius: var(--dpk-radius);
    background: var(--dpk-paper-raised);
    box-shadow: var(--dpk-bevel), var(--dpk-shadow-sm);
  }

  .detail-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 4px;
  }

  .detail-value {
    font-size: 12.5px;
    color: var(--dpk-ink-soft);
  }

  .nav-empty {
    font-size: 12px;
    line-height: 1.6;
    color: var(--dpk-ink-faint);
  }

  /* ------------------------------------------------------------------ stage */

  .stage {
    display: grid;
    /* One column no wider than the main area: a wide row of panes scrolls inside the canvas. */
    grid-template-columns: minmax(0, 1fr);
    gap: 14px;
    width: 100%;
    min-width: 0;
  }

  /* A tighter top than the shell's leaves the preview more of the main column. */
  :host {
    --dpk-main-padding: 12px 24px 24px;
  }

  .stage-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px 16px;
    min-width: 0;
    flex-wrap: wrap;
  }

  /*
   * The page head and its tools stick to the top of the main column, so they
   * stay in reach while a tall preview scrolls under them; the situation and
   * the canvas scroll on. The bar spans the column edge to edge (cancelling
   * the body's padding) on a frosted ground the content passes beneath. Above
   * the UI-comment layer, below the memo, which opens over everything.
   */
  .stage:not(.is-maximized) > .stage-bar {
    position: sticky;
    top: 0;
    z-index: 5;
    margin: -12px -24px 0;
    padding: 10px 24px;
    border-bottom: 1px solid var(--dpk-rule);
    background: color-mix(in srgb, var(--dpk-paper-raised) 92%, transparent);
    backdrop-filter: saturate(1.6) blur(14px);
  }

  /* ------------------------------------------------------------- page head */

  .page-head {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
    animation: dpk-page-head-in 260ms var(--dpk-ease) backwards;
  }

  @keyframes dpk-page-head-in {
    from {
      opacity: 0;
      transform: translateY(4px);
    }
  }

  .page-actor {
    display: inline-flex;
    /* A long role name gives way to the title first, down to a recognizable stub. */
    flex: 0 1000 auto;
    min-width: 72px;
    align-items: center;
    gap: 6px;
    height: 26px;
    padding: 0 11px 0 8px;
    border-radius: 999px;
    background: linear-gradient(
      180deg,
      color-mix(in srgb, var(--dpk-blue) 16%, var(--dpk-paper-raised)),
      color-mix(in srgb, var(--dpk-blue) 9%, var(--dpk-paper-raised))
    );
    box-shadow:
      var(--dpk-bevel),
      inset 0 0 0 1px color-mix(in srgb, var(--dpk-blue) 32%, transparent),
      var(--dpk-shadow-xs);
    color: var(--dpk-blue);
    font-size: 12px;
    font-weight: 650;
    letter-spacing: 0.01em;
    white-space: nowrap;
    max-width: 280px;
  }

  .page-actor-name {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .page-actor svg {
    flex: none;
    width: 13px;
    height: 13px;
    opacity: 0.9;
  }

  .page-title {
    margin: 0;
    min-width: 0;
    overflow: hidden;
    font-size: 19px;
    font-weight: 700;
    line-height: 1.3;
    letter-spacing: -0.02em;
    color: var(--dpk-ink);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* Wraps on a phone rather than pushing the last tools off the screen. */
  .stage-tools {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    align-items: center;
    gap: 8px;
    min-width: 0;
    margin-left: auto;
  }

  .stage-maximize svg,
  .stage-demo svg {
    width: 13px;
    height: 13px;
  }

  .stage-demo {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .actions-toggle {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .actions-toggle svg {
    width: 13px;
    height: 13px;
  }

  .actions-toggle svg:last-child {
    width: 12px;
    height: 12px;
    margin-left: -2px;
    opacity: 0.7;
  }

  .actions-toggle[aria-expanded='true'] {
    opacity: 1;
    color: var(--dpk-ink);
  }

  /* A menu of what each screen on stage can do in one go. */
  .actions-menu {
    gap: 8px;
    width: max-content;
    min-width: 220px;
    max-width: min(320px, calc(100vw - 24px));
    padding: 6px;
  }

  .actions-group {
    display: grid;
    gap: 2px;
  }

  .actions-group + .actions-group {
    padding-top: 6px;
    border-top: 1px solid var(--dpk-rule);
  }

  .actions-group-title {
    padding: 4px 10px 2px;
    font-size: 11px;
    font-weight: 600;
    color: var(--dpk-ink-faint);
  }

  .actions-item {
    display: grid;
    gap: 2px;
    width: 100%;
    padding: 8px 10px;
    border: 0;
    border-radius: var(--dpk-radius-sm);
    background: transparent;
    color: var(--dpk-ink);
    font: inherit;
    text-align: left;
    cursor: pointer;
  }

  .actions-item:hover,
  .actions-item:focus-visible {
    background: var(--dpk-accent-soft);
  }

  .actions-item:focus-visible {
    outline: none;
    box-shadow: var(--dpk-focus);
  }

  .actions-label {
    font-weight: 600;
  }

  .actions-description {
    font-size: 11.5px;
    line-height: 1.45;
    color: var(--dpk-ink-soft);
  }

  /* The app view's device: a pill like the rendition tabs, with the zoom it is drawn at. */
  .device-pick {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 32px;
    padding: 0 6px 0 10px;
    box-sizing: border-box;
    border: 1px solid var(--dpk-rule);
    border-radius: 999px;
    background: var(--dpk-paper-sunken);
    box-shadow: inset 0 1px 2px rgba(20, 28, 44, 0.04);
    color: var(--dpk-ink-soft);
  }

  .device-pick:focus-within {
    box-shadow: var(--dpk-focus);
  }

  .device-pick svg {
    flex: none;
    width: 14px;
    height: 14px;
  }

  .device-select {
    min-width: 0;
    padding: 0 4px 0 0;
    border: 0;
    background: transparent;
    color: var(--dpk-ink);
    font: 600 12px/1 var(--dpk-body);
  }

  .device-zoom {
    padding: 3px 7px;
    border-radius: 999px;
    background: var(--dpk-paper-raised);
    box-shadow: var(--dpk-bevel), var(--dpk-shadow-xs);
    font: 600 10.5px/1 var(--dpk-mono);
    font-variant-numeric: tabular-nums;
    color: var(--dpk-ink-soft);
  }

  .stage-empty {
    max-width: 62ch;
    padding: 16px 18px;
    border: 1px dashed var(--dpk-rule-strong);
    border-radius: var(--dpk-radius-lg);
    background: var(--dpk-paper-sunken);
    font-size: 13px;
    line-height: 1.7;
    color: var(--dpk-ink-soft);
  }

  /* A story that has no steps yet: its heading, what it is for, and why no frame. */
  .stage-story {
    display: grid;
    gap: 12px;
    justify-items: start;
  }

  .story-description {
    max-width: 62ch;
    margin: 0;
    font-size: 14px;
    line-height: 1.7;
    color: var(--dpk-ink);
  }

  /* -------------------------------------------------------------- situation */

  /*
   * What is going on around the previews: a stage direction, read before them.
   * The band spans the stage at any width (a maximized stage too); only the
   * text keeps a readable line length.
   */
  .situation {
    display: flex;
    align-items: baseline;
    gap: 10px;
    margin: -4px 0 -2px;
    padding: 8px 14px 8px 10px;
    border: 1px solid color-mix(in srgb, var(--dpk-prototype-accent) 16%, var(--dpk-rule));
    border-radius: var(--dpk-radius);
    background: color-mix(in srgb, var(--dpk-prototype-accent) 5%, var(--dpk-paper-raised));
    box-shadow: var(--dpk-bevel);
  }

  .situation-label {
    flex: none;
    padding: 2px 8px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--dpk-prototype-accent) 13%, transparent);
    font-size: 10.5px;
    font-weight: 650;
    letter-spacing: 0.06em;
    color: var(--dpk-prototype-accent);
  }

  .situation-text {
    max-width: 90ch;
    margin: 0;
    min-width: 0;
    font-size: 13px;
    line-height: 1.65;
    color: var(--dpk-ink);
    white-space: pre-line;
    overflow-wrap: anywhere;
  }

  /* ----------------------------------------------------------------- canvas */

  /*
   * The work surface the frame sits on: a quiet dot lattice that reads as a
   * canvas rather than empty page background, giving the frame somewhere to
   * cast its shadow.
   */
  .canvas {
    display: flex;
    justify-content: center;
    padding: 30px;
    border: 1px solid var(--dpk-rule);
    border-radius: var(--dpk-radius-xl);
    background: var(--dpk-dots), var(--dpk-paper-sunken);
    box-shadow: inset 0 1px 3px var(--dpk-shade-1);
  }

  /* ---------------------------------------------------------- comment on UI */

  .ui-comment-toggle svg,
  .ui-comment-hint svg {
    width: 14px;
    height: 14px;
  }

  .ui-comment-toggle {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .ui-comment-hint {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: -4px 0 -2px;
    padding: 7px 12px;
    border-radius: var(--dpk-radius);
    background: var(--dpk-accent-soft);
    color: var(--dpk-accent-strong, var(--dpk-accent));
    font-size: 12.5px;
    font-weight: 550;
  }

  .canvas {
    position: relative;
  }

  .stage:not([data-ui-comment='off']) .canvas ::slotted(*) {
    cursor: crosshair;
  }

  /* Sized to the canvas's scroll area by the element; the boxes and pins show through. */
  .ui-catcher {
    position: absolute;
    top: 0;
    left: 0;
    z-index: 4;
    cursor: crosshair;
  }

  /* Positioned against the canvas by the element, which measures the author's markup. */
  .ui-layer {
    display: contents;
  }

  .ui-box {
    position: absolute;
    z-index: 2;
    box-sizing: border-box;
    border-radius: 4px;
    pointer-events: none;
  }

  .ui-hover {
    outline: 2px solid var(--dpk-accent);
    outline-offset: 1px;
    background: color-mix(in srgb, var(--dpk-accent) 8%, transparent);
  }

  .ui-picked {
    outline: 2px solid var(--dpk-accent);
    outline-offset: 2px;
    background: color-mix(in srgb, var(--dpk-accent) 14%, transparent);
    box-shadow: 0 0 0 6px color-mix(in srgb, var(--dpk-accent) 18%, transparent);
  }

  .ui-pin {
    position: absolute;
    z-index: 3;
    display: grid;
    place-items: center;
    min-width: 20px;
    height: 20px;
    padding: 0 5px;
    box-sizing: border-box;
    transform: translate(-50%, -50%);
    border: 2px solid var(--dpk-paper-raised);
    border-radius: 999px 999px 999px 2px;
    background: var(--dpk-accent);
    color: var(--dpk-accent-ink);
    box-shadow: var(--dpk-shadow-sm);
    font-family: var(--dpk-mono);
    font-size: 10px;
    font-weight: 700;
    pointer-events: none;
  }

  .ui-box[hidden],
  .ui-pin[hidden] {
    display: none;
  }

  /* ---------------------------------------------------------- notes on the UI */

  /* Positioned against the canvas by the element, like the pins; blue, so a note never reads as feedback. */
  .ui-notes {
    display: contents;
  }

  .ui-note-badge {
    position: absolute;
    z-index: 3;
    display: inline-flex;
    align-items: center;
    gap: 3px;
    height: 20px;
    padding: 0 6px 0 5px;
    box-sizing: border-box;
    transform: translate(-50%, -50%);
    border: 2px solid var(--dpk-paper-raised);
    border-radius: 999px;
    background: var(--dpk-blue);
    color: #fff;
    box-shadow: var(--dpk-shadow-sm);
    font-family: var(--dpk-mono);
    font-size: 10px;
    font-weight: 700;
    line-height: 1;
    cursor: pointer;
  }

  .ui-note-badge svg {
    width: 11px;
    height: 11px;
  }

  .ui-note-badge:hover,
  .ui-note-badge[aria-expanded='true'] {
    background: var(--dpk-blue-strong);
  }

  .ui-note-badge:focus-visible {
    outline: 2px solid var(--dpk-focus);
    outline-offset: 1px;
  }

  .ui-note-badge[hidden] {
    display: none;
  }

  .ui-notes-head {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  /* The badge's icon and blue: the list reads as the badge opened. */
  .ui-notes-head > svg {
    flex: none;
    width: 14px;
    height: 14px;
    color: var(--dpk-blue);
  }

  .ui-notes-head .comment-target {
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .ui-note-list {
    display: grid;
    gap: 6px;
    max-height: 240px;
    margin: 0;
    padding: 0;
    overflow: auto;
    list-style: none;
  }

  .ui-note-list li {
    display: flex;
    align-items: flex-start;
    gap: 4px;
    padding: 8px 4px 8px 10px;
    border-radius: var(--dpk-radius-sm);
    background: var(--dpk-paper-sunken);
  }

  .ui-note-main {
    display: grid;
    flex: 1 1 auto;
    gap: 2px;
    min-width: 0;
  }

  .ui-note-body {
    margin: 0;
    color: var(--dpk-ink);
    font-size: 12.5px;
    line-height: 1.6;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  .ui-note-time {
    color: var(--dpk-ink-faint);
    font-family: var(--dpk-mono);
    font-size: 10.5px;
  }

  /* Rewrite and delete sit together at the end of the row. */
  .ui-note-list li .dpk-icon-btn + .dpk-icon-btn {
    margin-left: -4px;
  }

  .ui-note-list li:has(.ui-note-editor) {
    padding: 6px;
  }

  .ui-note-editor {
    display: grid;
    flex: 1 1 auto;
    gap: 6px;
    min-width: 0;
  }

  .ui-note-editor textarea {
    min-height: 72px;
    background: var(--dpk-paper-raised);
    font-size: 12.5px;
  }

  .ui-note-editor-actions {
    display: flex;
    justify-content: flex-end;
    gap: 6px;
  }

  /*
   * Side by side: what the user sees together, in one row. A fixed viewport
   * keeps its width as long as the row allows it, a fluid one takes the rest;
   * a row wider than the canvas scrolls sideways instead of squeezing a device.
   */
  .panes {
    display: flex;
    align-items: flex-start;
    justify-content: safe center;
    gap: 28px;
    width: 100%;
    min-width: 0;
    overflow-x: auto;
    padding-bottom: 4px;
  }

  /*
   * A row wider than the stage fades out at the edge it scrolls toward, so the
   * panes past it read as a scroll away rather than cut off. The scroll timeline
   * is inactive while the row fits, which leaves it unmasked.
   */
  @supports (animation-timeline: scroll()) {
    .panes {
      animation: panes-edge linear both;
      animation-timeline: scroll(self inline);
    }

    @keyframes panes-edge {
      0% {
        mask-image: linear-gradient(90deg, #000 calc(100% - 40px), transparent);
      }
      2%,
      98% {
        mask-image: linear-gradient(90deg, transparent, #000 40px, #000 calc(100% - 40px), transparent);
      }
      100% {
        mask-image: linear-gradient(90deg, transparent, #000 40px);
      }
    }
  }

  /* A device shrinks at most to a width its layout still reads at, then the row scrolls. */
  .pane {
    display: grid;
    /* The pane's width is the device's: a long label never widens it. */
    grid-template-columns: minmax(0, 1fr);
    gap: 8px;
    flex: 0 1 var(--pane-width);
    min-width: min(var(--pane-width), 720px);
  }

  .pane[data-viewport='mobile'] {
    --pane-width: 390px;
  }

  .pane[data-viewport='tablet'] {
    --pane-width: 834px;
  }

  .pane[data-viewport='desktop'] {
    --pane-width: 1180px;
  }

  .pane[data-viewport='fluid'] {
    flex: 1 1 0;
    min-width: 240px;
  }

  .pane .frame {
    width: 100%;
  }

  .pane-head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .pane-head .tabs {
    padding: 2px;
  }

  .pane-head .tab {
    padding: 3px 11px;
    font-size: 11.5px;
  }

  /* One line over the pane; hovering names the whole label. */
  .pane-label {
    justify-self: start;
    min-width: 0;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    padding: 2px 9px;
    border-radius: 999px;
    background: var(--dpk-paper-raised);
    box-shadow: var(--dpk-bevel), var(--dpk-shadow-xs);
    font-size: 11.5px;
    font-weight: 600;
    color: var(--dpk-ink-soft);
  }

  /*
   * Maximized: the stage covers the tab — the page head, the tabs and the canvas
   * alone. It is also a manual popover in the top layer, so the UA popover box
   * (fit-content, margin, border, padding, colors) is reset here. The canvas
   * scrolls instead of the page, and a browser preview is at least as tall as
   * the tab allows; a phone keeps its device shape. Whatever sits above the
   * canvas (the situation, the comment-on-UI hint) keeps its own height, and the
   * canvas takes the rest.
   */
  .stage.is-maximized {
    position: fixed;
    inset: 0;
    z-index: 2147483000;
    display: flex;
    flex-direction: column;
    width: auto;
    height: auto;
    max-width: none;
    max-height: none;
    margin: 0;
    padding: 16px 20px 20px;
    border: 0;
    color: var(--dpk-ink);
    background: var(--dpk-paper);
    overflow: hidden;
  }

  .stage.is-maximized > * {
    flex: none;
  }

  .canvas:has(> .frame[data-window='device']) {
    align-items: flex-start;
    /* A device wider than the stage is drawn smaller to fit it, so it never widens the page. */
    min-width: 0;
    contain: inline-size;
  }

  .stage.is-maximized > .canvas {
    flex: 1 1 0;
    min-height: 0;
    align-items: flex-start;
    overflow: auto;
    overscroll-behavior: contain;
  }

  .stage.is-maximized .frame:not([data-kind='native'], [data-kind='plain']) {
    display: flex;
    flex-direction: column;
    min-height: 100%;
  }

  .stage.is-maximized .frame:not([data-kind='native'], [data-kind='plain']) .viewport {
    flex: 1 0 auto;
  }

  /*
   * Demo: the app view's browser alone across the tab, as if the reader were
   * using the app — no title, no tools, no canvas around it. The browser fills
   * the tab and its page scrolls inside the viewport; a phone stays phone wide.
   */
  .stage.is-demo {
    position: fixed;
    inset: 0;
    z-index: 2147483000;
    display: flex;
    flex-direction: column;
    width: auto;
    height: auto;
    max-width: none;
    max-height: none;
    margin: 0;
    padding: 0;
    border: 0;
    color: var(--dpk-ink);
    background: var(--dpk-paper-sunken);
    overflow: hidden;
  }

  .stage.is-demo > .canvas {
    flex: 1 1 0;
    min-height: 0;
    padding: 0;
    border: 0;
    border-radius: 0;
    background: var(--dpk-dots), var(--dpk-paper-sunken);
    box-shadow: none;
    overflow: auto;
    overscroll-behavior: contain;
  }

  .stage.is-demo .frame[data-window='fill'] {
    width: 100%;
    height: 100%;
    border: 0;
    border-radius: 0;
    box-shadow: none;
  }

  /* A device keeps its size, in the middle of the tab (the element leaves 24px around it). */
  .stage.is-demo > .canvas > .frame[data-window='device'] {
    margin: auto;
  }

  .stage.is-demo > .canvas > .frame:not([data-window]) {
    margin: 24px auto;
  }

  /*
   * The demo's controls (commenting on the UI, the way out). Over a phone or a
   * frame outside the browser, they float at the top right.
   */
  .demo-controls {
    position: absolute;
    top: 12px;
    right: 16px;
    z-index: 3;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .demo-control {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 30px;
    padding: 0 10px;
    border: 1px solid var(--dpk-rule-strong);
    border-radius: 999px;
    background: color-mix(in srgb, var(--dpk-paper-raised) 82%, transparent);
    backdrop-filter: blur(10px);
    box-shadow: var(--dpk-shadow);
    color: var(--dpk-ink-soft);
    font: 600 12px/1 var(--dpk-body);
    cursor: pointer;
    opacity: 0.55;
    transition:
      opacity 160ms var(--dpk-ease),
      color 160ms var(--dpk-ease);
  }

  .demo-exit {
    padding-right: 8px;
  }

  .demo-control:hover,
  .demo-control:focus-visible {
    opacity: 1;
    color: var(--dpk-ink);
  }

  .demo-control:focus-visible {
    outline: none;
    box-shadow: var(--dpk-focus), var(--dpk-shadow);
  }

  /* Commenting stays in sight: a click on the app now picks an element instead of using it. */
  .demo-control[aria-pressed='true'] {
    opacity: 1;
    border-color: var(--dpk-accent-strong);
    background: var(--dpk-accent);
    color: var(--dpk-accent-ink);
  }

  .demo-control svg {
    width: 12px;
    height: 12px;
  }

  /* A desktop browser has them at the free end of the tab strip, like window controls. */
  .browser-tabs .demo-controls {
    position: static;
    flex: none;
    align-self: center;
    margin: 0 0 3px auto;
  }

  .browser-tabs .demo-control {
    height: 26px;
  }

  .browser-tabs .demo-control:not([aria-pressed='true']) {
    opacity: 0.85;
  }

  .demo-exit kbd {
    padding: 2px 5px;
    border: 1px solid var(--dpk-rule-strong);
    border-radius: var(--dpk-radius-xs);
    background: var(--dpk-paper-sunken);
    font: 600 10px/1 var(--dpk-mono);
  }

  /* ------------------------------------------------------------------ frame */

  .frame {
    width: min(var(--frame-width), 100%);
    max-width: 100%;
    margin: 0;
    border: 1px solid var(--dpk-rule);
    border-radius: var(--dpk-radius-lg);
    background: var(--dpk-paper-raised);
    box-shadow: var(--dpk-bevel), var(--dpk-shadow-lg);
    overflow: hidden;
    /* However high the mock stacks its own layers, they stay under what the stage draws over the frame. */
    isolation: isolate;
    transition: box-shadow 200ms var(--dpk-ease);
  }

  /*
   * Native previews are recognised by their device shape: a slim bezel, a status
   * bar with a punch-hole camera, and a home indicator. No address bar.
   */
  .frame[data-kind='native'] {
    padding: 10px;
    border-color: #22262e;
    border-radius: 28px;
    background: linear-gradient(160deg, #2e3440, #1a1d24);
    box-shadow:
      var(--dpk-shadow-lg),
      inset 0 1px 0 rgba(255, 255, 255, 0.06);
  }

  .frame[data-kind='native'] .viewport {
    overflow: hidden;
    border-radius: 18px;
  }

  /* A phone is portrait: derive the screen height from its width (~1:2.05)
     instead of reusing the browser preview heights. */
  .frame[data-kind='native'][data-viewport='mobile'] .viewport {
    min-height: calc((var(--frame-width, 390px) - 16px) * 2.05);
  }

  /*
   * A plain preview is not a screen: no chrome, no bezel, no frame of its own.
   * The light DOM draws the whole object (a memo, a FAX, a paper form) and the
   * canvas is its desk, so it is as tall as its content.
   */
  .frame[data-kind='plain'] {
    border: none;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
    overflow: visible;
  }

  .frame[data-kind='plain'] .viewport {
    min-height: 0;
    background: transparent;
  }

  .frame[data-kind='plain'][data-empty] .viewport {
    min-height: 180px;
  }

  /* Home indicator. */
  .frame[data-kind='native'] .viewport::after {
    content: '';
    position: absolute;
    bottom: 8px;
    left: 50%;
    width: 88px;
    height: 4px;
    transform: translateX(-50%);
    border-radius: 999px;
    background: rgba(138, 146, 160, 0.55);
  }

  /*
   * The preview is never scrolled on its own: it shows everything it contains and
   * the page scrolls as a whole. The flex column keeps a short mock filling
   * the frame's minimum height without pinning a maximum.
   */
  .viewport {
    position: relative;
    contain: layout;
    display: flex;
    flex-direction: column;
    width: 100%;
    min-height: var(--frame-min-height, 480px);
    /* A preview is the product's screen, not the kit's chrome: it stays light in a dark theme. */
    color-scheme: light;
    background: #fff;
    /* …and so does its ink: the kit's dark-theme text color would be invisible on it. */
    color: #1f2430;
  }

  /*
   * The author's wrapper becomes the frame's filling layer: a one-cell grid makes
   * its height definite, so a mock that asks for height:100% fills the frame
   * instead of collapsing to its content.
   */
  /*
   * The author's wrapper is a stretch row: a mock fills a short frame and grows
   * the frame when its own content is taller. Stretching (rather than a
   * percentage height) is what makes the fill reliable.
   */
  /* Only the viewport carries the minimum height; the wrapper grows to fill it. */
  .viewport ::slotted(*) {
    display: grid;
    flex: 1 0 auto;
    min-width: 0;
  }

  /*
   * The app view is a simulation: a screen runs in a window of a fixed size (a
   * device's screen, or the whole demo) and what does not fit scrolls inside
   * the author's wrapper, the way the real page scrolls under the device's own
   * chrome — the status bar, the address bar and a phone browser's bottom bar
   * stay where they are. The viewport contains layout, so a mock's
   * fixed position element (a tab bar, a modal) stays on the device screen.
   */
  .frame[data-window] {
    display: flex;
    flex: none;
    flex-direction: column;
    box-sizing: border-box;
    max-width: none;
  }

  .frame[data-window='device'] {
    width: var(--device-width);
    height: var(--device-height);
  }

  .frame[data-kind][data-window] .viewport {
    flex: 1 1 0;
    min-height: 0;
    overflow: hidden;
  }

  .frame[data-window] .viewport ::slotted(*) {
    flex: 1 1 0;
    min-height: 0;
    overflow: auto;
    overscroll-behavior: contain;
  }

  .frame-placeholder {
    position: absolute;
    inset: 12px;
    display: grid;
    align-content: center;
    justify-items: center;
    gap: 8px;
    padding: 12px;
    text-align: center;
    color: var(--dpk-ink-faint);
    border: 1px dashed var(--dpk-rule-strong);
    border-radius: var(--dpk-radius);
    background: var(--dpk-dots), var(--dpk-paper-sunken);
  }

  .frame-placeholder code {
    padding: 3px 7px;
    border: 1px solid var(--dpk-rule);
    border-radius: var(--dpk-radius-xs);
    background: var(--dpk-paper-raised);
    font-family: var(--dpk-mono);
    font-size: 10px;
  }

  .parked {
    display: none;
  }
`;

/**
 * The rules about the author's light DOM below the wrapper, which the shadow
 * styles cannot reach, so this sheet goes to the document. A mock's modal
 * dialog opens inside its preview (see `lib/dom/contained-dialog.ts`): the
 * wrapper is the dialog's backdrop, and the frame clips both.
 */
export const prototypeDocumentStyles = `
  /*
   * The wrapper is a stretch grid (see \`.viewport ::slotted(*)\`): one child
   * fills the frame, but several would share the extra height as gaps between
   * them, so they stack from the top instead (a \`<style>\` or \`<script>\` beside
   * the one child draws nothing and does not count). A shadow tree cannot see a
   * slotted element's children, hence the document rule; \`:where\` lets the
   * author's own \`align-content\` win.
   */
  :where(
      dpk-view-prototype
        > [data-preview-id]:has(> :not(style, script, template, link) ~ :not(style, script, template, link))
    ) {
    align-content: start;
  }

  dpk-view-prototype > [data-preview-id]:has(dialog[${CONTAINED_DIALOG}][open]) {
    position: relative;
  }

  dpk-view-prototype > [data-preview-id]:has(dialog[${CONTAINED_DIALOG}][open])::after {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 1;
    background: color-mix(in srgb, var(--dpk-ink, #111827) 38%, transparent);
  }

  dpk-view-prototype > [data-preview-id] dialog[${CONTAINED_DIALOG}][open] {
    position: absolute;
    inset: 0;
    z-index: 2;
    max-width: calc(100% - 32px);
    max-height: calc(100% - 32px);
    margin: auto;
  }
`;
