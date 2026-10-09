import { css } from 'lit';

import { CONTAINED_DIALOG } from '../../lib/dom/contained-dialog';

/** Sidebar navigation, stage and preview frames of `<dpk-template-prototype>`. */
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

  .app-actor {
    margin: 0;
    padding-left: 9px;
    font-size: 11px;
    font-weight: 600;
    color: var(--dpk-ink-soft);
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

  .stage-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px 16px;
    min-width: 0;
    flex-wrap: wrap;
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
    fill: currentColor;
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

  .stage-maximize svg {
    width: 13px;
    height: 13px;
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
