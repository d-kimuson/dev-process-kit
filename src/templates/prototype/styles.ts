import { css } from 'lit';

import { CONTAINED_DIALOG } from '../../lib/dom/contained-dialog';

/** Sidebar navigation, stage and preview frames of `<dpk-template-prototype>`. */
export const prototypeStyles = css`
  :host {
    --dpk-prototype-accent: var(--dpk-blue);
  }

  /*
   * The sidebar and the main column scroll on their own, with the memo pinned
   * to the bottom of the main column, only inside a bounded shell. A page that
   * gives the host no height would grow the shell to its longest column and
   * scroll the whole document, carrying the memo off screen; the viewport
   * height is the fallback. A host with a height still wins: the shell's own
   * min/max-height pin it to that.
   */
  .dpk-shell {
    height: 100dvh;
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

  /* Scenario or app: a segmented control at the top of the sidebar. */
  .view-switch {
    display: flex;
    gap: 3px;
    padding: 3px;
    border: 1px solid var(--dpk-rule);
    border-radius: var(--dpk-radius);
    background: var(--dpk-paper-inset);
    box-shadow: inset 0 1px 2px var(--dpk-shade-1);
  }

  .view-option {
    flex: 1 1 0;
    padding: 6px 9px;
    border: 1px solid transparent;
    border-radius: var(--dpk-radius-sm);
    color: var(--dpk-ink-soft);
    font-size: 12px;
    font-weight: 500;
    text-align: center;
    text-decoration: none;
    transition:
      background 140ms var(--dpk-ease),
      color 140ms var(--dpk-ease),
      box-shadow 140ms var(--dpk-ease);
  }

  .view-option:hover {
    color: var(--dpk-ink);
  }

  .view-option[aria-current='page'] {
    background: var(--dpk-paper-raised);
    color: var(--dpk-ink);
    font-weight: 600;
    box-shadow: var(--dpk-bevel), var(--dpk-shadow-xs);
  }

  .view-option:focus-visible {
    outline: none;
    box-shadow: var(--dpk-focus);
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

  .step-row[data-current='true']::before {
    content: '';
    position: absolute;
    left: 0;
    top: 8px;
    bottom: 8px;
    width: 3px;
    border-radius: var(--dpk-radius-xs);
    background: linear-gradient(180deg, var(--dpk-blue), var(--dpk-blue-strong));
    box-shadow: 0 0 8px color-mix(in srgb, var(--dpk-prototype-accent) 45%, transparent);
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
    gap: 12px;
    padding: 12px 12px 14px;
    border: 1px solid var(--dpk-rule);
    border-radius: var(--dpk-radius);
    background: var(--dpk-paper-raised);
    box-shadow: var(--dpk-bevel), var(--dpk-shadow-sm);
  }

  .detail-row {
    display: grid;
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
  .dpk-main-body {
    padding-top: 12px;
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
    flex: none;
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
  }

  .page-actor svg {
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

  .stage-tools {
    display: flex;
    align-items: center;
    gap: 8px;
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
    padding: 0 18px 0 0;
    border: 0;
    outline: none;
    background: transparent
      url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 12 12'><path d='M3 4.5 6 7.5 9 4.5' fill='none' stroke='%23878e9e' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/></svg>")
      no-repeat right 2px center;
    appearance: none;
    /* As wide as the device shown, not the longest name in the list. */
    field-sizing: content;
    color: var(--dpk-ink);
    font: 600 12px/1 var(--dpk-body);
    cursor: pointer;
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

  .tabs {
    display: inline-flex;
    gap: 2px;
    padding: 3px;
    border: 1px solid var(--dpk-rule);
    border-radius: 999px;
    background: var(--dpk-paper-sunken);
    box-shadow: inset 0 1px 2px rgba(20, 28, 44, 0.04);
  }

  .tab {
    padding: 4px 14px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 500;
    text-decoration: none;
    color: var(--dpk-ink-soft);
    white-space: nowrap;
    transition:
      background 120ms ease,
      color 120ms ease;
  }

  .tab:hover {
    color: var(--dpk-ink);
    background: var(--dpk-paper-raised);
  }

  .tab[data-current='true'] {
    background: var(--dpk-paper-raised);
    color: var(--dpk-ink);
    font-weight: 600;
    box-shadow: var(--dpk-bevel), var(--dpk-shadow-xs);
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

  /* A device shrinks at most to a width its layout still reads at, then the row scrolls. */
  .pane {
    display: grid;
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

  .pane-label {
    justify-self: start;
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

  /* Over a phone or a frame outside the browser, the way out floats at the top right. */
  .demo-exit {
    position: absolute;
    top: 12px;
    right: 16px;
    z-index: 3;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 30px;
    padding: 0 8px 0 10px;
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

  .demo-exit:hover,
  .demo-exit:focus-visible {
    opacity: 1;
    color: var(--dpk-ink);
  }

  .demo-exit:focus-visible {
    outline: none;
    box-shadow: var(--dpk-focus), var(--dpk-shadow);
  }

  .demo-exit svg {
    width: 12px;
    height: 12px;
  }

  /* A desktop browser has it at the free end of the tab strip, like a window control. */
  .browser-tabs .demo-exit {
    position: static;
    flex: none;
    align-self: center;
    margin: 0 0 3px auto;
    height: 26px;
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

  .chrome {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 14px;
    background: linear-gradient(
      180deg,
      color-mix(in srgb, var(--dpk-paper-raised) 88%, transparent),
      color-mix(in srgb, var(--dpk-paper-inset) 88%, transparent)
    );
    backdrop-filter: blur(10px);
    border-bottom: 1px solid var(--dpk-rule);
    box-shadow: inset 0 1px 0 var(--dpk-highlight);
  }

  .dots {
    display: inline-flex;
    gap: 5px;
  }

  .dots i {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--dpk-rule-strong);
  }

  .dots i:nth-child(1) {
    background: #ff5f57;
  }

  .dots i:nth-child(2) {
    background: #febc2e;
  }

  .dots i:nth-child(3) {
    background: #28c840;
  }

  .chrome .url {
    flex: 1;
    min-width: 0;
    padding: 4px 14px;
    border: 1px solid var(--dpk-rule);
    border-radius: var(--dpk-radius-sm);
    background: var(--dpk-paper-raised);
    box-shadow: inset 0 1px 2px rgba(20, 28, 44, 0.04);
    font-family: var(--dpk-mono);
    font-size: 10.5px;
    color: var(--dpk-ink-faint);
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
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
   * A mail preview reads as one opened message in a mail client: the subject,
   * the sender's avatar and the envelope rows, then the body (the light DOM).
   */
  .mail-head {
    display: grid;
    gap: 12px;
    padding: 18px 22px 14px;
    border-bottom: 1px solid #e3e6ec;
    background: #fff;
    color: #1f2430;
    color-scheme: light;
  }

  .mail-subject {
    margin: 0;
    font-size: 18px;
    font-weight: 650;
    line-height: 1.35;
    letter-spacing: -0.01em;
  }

  .mail-envelope {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    min-width: 0;
  }

  .mail-avatar {
    display: inline-grid;
    flex: none;
    place-items: center;
    width: 34px;
    height: 34px;
    border-radius: 50%;
    background: linear-gradient(160deg, #6b8af5, #3f5fd8);
    color: #fff;
    font-size: 14px;
    font-weight: 650;
  }

  .mail-meta {
    display: grid;
    gap: 2px;
    min-width: 0;
    margin: 0;
    font-size: 12px;
    line-height: 1.5;
  }

  .mail-row {
    display: flex;
    gap: 8px;
    min-width: 0;
  }

  .mail-row dt {
    flex: none;
    min-width: 3.5em;
    color: #7a8294;
  }

  .mail-row dd {
    min-width: 0;
    margin: 0;
    overflow-wrap: anywhere;
    color: #1f2430;
  }

  .mail-row:first-child dd {
    font-weight: 600;
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

  .status-bar {
    position: relative;
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: space-between;
    height: 30px;
    padding: 0 12px;
    background: #0c0e13;
    color: #e9edf4;
    font-size: 11.5px;
    font-weight: 550;
    font-variant-numeric: tabular-nums;
  }

  .status-time {
    letter-spacing: 0.02em;
  }

  .punch-hole {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 10px;
    height: 10px;
    transform: translate(-50%, -50%);
    border-radius: 50%;
    background: #04060a;
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.07);
  }

  .status-wifi {
    width: 15px;
    height: 12px;
    fill: currentColor;
    color: #e9edf4;
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

  /* ---------------------------------------------------------------- browser */

  /*
   * The app view's browser: a tab strip on a darker band, the active tab merged
   * into the toolbar below it, round navigation buttons, a pill address bar and
   * the profile of the user the window belongs to.
   */
  .frame.browser {
    display: flex;
    flex-direction: column;
    --browser-band: var(--dpk-paper-inset);
    --browser-bar: var(--dpk-paper-raised);
  }

  .browser-tabs {
    display: flex;
    align-items: flex-end;
    gap: 4px;
    min-width: 0;
    padding: 7px 10px 0;
    background: var(--browser-band);
  }

  .browser-tab-list {
    display: flex;
    flex: 0 1 auto;
    align-items: flex-end;
    gap: 2px;
    min-width: 0;
  }

  .browser-tab {
    position: relative;
    display: flex;
    flex: 0 1 220px;
    align-items: center;
    gap: 8px;
    min-width: 64px;
    height: 32px;
    padding: 0 8px 0 12px;
    border-radius: 9px 9px 0 0;
    color: var(--dpk-ink-soft);
    font-size: 12px;
    cursor: default;
    user-select: none;
    transition: background 140ms var(--dpk-ease);
  }

  .browser-tab:not([aria-selected='true']):hover {
    background: color-mix(in srgb, var(--browser-bar) 55%, transparent);
  }

  /* A thin rule between two inactive tabs, as in Chrome. */
  .browser-tab:not([aria-selected='true']) + .browser-tab:not([aria-selected='true'])::before {
    content: '';
    position: absolute;
    left: -2px;
    top: 9px;
    bottom: 9px;
    width: 1px;
    background: var(--dpk-rule-strong);
  }

  .browser-tab[aria-selected='true'] {
    background: var(--browser-bar);
    color: var(--dpk-ink);
    box-shadow: 0 -1px 0 var(--dpk-rule);
  }

  .browser-tab:focus-visible {
    outline: none;
    box-shadow: var(--dpk-focus);
  }

  .browser-favicon {
    display: inline-flex;
    flex: none;
    color: var(--dpk-ink-faint);
  }

  .browser-favicon svg {
    width: 14px;
    height: 14px;
  }

  .browser-tab-title {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .browser-tab-close,
  .browser-new-tab,
  .browser-nav {
    display: inline-grid;
    flex: none;
    place-items: center;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: transparent;
    color: var(--dpk-ink-soft);
    cursor: pointer;
    transition:
      background 140ms var(--dpk-ease),
      color 140ms var(--dpk-ease);
  }

  .browser-tab-close {
    width: 18px;
    height: 18px;
  }

  .browser-tab-close svg {
    width: 10px;
    height: 10px;
  }

  .browser-new-tab {
    width: 26px;
    height: 26px;
    margin-bottom: 3px;
  }

  .browser-new-tab svg {
    width: 14px;
    height: 14px;
  }

  .browser-tab-close:hover,
  .browser-new-tab:hover,
  .browser-nav:not(:disabled):hover {
    background: color-mix(in srgb, var(--dpk-ink) 9%, transparent);
    color: var(--dpk-ink);
  }

  .browser-tab-close:focus-visible,
  .browser-new-tab:focus-visible,
  .browser-nav:focus-visible {
    outline: none;
    box-shadow: var(--dpk-focus);
  }

  .browser-toolbar {
    display: flex;
    align-items: center;
    gap: 4px;
    min-width: 0;
    padding: 6px 10px;
    background: var(--browser-bar);
    border-bottom: 1px solid var(--dpk-rule);
  }

  .browser-nav {
    width: 30px;
    height: 30px;
  }

  .browser-nav svg {
    width: 15px;
    height: 15px;
  }

  .browser-nav:disabled {
    color: var(--dpk-ink-faint);
    opacity: 0.5;
    cursor: default;
  }

  .browser-address-form {
    position: relative;
    display: flex;
    flex: 1;
    align-items: center;
    min-width: 0;
    margin: 0 4px;
  }

  .browser-lock {
    position: absolute;
    left: 12px;
    display: inline-flex;
    color: var(--dpk-ink-faint);
    pointer-events: none;
  }

  .browser-lock svg {
    width: 13px;
    height: 13px;
  }

  .browser-address {
    width: 100%;
    min-width: 0;
    height: 30px;
    padding: 0 14px 0 33px;
    border: 1px solid transparent;
    border-radius: 999px;
    background: var(--dpk-paper-sunken);
    color: var(--dpk-ink);
    font: 13px/1 var(--dpk-body);
    text-overflow: ellipsis;
    transition:
      background 140ms var(--dpk-ease),
      border-color 140ms var(--dpk-ease);
  }

  .browser-address:hover {
    background: var(--dpk-paper-inset);
  }

  .browser-address:focus {
    outline: none;
    border-color: var(--dpk-blue);
    background: var(--browser-bar);
    box-shadow: 0 0 0 1px var(--dpk-blue);
  }

  .browser-profile {
    display: inline-flex;
    flex: none;
    align-items: center;
    gap: 6px;
    max-width: 160px;
    height: 28px;
    padding: 0 10px 0 3px;
    border-radius: 999px;
    background: var(--dpk-blue-soft);
    color: var(--dpk-blue-strong, var(--dpk-blue));
    font-size: 12px;
    font-weight: 600;
  }

  .browser-avatar {
    display: inline-grid;
    flex: none;
    place-items: center;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: var(--dpk-blue);
    color: #fff;
    font-size: 11px;
    font-weight: 700;
  }

  .browser-profile-name {
    min-width: 0;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  /* The bar a reload draws under the toolbar while the page comes back. */
  .browser-progress {
    position: relative;
    height: 2px;
    margin-top: -2px;
    overflow: hidden;
    pointer-events: none;
  }

  .browser[data-loading] .browser-progress::after {
    content: '';
    position: absolute;
    inset: 0;
    background: var(--dpk-blue);
    transform-origin: left;
    animation: dpk-browser-load 360ms var(--dpk-ease) forwards;
  }

  @keyframes dpk-browser-load {
    from {
      transform: scaleX(0.08);
    }
    to {
      transform: scaleX(1);
    }
  }

  .browser .viewport {
    transition: opacity 160ms var(--dpk-ease);
  }

  .browser[data-loading] .viewport {
    opacity: 0.45;
  }

  /* The new tab page: the pages of the app the reader is in, as tiles. */
  .browser-newtab {
    display: grid;
    flex: 1;
    align-content: start;
    justify-items: center;
    gap: 18px;
    padding: 72px 24px 40px;
    background: #f8f9fb;
    color: #3c4250;
  }

  .browser-newtab-label {
    margin: 0;
    font-size: 13px;
    font-weight: 600;
    color: #6b7282;
  }

  .browser-shortcuts {
    display: grid;
    grid-template-columns: repeat(auto-fill, 112px);
    justify-content: center;
    gap: 8px;
    width: min(100%, 600px);
  }

  .browser-shortcut {
    display: grid;
    justify-items: center;
    gap: 6px;
    padding: 14px 8px 12px;
    border-radius: 12px;
    color: inherit;
    text-align: center;
    text-decoration: none;
    transition: background 140ms var(--dpk-ease);
  }

  .browser-shortcut:hover,
  .browser-shortcut:focus-visible {
    outline: none;
    background: #eceef2;
  }

  .browser-shortcut-icon {
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: #e3e7ee;
    color: #3563d9;
    font-size: 17px;
    font-weight: 700;
  }

  .browser-shortcut-title,
  .browser-shortcut-url {
    max-width: 100%;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .browser-shortcut-title {
    font-size: 12.5px;
    font-weight: 600;
  }

  .browser-shortcut-url {
    font-size: 10.5px;
    color: #8a91a0;
  }

  .browser-unreachable {
    display: grid;
    flex: 1;
    align-content: start;
    gap: 10px;
    padding: 88px max(24px, 12%) 40px;
    background: #fff;
    color: #3c4250;
  }

  .browser-unreachable::before {
    content: '';
    width: 40px;
    height: 40px;
    margin-bottom: 8px;
    border-radius: 10px;
    background:
      linear-gradient(135deg, transparent 46%, #9aa1ae 46% 54%, transparent 54%),
      linear-gradient(45deg, transparent 46%, #9aa1ae 46% 54%, transparent 54%), #eceef2;
  }

  .browser-unreachable h3 {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
    color: #1f2430;
  }

  .browser-unreachable p {
    margin: 0;
    font-size: 13.5px;
    line-height: 1.6;
  }

  .browser-unreachable code {
    justify-self: start;
    max-width: 100%;
    overflow-wrap: anywhere;
    font-family: var(--dpk-mono);
    font-size: 12px;
    color: #6b7282;
  }

  /*
   * A phone browser: the address and the avatar on top, the controls and the
   * tab count in a bar under the page, the tabs as cards over the page.
   */
  .browser[data-viewport='mobile'] .browser-toolbar {
    gap: 8px;
    padding: 8px 10px;
  }

  .browser[data-viewport='mobile'] .browser-profile {
    padding-right: 3px;
  }

  .browser[data-viewport='mobile'] .browser-shortcuts {
    grid-template-columns: repeat(auto-fill, 96px);
  }

  .browser-bottom {
    display: flex;
    align-items: center;
    justify-content: space-around;
    padding: 6px 8px 10px;
    border-top: 1px solid var(--dpk-rule);
    background: var(--browser-bar);
  }

  .browser-bottom .browser-new-tab {
    width: 30px;
    height: 30px;
    margin: 0;
  }

  .browser-tab-count-box {
    display: inline-grid;
    place-items: center;
    min-width: 17px;
    height: 17px;
    padding: 0 3px;
    border: 1.5px solid currentColor;
    border-radius: 4px;
    font: 700 10px/1 var(--dpk-body);
  }

  .browser-tab-count[aria-expanded='true'] {
    background: color-mix(in srgb, var(--dpk-ink) 9%, transparent);
    color: var(--dpk-ink);
  }

  .browser-switcher {
    position: absolute;
    inset: 0;
    z-index: 2;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-content: start;
    gap: 10px;
    padding: 12px;
    color-scheme: normal;
    background: var(--browser-band);
    overflow: auto;
  }

  .browser-card {
    position: relative;
    border: 1px solid var(--dpk-rule-strong);
    border-radius: 12px;
    background: var(--browser-bar);
    box-shadow: var(--dpk-shadow);
  }

  .browser-card[aria-current='true'] {
    border-color: var(--dpk-blue);
    box-shadow: 0 0 0 1px var(--dpk-blue);
  }

  .browser-card-open {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: center;
    gap: 4px 6px;
    width: 100%;
    min-height: 84px;
    padding: 10px 30px 10px 10px;
    border: 0;
    border-radius: inherit;
    background: transparent;
    color: var(--dpk-ink);
    font: 600 12px/1.3 var(--dpk-body);
    text-align: left;
    align-content: start;
    cursor: pointer;
  }

  .browser-card-open:focus-visible {
    outline: none;
    box-shadow: var(--dpk-focus);
  }

  .browser-card-title,
  .browser-card-url {
    min-width: 0;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .browser-card-url {
    grid-column: 1 / -1;
    color: var(--dpk-ink-faint);
    font: 400 11px/1.3 var(--dpk-mono);
  }

  .browser-card .browser-tab-close {
    position: absolute;
    top: 8px;
    right: 8px;
  }

  .parked {
    display: none;
  }
`;

/**
 * A mock's modal dialog, opened inside its preview (see
 * `lib/dom/contained-dialog.ts`). The dialog is light DOM, which the shadow
 * styles cannot reach below the wrapper, so this sheet goes to the document:
 * the wrapper is the dialog's backdrop, and the frame clips both.
 */
export const containedDialogDocumentStyles = `
  dpk-template-prototype > [data-preview-id]:has(dialog[${CONTAINED_DIALOG}][open]) {
    position: relative;
  }

  dpk-template-prototype > [data-preview-id]:has(dialog[${CONTAINED_DIALOG}][open])::after {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 1;
    background: color-mix(in srgb, var(--dpk-ink, #111827) 38%, transparent);
  }

  dpk-template-prototype > [data-preview-id] dialog[${CONTAINED_DIALOG}][open] {
    position: absolute;
    inset: 0;
    z-index: 2;
    max-width: calc(100% - 32px);
    max-height: calc(100% - 32px);
    margin: auto;
  }
`;
