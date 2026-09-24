/**
 * Shell chrome styles: the shadow-DOM look of every `dpk-template-*` element.
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

    .dpk-shell {
      display: grid;
      grid-template-rows: auto minmax(0, 1fr) auto;
      min-height: 100%;
      max-height: 100%;
    }

    /* ------------------------------------------------------------- header */

    .dpk-header {
      position: relative;
      z-index: 20;
      display: flex;
      align-items: center;
      gap: 14px;
      min-height: 60px;
      /* Right padding keeps the header content clear of the fixed review button. */
      padding: 10px 72px 10px 16px;
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

    /* Kit mark: a stack of pages, the single HTML page the agent wrote. */
    .dpk-brand {
      position: relative;
      flex: none;
      width: 32px;
      height: 32px;
      border-radius: 9px;
      background:
        radial-gradient(circle at 30% 20%, rgba(255, 255, 255, 0.35), transparent 60%),
        linear-gradient(145deg, var(--dpk-accent-bright), var(--dpk-accent-strong));
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.3),
        inset 0 -1px 0 rgba(0, 0, 0, 0.12),
        0 4px 12px -4px color-mix(in srgb, var(--dpk-accent) 70%, transparent);
    }

    .dpk-brand::before,
    .dpk-brand::after {
      content: '';
      position: absolute;
      width: 12px;
      height: 15px;
      border-radius: 3px;
    }

    .dpk-brand::before {
      left: 12px;
      top: 7px;
      background: rgba(255, 255, 255, 0.4);
    }

    .dpk-brand::after {
      left: 8px;
      top: 10px;
      background:
        linear-gradient(var(--dpk-accent), var(--dpk-accent)) 3px 4px / 6px 1.5px no-repeat,
        linear-gradient(var(--dpk-accent), var(--dpk-accent)) 3px 7.5px / 4px 1.5px no-repeat,
        #fff;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.22);
    }

    .dpk-title {
      display: flex;
      flex-direction: column;
      gap: 3px;
      min-width: 0;
    }

    .dpk-title h1 {
      font-size: 16px;
      font-weight: 680;
      letter-spacing: -0.02em;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .dpk-template-mark {
      align-self: flex-start;
      font-family: var(--dpk-mono);
      font-size: 9.5px;
      font-weight: 600;
      letter-spacing: 0.14em;
      line-height: 1;
      text-transform: uppercase;
      color: var(--dpk-accent);
    }

    .dpk-header-slot {
      flex: 1;
      min-width: 0;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .dpk-header-meta {
      display: flex;
      align-items: center;
      gap: 0;
      margin-left: auto;
      padding: 3px;
      border-radius: 999px;
      border: 1px solid var(--dpk-rule);
      background: var(--dpk-paper-sunken);
      font-family: var(--dpk-mono);
      font-size: 10px;
      letter-spacing: 0.02em;
      color: var(--dpk-ink-faint);
      white-space: nowrap;
    }

    .dpk-header-meta span {
      padding: 3px 9px;
    }

    .dpk-header-meta span + span {
      border-left: 1px solid var(--dpk-rule);
    }

    .dpk-header-meta .dpk-meta-count {
      margin-left: 2px;
      border-left: 0;
      border-radius: 999px;
      background: var(--dpk-paper-raised);
      color: var(--dpk-ink-soft);
      box-shadow: var(--dpk-bevel), var(--dpk-shadow-xs);
    }

    .dpk-header-meta .dpk-meta-count[data-active='true'] {
      background: var(--dpk-accent-soft);
      color: var(--dpk-accent);
      box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--dpk-accent) 25%, transparent);
    }

    .dpk-header-tools {
      display: flex;
      flex: none;
      align-items: center;
      gap: 2px;
      padding: 3px;
      border: 1px solid var(--dpk-rule);
      border-radius: 999px;
      background: var(--dpk-paper-sunken);
    }

    .dpk-lang-select {
      flex: none;
      height: 26px;
      padding: 0 24px 0 10px;
      border: 0;
      border-radius: 999px;
      background: transparent
        url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 12 12'><path d='M3 4.5 6 7.5 9 4.5' fill='none' stroke='%23878e9e' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/></svg>")
        no-repeat right 8px center;
      appearance: none;
      color: var(--dpk-ink-soft);
      font: inherit;
      font-size: 12px;
      font-weight: 520;
      cursor: pointer;
      transition:
        color 160ms var(--dpk-ease),
        background-color 160ms var(--dpk-ease);
    }

    .dpk-lang-select:hover {
      color: var(--dpk-ink);
      background-color: var(--dpk-paper-raised);
    }

    .dpk-lang-select:focus-visible {
      outline: none;
      box-shadow: var(--dpk-focus);
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

    /* --------------------------------------------------------------- body */

    .dpk-body {
      display: flex;
      min-height: 0;
    }

    .dpk-sidebar {
      width: 260px;
      flex: 0 0 auto;
      border-right: 1px solid var(--dpk-rule);
      background: var(--dpk-paper-sunken);
      overflow: auto;
      padding: 18px 14px;
      scrollbar-width: thin;
    }

    .dpk-sidebar[hidden] {
      display: none;
    }

    .dpk-main {
      flex: 1 1 0%;
      display: flex;
      flex-direction: column;
      min-width: 0;
      overflow: auto;
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
      align-content: start;
      gap: 16px;
      min-width: 0;
      padding: 24px;
      animation: dpk-rise 420ms var(--dpk-ease) backwards;
    }

    @keyframes dpk-rise {
      from {
        opacity: 0;
        transform: translateY(6px);
      }
    }

    /*
     * Author memo. It sits at the end of the main column and sticks to the
     * bottom of the scrollport: always visible, floating over whatever scrolls
     * behind it, and never stealing height from the preview.
     */
    .dpk-memo {
      position: sticky;
      bottom: 0;
      z-index: 5;
      padding: 0 20px 20px;
      pointer-events: none;
    }

    .dpk-memo[hidden] {
      display: none;
    }

    .dpk-memo ::slotted(*) {
      display: block;
      max-width: 100%;
      padding: 12px 16px 12px 18px;
      border: 1px solid var(--dpk-rule-strong);
      border-radius: var(--dpk-radius-lg);
      background:
        linear-gradient(90deg, var(--dpk-amber) 0 3px, transparent 3px),
        color-mix(in srgb, var(--dpk-paper-raised) 88%, transparent);
      backdrop-filter: blur(12px);
      box-shadow: var(--dpk-bevel), var(--dpk-shadow-lg);
      font-size: 12.5px;
      line-height: 1.7;
      color: var(--dpk-ink-soft);
      pointer-events: auto;
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

    .dpk-notes {
      flex: 0 0 auto;
      width: 360px;
      border-left: 1px solid var(--dpk-rule);
      background: var(--dpk-paper-raised);
      box-shadow: -12px 0 32px -24px var(--dpk-shade-3);
      overflow: hidden;
      display: flex;
      animation: dpk-slide-in 260ms var(--dpk-ease) backwards;
    }

    @keyframes dpk-slide-in {
      from {
        opacity: 0;
        transform: translateX(16px);
      }
    }

    .dpk-notes[hidden] {
      display: none;
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

    /* Review toggle: pinned to the top right corner, always in the same place. */
    .dpk-fab {
      position: fixed;
      top: 12px;
      right: 16px;
      z-index: 60;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      padding: 0;
      border: 1px solid var(--dpk-rule-strong);
      border-radius: 11px;
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

    .dpk-fab:hover {
      color: var(--dpk-ink);
      border-color: var(--dpk-rule-hover);
      transform: translateY(-1px);
      box-shadow: var(--dpk-bevel), var(--dpk-shadow);
    }

    .dpk-fab:active {
      transform: translateY(0) scale(0.95);
      box-shadow: var(--dpk-shadow-xs);
    }

    .dpk-fab:focus-visible {
      outline: none;
      box-shadow: var(--dpk-focus);
    }

    .dpk-fab[aria-expanded='true'] {
      color: var(--dpk-accent-ink);
      border-color: color-mix(in srgb, var(--dpk-accent-strong) 70%, transparent);
      background: linear-gradient(145deg, var(--dpk-accent-bright), var(--dpk-accent-strong));
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.25),
        0 6px 16px -6px color-mix(in srgb, var(--dpk-accent) 70%, transparent);
    }

    .dpk-fab[aria-expanded='true']:hover {
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.25),
        0 10px 22px -8px color-mix(in srgb, var(--dpk-accent) 80%, transparent);
    }

    .dpk-fab-icon {
      position: relative;
      display: block;
      width: 16px;
      height: 12px;
      border: 1.6px solid currentColor;
      border-radius: 4px;
    }

    .dpk-fab-icon::after {
      content: '';
      position: absolute;
      left: 2px;
      bottom: -4px;
      border-left: 3.5px solid transparent;
      border-right: 3.5px solid transparent;
      border-top: 4px solid currentColor;
    }

    .dpk-fab-badge {
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
      box-shadow: 0 3px 8px -2px color-mix(in srgb, var(--dpk-accent) 60%, transparent);
      animation: dpk-pop 260ms var(--dpk-ease-spring);
    }

    @keyframes dpk-pop {
      from {
        transform: scale(0.4);
        opacity: 0;
      }
    }

    @media (max-width: 720px) {
      .dpk-header-meta {
        display: none;
      }

      .dpk-brand {
        display: none;
      }
    }
  `,
];
