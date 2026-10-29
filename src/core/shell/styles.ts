/**
 * Shell chrome styles: the shadow-DOM look of every `dpk-view-*` element.
 *
 * Kept separate from the element so the class reads as behaviour, not CSS.
 */
import { css } from 'lit';

import { controls, tokens } from '../theme';

export const chromeStyles = [
  tokens,
  controls,
  css`
    :host {
      display: block;
      min-height: 100%;
      background: var(--dpk-paper);
      color-scheme: light;
    }

    /* The element stamps its resolved scheme; nested components inherit it. */
    :host([data-theme='dark']) {
      color-scheme: dark;
    }

    /* An inactive board of a page stays mounted, out of sight. */
    :host([hidden]) {
      display: none;
    }

    /* The frame is \`<dpk-internal-layout-app>\`: it sizes itself to the host, or the viewport. */
    .dpk-shell {
      flex: 1 1 auto;
    }

    /* A board fills the page's main column; the viewport is the page's. */
    .dpk-shell[data-board] {
      --dpk-app-height: 100%;
    }

    /* What floats over the screen keeps its own fixed position. */
    .dpk-overlay {
      display: contents;
    }

    /*
     * A page content's own bar: the template's controls, in a row of their own
     * under the screen's header. It is hidden while the template offers none,
     * so an empty one takes no room.
     */
    .dpk-board-bar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px 14px;
      min-height: 40px;
      padding: 4px 16px;
      border-bottom: 1px solid var(--dpk-rule);
      background: var(--dpk-glass);
    }

    .dpk-board-bar[hidden] {
      display: none;
    }

    /* ------------------------------------------------------------- header */

    .dpk-header {
      position: relative;
      z-index: 20;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px 14px;
      min-height: 44px;
      padding: 6px 16px;
      border-bottom: 1px solid var(--dpk-rule);
      background: var(--dpk-glass);
      backdrop-filter: saturate(1.6) blur(14px);
      box-shadow: 0 1px 0 var(--dpk-highlight) inset;
    }

    /* A hairline of the accent along the bottom edge, fading out to the right. */
    .dpk-header::after {
      content: '';
      position: absolute;
      left: 0;
      right: 0;
      bottom: -1px;
      height: 1px;
      background: linear-gradient(
        90deg,
        color-mix(in srgb, var(--dpk-accent) 70%, transparent),
        color-mix(in srgb, var(--dpk-accent) 0%, transparent) 38%
      );
      pointer-events: none;
    }

    /* Kit mark: the dev-process-kit brand mark (src/core/icons.ts#brandMark), fixed
       color on both schemes — it is brand identity, not a themed control. */
    .dpk-brand {
      flex: none;
      display: flex;
      align-items: center;
    }

    .dpk-brand svg {
      display: block;
      height: 24px;
      width: auto;
    }

    /* The title takes what the header has left: the template's header content
       keeps its own width, and only a title too long for the rest ellipsizes.
       Header content with no room beside the title wraps to a row of its own
       rather than being squeezed. */
    .dpk-title {
      flex: 1 1 0%;
      display: flex;
      flex-direction: column;
      gap: 3px;
      min-width: min(160px, 100%);
    }

    .dpk-title h1 {
      font-size: 16px;
      font-weight: 680;
      letter-spacing: -0.02em;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .dpk-header-slot {
      flex: 0 1 auto;
      min-width: 0;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    /* The reader's own controls, in one pill at the end of the row: the
       language select and the theme toggle. */
    .dpk-header-tools {
      display: flex;
      flex: none;
      align-items: center;
      gap: 2px;
      padding: 2px;
      border: 1px solid var(--dpk-rule);
      border-radius: 999px;
      background: var(--dpk-paper-sunken);
    }

    .dpk-lang-select {
      flex: none;
      height: 26px;
      padding: 0 8px 0 10px;
      border: 0;
      border-radius: 999px;
      background: transparent;
      color: var(--dpk-ink-soft);
      font: inherit;
      font-size: 12px;
      font-weight: 520;
      transition:
        color 160ms var(--dpk-ease),
        background-color 160ms var(--dpk-ease);
    }

    .dpk-lang-select:hover {
      color: var(--dpk-ink);
      background-color: var(--dpk-paper-raised);
    }

    .dpk-theme-toggle {
      display: inline-flex;
      flex: none;
      align-items: center;
      justify-content: center;
      width: 26px;
      height: 26px;
      padding: 0;
      border: 0;
      border-radius: 999px;
      background: transparent;
      color: var(--dpk-ink-soft);
      cursor: pointer;
      transition:
        color 160ms var(--dpk-ease),
        background 160ms var(--dpk-ease),
        transform 300ms var(--dpk-ease-spring);
    }

    .dpk-theme-toggle svg {
      width: 14px;
      height: 14px;
    }

    .dpk-theme-toggle:hover {
      color: var(--dpk-ink);
      background: var(--dpk-paper-raised);
      transform: rotate(-18deg);
    }

    .dpk-theme-toggle:focus-visible {
      outline: none;
      box-shadow: var(--dpk-focus);
    }

    /* ------------------------------------------------------------ changes */

    /* Check Mode's toggle and the changes bell are .dpk-chrome-action icon
       buttons: their pressed and open states are that class's own. */

    .dpk-bell-badge {
      position: absolute;
      top: -5px;
      right: -5px;
      min-width: 16px;
      height: 16px;
      padding: 0 3px;
      border: 2px solid var(--dpk-paper);
      border-radius: 999px;
      background: linear-gradient(145deg, var(--dpk-accent-bright), var(--dpk-accent));
      color: var(--dpk-accent-ink);
      font-family: var(--dpk-mono);
      font-size: 9px;
      font-weight: 650;
      font-variant-numeric: tabular-nums;
      line-height: 12px;
      text-align: center;
      animation: dpk-pop 260ms var(--dpk-ease-spring);
    }

    .dpk-changes {
      box-sizing: border-box;
      overflow: auto;
      position: fixed;
      inset: auto;
      margin: 0;
      padding: 12px;
      border: 1px solid var(--dpk-rule-strong);
      border-radius: var(--dpk-radius-lg);
      background: var(--dpk-paper-raised);
      box-shadow: var(--dpk-bevel), var(--dpk-shadow-lg);
      color: var(--dpk-ink);
      font-size: 12.5px;
      animation: dpk-notice-in 180ms var(--dpk-ease);
    }

    .dpk-changes-head {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 8px;
      margin: 0 2px 10px;
    }

    .dpk-changes-head {
      align-items: center;
    }

    .dpk-changes-title {
      margin: 0;
      font-size: inherit;
      font-weight: 650;
    }

    .dpk-changes-read-all.dpk-btn {
      flex: none;
      font-size: 11.5px;
    }

    .dpk-changes-read-all[aria-disabled='true'] {
      opacity: 0.5;
      cursor: default;
      pointer-events: none;
    }

    .dpk-changes-group + .dpk-changes-group {
      margin-top: 14px;
    }

    .dpk-changes-revision {
      display: flex;
      align-items: center;
      gap: 6px;
      margin: 0 2px 6px;
      color: var(--dpk-ink-faint);
      font-family: var(--dpk-mono);
      font-size: 11px;
      font-weight: 500;
    }

    .dpk-changes-revision span:first-child {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .dpk-changes-current {
      flex: none;
      padding: 1px 6px;
      border: 1px solid var(--dpk-rule-strong);
      border-radius: 999px;
      color: var(--dpk-ink-soft);
      font-family: var(--dpk-body);
      font-size: 10px;
    }

    .dpk-changes-list {
      display: grid;
      gap: 6px;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .dpk-change {
      display: grid;
      gap: 4px;
      padding: 9px 10px;
      border: 1px solid var(--dpk-rule);
      border-radius: var(--dpk-radius);
      background: var(--dpk-paper);
    }

    .dpk-change[data-fresh] {
      border-color: color-mix(in srgb, var(--dpk-accent) 35%, transparent);
      background: var(--dpk-accent-soft);
    }

    .dpk-change .dpk-notice-show {
      justify-self: end;
    }

    .dpk-change-title {
      margin: 0;
      font-weight: 600;
      line-height: 1.4;
      overflow-wrap: anywhere;
    }

    .dpk-change-new {
      margin-right: 4px;
      padding: 1px 6px;
      border-radius: 999px;
      background: var(--dpk-accent);
      color: var(--dpk-accent-ink);
      font-size: 10px;
      font-weight: 650;
      vertical-align: 1px;
    }

    .dpk-change-body {
      margin: 0;
      color: var(--dpk-ink-soft);
      line-height: 1.5;
      white-space: pre-line;
      overflow-wrap: anywhere;
    }

    /* Below the review button, at the top right where the bell is. */
    .dpk-toasts {
      position: fixed;
      top: 64px;
      right: 16px;
      z-index: 70;
      display: grid;
      justify-items: end;
      gap: 8px;
      width: min(360px, calc(100vw - 32px));
      pointer-events: none;
    }

    .dpk-toast {
      box-sizing: border-box;
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto auto;
      align-items: start;
      gap: 10px;
      width: 100%;
      padding: 10px 8px 10px 12px;
      border: 1px solid var(--dpk-rule-strong);
      border-radius: var(--dpk-radius-lg);
      background: var(--dpk-paper-raised);
      box-shadow: var(--dpk-bevel), var(--dpk-shadow-lg);
      color: var(--dpk-ink);
      font-size: 12.5px;
      pointer-events: auto;
      animation: dpk-notice-in 260ms var(--dpk-ease);
    }

    .dpk-toast-icon {
      display: inline-flex;
      padding-top: 2px;
      color: var(--dpk-accent);
    }

    .dpk-toast-icon svg {
      width: 14px;
      height: 14px;
    }

    .dpk-toast-text {
      display: grid;
      gap: 2px;
    }

    .dpk-toast .dpk-change-body {
      display: -webkit-box;
      overflow: hidden;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
    }

    .dpk-toast-close {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      padding: 0;
      border: 0;
      border-radius: 999px;
      background: transparent;
      color: var(--dpk-ink-faint);
      cursor: pointer;
    }

    .dpk-toast-close svg {
      width: 12px;
      height: 12px;
    }

    .dpk-toast-close:hover {
      color: var(--dpk-ink);
      background: var(--dpk-paper-sunken);
    }

    .dpk-toast-close:focus-visible {
      outline: none;
      box-shadow: var(--dpk-focus);
    }

    .dpk-toast-actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: end;
      gap: 6px;
    }

    .dpk-toast-more {
      padding: 4px 10px;
      border: 1px solid var(--dpk-rule-strong);
      border-radius: 999px;
      background: var(--dpk-paper-raised);
      color: var(--dpk-ink-soft);
      font: inherit;
      font-size: 11.5px;
      cursor: pointer;
      pointer-events: auto;
    }

    .dpk-toast-more:hover {
      color: var(--dpk-ink);
    }

    .dpk-toast-more:focus-visible {
      outline: none;
      box-shadow: var(--dpk-focus);
    }

    @keyframes dpk-notice-in {
      from {
        opacity: 0;
        transform: translateY(-6px) scale(0.98);
      }
    }

    /* --------------------------------------------------------------- body */

    /*
     * The body is \`<dpk-internal-layout-sidebar>\`: it owns the sidebars' width, fold,
     * drawer and stacking. The shell only fills the two columns.
     */
    .dpk-body {
      flex: 1 1 auto;
    }

    /* Spans the sidebar's content, so its badge layer scrolls with it. */
    .dpk-sidebar {
      position: relative;
    }

    .dpk-main {
      display: flex;
      flex-direction: column;
      min-width: 0;
      /* A faint wash of the accent from the top left corner gives the ground some depth. */
      background:
        radial-gradient(
          ellipse 900px 360px at 0% 0%,
          color-mix(in srgb, var(--dpk-accent) 5%, transparent),
          transparent 70%
        ),
        radial-gradient(
          ellipse 700px 320px at 100% 0%,
          color-mix(in srgb, var(--dpk-blue) 4%, transparent),
          transparent 70%
        ),
        var(--dpk-paper);
      background-attachment: local;
    }

    .dpk-main-body {
      flex: 1 0 auto;
      display: grid;
      /* The column is as wide as the page, not as its widest unbreakable line. */
      grid-template-columns: minmax(0, 1fr);
      align-content: start;
      gap: 16px;
      min-width: 0;
      padding: var(--dpk-main-padding, 24px);
      animation: dpk-rise 420ms var(--dpk-ease) backwards;
    }

    /*
     * A template whose main column is one canvas (\`mainLayout\` \`fill\`): the
     * canvas fills it edge to edge and pans inside, so nothing pads or scrolls.
     */
    .dpk-main-body[data-fill] {
      flex: 1 1 auto;
      min-height: 0;
      display: flex;
      flex-direction: column;
      padding: 0;
      gap: 0;
    }

    /*
     * Scrolled to the end, the last of the content clears the hand-off dock
     * floating over the bottom right. \`--dpk-dock-clearance\` is how far up
     * that is; it reaches into components too, and a template's own floating
     * controls rise by it. \`:where\` lets a full-bleed template keep no padding.
     */
    .dpk-shell:has(> .dpk-overlay > .dpk-dock) {
      --dpk-dock-clearance: 64px;
    }

    :where(.dpk-shell:has(> .dpk-overlay > .dpk-dock)) .dpk-main-body:where(:not([data-fill])) {
      padding-bottom: calc(24px + var(--dpk-dock-clearance));
    }

    @keyframes dpk-rise {
      from {
        opacity: 0;
        transform: translateY(6px);
      }
    }

    /*
     * Supplements. They sit at the end of the main column and stick to the
     * bottom of the scrollport as a bar the full width of the column, edge to
     * edge: always in reach and never stealing height from the preview. The bar
     * names each supplement; the one opened grows upward over the content at
     * one height for every tab, so switching tabs never moves the drawer.
     */
    .dpk-supplements {
      position: sticky;
      bottom: 0;
      z-index: 5;
      margin-top: auto;
      /* A faint amber wash over the whole bar marks it as the author's aside. */
      border-top: 1px solid color-mix(in srgb, var(--dpk-amber) 28%, var(--dpk-rule-strong));
      background: color-mix(in srgb, color-mix(in srgb, var(--dpk-amber) 7%, var(--dpk-paper-raised)) 94%, transparent);
      backdrop-filter: blur(12px);
      box-shadow: 0 -8px 24px -18px color-mix(in srgb, var(--dpk-ink) 40%, transparent);
    }

    .dpk-supplements[hidden] {
      display: none;
    }

    /*
     * The drawer's top edge: dragged (or moved with the arrow keys) to resize
     * it. It straddles the border above the bar and takes no room of its own,
     * so the bar's tabs stay clickable and the drawer stays where it sticks.
     */
    .dpk-supplements-edge {
      position: absolute;
      top: -4px;
      left: 0;
      right: 0;
      z-index: 1;
      height: 9px;
      cursor: ns-resize;
      touch-action: none;
    }

    .dpk-supplements-edge[hidden] {
      display: none;
    }

    /* A short grip centred on the edge, so the drawer reads as resizable. */
    .dpk-supplements-edge::after {
      content: '';
      position: absolute;
      top: 3px;
      left: 50%;
      width: 46px;
      height: 3px;
      margin-left: -23px;
      border-radius: 2px;
      background: color-mix(in srgb, var(--dpk-amber) 55%, var(--dpk-rule-strong));
      transition: background 160ms var(--dpk-ease);
    }

    .dpk-supplements-edge:hover::after,
    .dpk-supplements-edge:focus-visible::after,
    .dpk-supplements-edge[data-dragging]::after {
      background: var(--dpk-accent);
    }

    /* The ring hugs the grip: a ring around the whole edge would read as a border on the page. */
    .dpk-supplements-edge:focus-visible {
      outline: none;
    }

    .dpk-supplements-edge:focus-visible::after {
      box-shadow: var(--dpk-focus);
    }

    /* While dragging, nothing underneath (the page, a board) reacts to the pointer. */
    .dpk-supplements-edge[data-dragging] ~ .dpk-supplements-body {
      user-select: none;
    }

    .dpk-supplements-bar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 2px;
      /* Clear of the hand-off dock at the bottom right while it is shown. */
      padding: 5px calc(16px + var(--dpk-dock-space, 0px)) 5px 10px;
      color: var(--dpk-ink-soft);
    }

    .dpk-supplements-toggle {
      flex: none;
      display: grid;
      place-items: center;
      width: 24px;
      height: 24px;
      margin-right: 2px;
      border: 0;
      border-radius: 7px;
      padding: 0;
      background: transparent;
      color: inherit;
      cursor: pointer;
    }

    .dpk-supplements-toggle:hover {
      color: var(--dpk-ink);
      background: color-mix(in srgb, var(--dpk-amber) 10%, transparent);
    }

    .dpk-supplements-toggle:focus-visible {
      outline: none;
      box-shadow: var(--dpk-focus);
    }

    .dpk-supplements-toggle svg {
      width: 14px;
      height: 14px;
      transition: transform 160ms var(--dpk-ease);
    }

    .dpk-supplements[data-open] .dpk-supplements-toggle svg {
      transform: rotate(90deg);
    }

    .dpk-supplement-tab {
      position: relative;
      border: 0;
      border-radius: 7px;
      padding: 4px 10px;
      background: transparent;
      font: inherit;
      font-size: 12.5px;
      font-weight: 600;
      color: inherit;
      cursor: pointer;
      user-select: none;
    }

    /* A rule between neighbours reads the names as one row: ERD | Checklist | Sequence. */
    .dpk-supplement-tab + .dpk-supplement-tab::before {
      content: '';
      position: absolute;
      top: 25%;
      bottom: 25%;
      left: -1px;
      width: 1px;
      background: var(--dpk-rule-strong);
    }

    .dpk-supplement-tab:hover {
      color: var(--dpk-ink);
      background: color-mix(in srgb, var(--dpk-amber) 10%, transparent);
    }

    .dpk-supplement-tab[aria-expanded='true'] {
      color: var(--dpk-ink);
      background: color-mix(in srgb, var(--dpk-amber) 18%, transparent);
    }

    .dpk-supplement-tab:hover::before,
    .dpk-supplement-tab[aria-expanded='true']::before,
    .dpk-supplement-tab:hover + .dpk-supplement-tab::before,
    .dpk-supplement-tab[aria-expanded='true'] + .dpk-supplement-tab::before {
      visibility: hidden;
    }

    .dpk-supplement-tab:focus-visible {
      outline: none;
      box-shadow: var(--dpk-focus);
    }

    /*
     * One height for the open supplement, the reader's, not the content's: a
     * shorter one leaves the rest of the drawer empty and a taller one scrolls
     * inside, so a tab switch never resizes the drawer. The max-height keeps
     * the same reserve above the drawer that SUPPLEMENT_HEIGHT clamps against,
     * so a window shrinking mid-drag cannot push the page off screen.
     */
    .dpk-supplements-body {
      height: var(--dpk-supplement-height, 320px);
      max-height: calc(100dvh - 160px);
      overflow: auto;
      overscroll-behavior: contain;
      padding: 4px 16px 16px;
      /*
       * The dock floats over the bottom of what is open; showing it must not
       * resize that. Components lift the controls along their bottom edge by
       * this much instead.
       */
      --dpk-dock-overlap: var(--dpk-dock-clearance, 0px);
      font-size: 12.5px;
      line-height: 1.7;
      color: var(--dpk-ink-soft);
    }

    .dpk-supplements-body[hidden] {
      display: none;
    }

    .dpk-supplements ::slotted(*) {
      display: block;
      max-width: 100%;
    }

    .dpk-orphans {
      margin-top: 16px;
      border: 1px dashed var(--dpk-rule-strong);
      border-radius: var(--dpk-radius);
      padding: 12px;
    }

    .dpk-banner {
      display: grid;
      gap: 4px;
      margin-bottom: 14px;
      border: 1px solid color-mix(in srgb, var(--dpk-danger) 35%, transparent);
      border-radius: var(--dpk-radius);
      background: linear-gradient(90deg, var(--dpk-danger) 0 3px, transparent 3px), var(--dpk-danger-soft);
      padding: 12px 14px 12px 17px;
      max-width: 900px;
    }

    .dpk-banner strong {
      font-size: 13px;
      color: var(--dpk-danger);
    }

    .dpk-banner code {
      font-family: var(--dpk-mono);
      font-size: 11px;
      color: var(--dpk-ink-soft);
      overflow-wrap: anywhere;
    }

    /* ------------------------------------------------------------- footer */

    .dpk-footer {
      border-top: 1px solid var(--dpk-rule);
      padding: 10px 20px;
      display: flex;
      gap: 12px;
      align-items: center;
      background: var(--dpk-glass);
      backdrop-filter: blur(12px);
      font-size: 12px;
      color: var(--dpk-ink-faint);
    }

    /* --------------------------------------------------- floating review */

    /* The review floats over the page from its toggles, as tall as the screen
       allows: the main column keeps its whole width while it is open. The
       popover positions it; this only shapes the surface. */
    .dpk-review {
      box-sizing: border-box;
      position: fixed;
      inset: auto;
      margin: 0;
      padding: 0;
      height: 100dvh;
      overflow: hidden;
      border: 1px solid var(--dpk-rule-strong);
      border-radius: var(--dpk-radius-lg);
      background: var(--dpk-paper-raised);
      box-shadow: var(--dpk-bevel), var(--dpk-shadow-lg);
      color: var(--dpk-ink);
    }

    .dpk-review:popover-open {
      display: flex;
      animation: dpk-review-in 180ms var(--dpk-ease);
    }

    @keyframes dpk-review-in {
      from {
        opacity: 0;
        transform: translateY(-6px);
      }
    }

    .dpk-review > dpk-comment-panel {
      flex: 1 1 auto;
    }

    .dpk-review-toggles {
      display: flex;
      gap: 6px;
    }

    .dpk-undo-redo {
      display: flex;
      gap: 6px;
    }

    .dpk-chrome-action {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      padding: 0;
      border: 1px solid var(--dpk-rule-strong);
      border-radius: 10px;
      background: var(--dpk-paper-raised);
      color: var(--dpk-ink-soft);
      box-shadow: var(--dpk-bevel), var(--dpk-shadow-sm);
      cursor: pointer;
      transition:
        color 180ms var(--dpk-ease),
        background 180ms var(--dpk-ease),
        border-color 180ms var(--dpk-ease),
        box-shadow 180ms var(--dpk-ease),
        transform 220ms var(--dpk-ease-spring);
    }

    .dpk-chrome-action svg {
      width: 16px;
      height: 16px;
    }

    .dpk-chrome-action:hover {
      color: var(--dpk-ink);
      border-color: var(--dpk-rule-hover);
      transform: translateY(-1px);
      box-shadow: var(--dpk-bevel), var(--dpk-shadow);
    }

    .dpk-chrome-action:active {
      transform: translateY(0) scale(0.95);
      box-shadow: var(--dpk-shadow-xs);
    }

    .dpk-chrome-action:focus-visible {
      outline: none;
      box-shadow: var(--dpk-focus);
    }

    .dpk-chrome-action:disabled {
      color: var(--dpk-ink-faint);
      cursor: default;
      box-shadow: none;
      transform: none;
    }

    .dpk-chrome-action:disabled:hover {
      color: var(--dpk-ink-faint);
      border-color: var(--dpk-rule-strong);
      transform: none;
      box-shadow: none;
    }

    .dpk-chrome-action[aria-pressed='true'],
    .dpk-chrome-action[aria-expanded='true'] {
      color: var(--dpk-accent-ink);
      border-color: color-mix(in srgb, var(--dpk-accent-strong) 70%, transparent);
      background: linear-gradient(145deg, var(--dpk-accent-bright), var(--dpk-accent-strong));
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.25),
        0 6px 16px -6px color-mix(in srgb, var(--dpk-accent) 70%, transparent);
    }

    .dpk-chrome-action[aria-pressed='true']:hover,
    .dpk-chrome-action[aria-expanded='true']:hover {
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.25),
        0 10px 22px -8px color-mix(in srgb, var(--dpk-accent) 80%, transparent);
    }

    .dpk-review-badge {
      position: absolute;
      top: -6px;
      right: -6px;
      min-width: 18px;
      height: 18px;
      padding: 0 4px;
      border: 2px solid var(--dpk-paper);
      border-radius: 999px;
      background: linear-gradient(145deg, var(--dpk-accent-bright), var(--dpk-accent));
      color: var(--dpk-accent-ink);
      font-family: var(--dpk-mono);
      font-size: 9.5px;
      font-weight: 650;
      font-variant-numeric: tabular-nums;
      line-height: 14px;
      text-align: center;
      white-space: nowrap;
      box-shadow: 0 3px 8px -2px color-mix(in srgb, var(--dpk-accent) 60%, transparent);
      animation: dpk-pop 260ms var(--dpk-ease-spring);
    }

    @keyframes dpk-pop {
      from {
        transform: scale(0.4);
        opacity: 0;
      }
    }

    /* What an icon button does, named below it on hover or keyboard focus. */
    .dpk-chrome-action[data-tooltip]::after {
      content: attr(data-tooltip);
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      padding: 4px 8px;
      border-radius: var(--dpk-radius-sm);
      background: var(--dpk-ink);
      color: var(--dpk-paper);
      font-size: 11.5px;
      font-weight: 600;
      line-height: 1.4;
      white-space: nowrap;
      box-shadow: var(--dpk-shadow-sm);
      pointer-events: none;
      opacity: 0;
      transform: translateY(-2px);
      transition:
        opacity 120ms var(--dpk-ease),
        transform 120ms var(--dpk-ease);
    }

    .dpk-chrome-action[data-tooltip]:hover::after,
    .dpk-chrome-action[data-tooltip]:focus-visible::after {
      opacity: 1;
      transform: none;
      transition-delay: 250ms;
    }

    /* ----------------------------------------------------------- settings */

    .dpk-settings {
      box-sizing: border-box;
      overflow: auto;
      position: fixed;
      inset: auto;
      margin: 0;
      padding: 6px;
      border: 1px solid var(--dpk-rule-strong);
      border-radius: var(--dpk-radius-lg);
      background: var(--dpk-paper-raised);
      box-shadow: var(--dpk-bevel), var(--dpk-shadow-lg);
      color: var(--dpk-ink);
    }

    .dpk-settings:popover-open {
      display: grid;
      align-content: start;
      gap: 2px;
      animation: dpk-review-in 180ms var(--dpk-ease);
    }

    .dpk-settings-option {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      width: 100%;
      padding: 8px;
      border: 0;
      border-radius: var(--dpk-radius-sm);
      background: none;
      color: var(--dpk-ink);
      font: inherit;
      text-align: left;
      cursor: pointer;
    }

    .dpk-settings-option:hover,
    .dpk-settings-option:focus-visible {
      outline: none;
      background: var(--dpk-paper-sunken);
    }

    .dpk-settings-check {
      flex: none;
      display: inline-grid;
      place-items: center;
      width: 16px;
      height: 16px;
      margin-top: 1px;
      border: 1px solid var(--dpk-rule-strong);
      border-radius: 4px;
      background: var(--dpk-paper-raised);
    }

    .dpk-settings-option[aria-checked='true'] .dpk-settings-check {
      border-color: var(--dpk-accent-strong);
      background: var(--dpk-accent-strong);
      color: var(--dpk-accent-ink);
    }

    .dpk-settings-check svg {
      width: 12px;
      height: 12px;
      stroke-width: 3;
    }

    .dpk-settings-text {
      display: grid;
      gap: 2px;
      min-width: 0;
    }

    .dpk-settings-name {
      font-size: 13px;
      font-weight: 650;
    }

    .dpk-settings-hint {
      color: var(--dpk-ink-soft);
      font-size: 11.5px;
      line-height: 1.45;
    }

    .dpk-settings-note {
      margin: 4px 8px;
      padding-top: 8px;
      border-top: 1px solid var(--dpk-rule);
      color: var(--dpk-ink-faint);
      font-size: 11px;
      line-height: 1.45;
    }

    /* ------------------------------------------------------ hand-off dock */

    .dpk-dock {
      position: fixed;
      right: 16px;
      bottom: 16px;
      z-index: 60;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 8px;
      max-width: calc(100vw - 32px);
      animation: dpk-dock-in 260ms var(--dpk-ease) backwards;
    }

    @keyframes dpk-dock-in {
      from {
        transform: translateY(8px);
        opacity: 0;
      }
    }

    .dpk-dock-actions {
      display: flex;
      gap: 6px;
      padding: 6px;
      border: 1px solid var(--dpk-rule-strong);
      border-radius: var(--dpk-radius-lg);
      background: var(--dpk-glass);
      backdrop-filter: blur(12px);
      box-shadow: var(--dpk-bevel), var(--dpk-shadow-lg);
    }

    .dpk-dock-note {
      max-width: 320px;
      margin: 0;
      padding: 8px 12px;
      border: 1px solid var(--dpk-rule-strong);
      border-radius: var(--dpk-radius);
      background: var(--dpk-paper-raised);
      box-shadow: var(--dpk-shadow);
      color: var(--dpk-ink-soft);
      font-size: 12px;
      line-height: 1.6;
    }

    /* ---------------------------------------------------------- questions */

    /* The questions the page asks, in the review popover beside the changes and
       the review comments. The comment panel stays mounted (it holds the
       composer's unsent text) but steps aside. */
    .dpk-review[data-section='questions'] > dpk-comment-panel {
      display: none;
    }

    .dpk-grill {
      display: flex;
      flex-direction: column;
      flex: 1 1 auto;
      min-width: 0;
      min-height: 0;
    }

    .dpk-grill-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 14px 16px 12px;
      border-bottom: 1px solid var(--dpk-rule);
      background: var(--dpk-glass);
      backdrop-filter: blur(12px);
      box-shadow: 0 1px 0 var(--dpk-highlight) inset;
    }

    .dpk-grill-head h2 {
      margin: 0;
      font-size: 13.5px;
      font-weight: 660;
      letter-spacing: -0.015em;
    }

    .dpk-grill-progress {
      font-family: var(--dpk-mono);
      font-size: 11px;
      font-variant-numeric: tabular-nums;
      color: var(--dpk-ink-faint);
    }

    /* With earlier rounds, a select of rounds: the current one first. */
    .dpk-grill-rounds {
      flex-shrink: 0;
      padding: 10px 10px 0;
    }

    .dpk-grill-round {
      width: 100%;
      background: var(--dpk-paper-sunken);
      font-size: 11.5px;
    }

    .dpk-grill-round-note {
      margin: 4px 0 2px;
      padding: 0 8px;
      font-size: 10.5px;
      line-height: 1.6;
      color: var(--dpk-ink-faint);
    }

    .dpk-grill-list {
      flex: 1;
      min-height: 0;
      overflow: auto;
      overscroll-behavior: contain;
      padding: 2px 10px 12px;
    }

    .dpk-grill-empty {
      margin: 0;
      padding: 22px 8px;
      text-align: center;
      font-size: 12px;
      color: var(--dpk-ink-faint);
    }

    .dpk-grill-question {
      margin: 6px 0;
      border: 1px solid transparent;
      border-radius: var(--dpk-radius);
      transition:
        background 140ms var(--dpk-ease),
        border-color 140ms var(--dpk-ease);
    }

    .dpk-grill-question:has(.dpk-grill-heading[aria-expanded='true']) {
      border-color: var(--dpk-rule);
      background: var(--dpk-paper-raised);
      box-shadow: var(--dpk-bevel), var(--dpk-shadow-xs);
    }

    .dpk-grill-heading {
      display: flex;
      align-items: flex-start;
      gap: 9px;
      width: 100%;
      padding: 10px 8px;
      border: 0;
      border-radius: var(--dpk-radius-sm);
      background: none;
      text-align: left;
      cursor: pointer;
    }

    .dpk-grill-heading:hover {
      background: var(--dpk-paper-sunken);
    }

    .dpk-grill-question:has(.dpk-grill-heading[aria-expanded='true']) .dpk-grill-heading:hover {
      background: none;
    }

    .dpk-grill-ref {
      flex: 0 0 auto;
      display: grid;
      place-items: center;
      min-width: 30px;
      height: 22px;
      padding: 0 6px;
      border: 1px solid var(--dpk-rule-strong);
      border-radius: 999px;
      background: var(--dpk-paper-sunken);
      font-family: var(--dpk-mono);
      font-size: 10px;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      color: var(--dpk-ink-faint);
      box-shadow: inset 0 1px 2px var(--dpk-shade-1);
      transition:
        background 140ms var(--dpk-ease),
        color 140ms var(--dpk-ease),
        border-color 140ms var(--dpk-ease),
        box-shadow 140ms var(--dpk-ease);
    }

    .dpk-grill-question[data-answered='true'] .dpk-grill-ref {
      border-color: transparent;
      background: linear-gradient(180deg, var(--dpk-green-soft), color-mix(in srgb, var(--dpk-green) 16%, transparent));
      color: var(--dpk-green);
      box-shadow: var(--dpk-bevel);
    }

    .dpk-grill-question:has(.dpk-grill-heading[aria-expanded='true']) .dpk-grill-ref {
      border-color: transparent;
      background: linear-gradient(180deg, var(--dpk-accent-bright), var(--dpk-accent));
      color: var(--dpk-accent-ink);
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.24),
        0 2px 6px -2px color-mix(in srgb, var(--dpk-accent) 55%, transparent);
    }

    .dpk-grill-heading-text {
      flex: 1;
      min-width: 0;
    }

    .dpk-grill-heading-text strong {
      display: block;
      font-size: 12.5px;
      font-weight: 620;
      line-height: 1.6;
      letter-spacing: -0.005em;
    }

    .dpk-grill-summary {
      display: block;
      margin-top: 4px;
      font-size: 10.5px;
      line-height: 1.6;
      color: var(--dpk-green);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .dpk-grill-chevron {
      flex: 0 0 auto;
      width: 16px;
      color: var(--dpk-ink-faint);
      line-height: 22px;
      text-align: center;
    }

    .dpk-grill-chevron svg {
      display: block;
      width: 13px;
      height: 13px;
      margin: 4.5px auto 0;
      transition: transform 180ms var(--dpk-ease);
    }

    .dpk-grill-heading[aria-expanded='true'] .dpk-grill-chevron svg {
      transform: rotate(90deg);
      color: var(--dpk-accent);
    }

    .dpk-grill-body {
      padding: 2px 8px 14px 47px;
      animation: dpk-grill-open 180ms var(--dpk-ease) backwards;
    }

    @keyframes dpk-grill-open {
      from {
        opacity: 0;
        transform: translateY(-4px);
      }
    }

    .dpk-grill-description {
      margin: 0 0 8px;
      font-size: 11.5px;
      line-height: 1.85;
      color: var(--dpk-ink-soft);
    }

    .dpk-grill-note {
      margin: 0 0 10px;
      padding: 7px 10px;
      border: 1px solid color-mix(in srgb, var(--dpk-amber) 30%, transparent);
      border-radius: var(--dpk-radius-sm);
      background: var(--dpk-amber-soft);
      font-size: 11px;
      line-height: 1.7;
      color: var(--dpk-ink-soft);
    }

    .dpk-grill-choices {
      display: grid;
      gap: 6px;
    }

    .dpk-grill-choice {
      position: relative;
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 8px 9px;
      border: 1px solid var(--dpk-rule);
      border-radius: var(--dpk-radius-sm);
      background: var(--dpk-paper);
      font-size: 11.5px;
      line-height: 1.7;
      cursor: pointer;
      overflow: hidden;
      transition:
        border-color 140ms var(--dpk-ease),
        background 140ms var(--dpk-ease),
        box-shadow 140ms var(--dpk-ease),
        transform 140ms var(--dpk-ease);
    }

    .dpk-grill-choice:hover {
      border-color: var(--dpk-rule-hover);
      background: var(--dpk-paper-inset);
    }

    .dpk-grill-choice:has(input:checked) {
      border-color: color-mix(in srgb, var(--dpk-green) 45%, transparent);
      background: var(--dpk-green-soft);
      box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--dpk-green) 30%, transparent);
    }

    .dpk-grill-choice[data-free] {
      border-style: dashed;
    }

    .dpk-grill-choice[data-free='true'] {
      border-style: solid;
    }

    .dpk-grill-choice input {
      flex: 0 0 auto;
      margin: 3px 0 0;
      accent-color: var(--dpk-green);
    }

    .dpk-grill-choice-text {
      display: flex;
      gap: 7px;
      min-width: 0;
    }

    .dpk-grill-letter {
      flex: 0 0 auto;
      font-family: var(--dpk-mono);
      font-size: 10px;
      font-weight: 600;
      line-height: 1.9;
      color: var(--dpk-green);
    }

    /* An earlier round: a disclosure per question, nothing to answer with. */
    .dpk-grill-question[data-past] > summary {
      list-style: none;
    }

    .dpk-grill-question[data-past] > summary::-webkit-details-marker {
      display: none;
    }

    .dpk-grill-question[data-past][open] {
      border-color: var(--dpk-rule);
      background: var(--dpk-paper-raised);
      box-shadow: var(--dpk-bevel), var(--dpk-shadow-xs);
    }

    .dpk-grill-question[data-past][open] .dpk-grill-heading:hover {
      background: none;
    }

    .dpk-grill-question[data-past][open] .dpk-grill-chevron svg {
      transform: rotate(90deg);
    }

    .dpk-grill-question[data-past][open] .dpk-grill-summary {
      display: none;
    }

    .dpk-grill-question[data-past][data-answered='false'] .dpk-grill-summary {
      color: var(--dpk-ink-faint);
    }

    .dpk-grill-past-choices {
      display: grid;
      gap: 6px;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .dpk-grill-past-choice {
      display: flex;
      gap: 7px;
      margin: 0;
      padding: 7px 9px;
      border: 1px solid var(--dpk-rule);
      border-radius: var(--dpk-radius-sm);
      font-size: 11.5px;
      line-height: 1.7;
      color: var(--dpk-ink-faint);
    }

    .dpk-grill-past-choice[data-checked='true'] {
      border-color: color-mix(in srgb, var(--dpk-green) 45%, transparent);
      background: var(--dpk-green-soft);
      color: var(--dpk-ink);
    }

    .dpk-grill-past-free {
      margin-top: 6px;
      white-space: pre-wrap;
    }

    .dpk-grill-free {
      margin-top: 7px;
      min-height: 76px;
      max-height: 240px;
    }

    .dpk-grill-clear {
      margin-top: 10px;
      padding: 0;
      border: 0;
      background: none;
      color: var(--dpk-ink-faint);
      font-size: 10.5px;
      text-decoration: underline;
      text-underline-offset: 3px;
      cursor: pointer;
    }

    .dpk-grill-clear:hover {
      color: var(--dpk-ink);
    }

    /* The hand-off at the foot of the questions: the comment panel's own is hidden. */
    .dpk-grill-footer {
      flex-shrink: 0;
      display: grid;
      gap: 8px;
      padding: 10px 12px;
      border-top: 1px solid var(--dpk-rule);
      background: var(--dpk-paper-raised);
      box-shadow: 0 -6px 12px -10px var(--dpk-shade-2);
    }

    .dpk-grill-footer .dpk-dock-actions {
      padding: 0;
      border: 0;
      background: none;
      backdrop-filter: none;
      box-shadow: none;
    }

    .dpk-grill-footer .dpk-dock-actions > .dpk-btn {
      flex: 1;
      min-width: 0;
    }

    .dpk-grill-footer .dpk-dock-note {
      max-width: none;
      box-shadow: none;
    }

    /* --------------------------------------------------------- Q badges */

    /* A badge is a child of its mark's own box (the shared portal in
       \`./badge-portal\`), so this column only has to be a containing block for
       the author's own markup and to reserve the badges' column when they sit
       in it. A filled main column is a canvas or a board, which places its own
       badges and has its own gutter. */
    .dpk-main-body {
      position: relative;
    }

    /* Badges on the author's own markup stand in a column of their own on the
       right, beside the line they mark, so they never cover its words. */
    .dpk-main-body[data-dpk-badge-gutter]:not([data-fill]) {
      padding-right: 56px;
    }

    @media (max-width: 720px) {
      /* The title takes the first row whole; the reader's tools wrap below it. */
      .dpk-title {
        flex: 1 0 100%;
      }

      .dpk-brand {
        display: none;
      }

      /* The template's own content goes last, so a long one cannot push the
         reader's tools below it. */
      .dpk-header-slot {
        order: 1;
      }
    }
  `,
];
