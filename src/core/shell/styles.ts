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
      display: flex;
      align-items: center;
      gap: 16px;
      /* Right padding keeps the header content clear of the fixed review button. */
      padding: 14px 78px 14px 20px;
      border-bottom: 1px solid var(--dpk-rule);
      background: linear-gradient(180deg, var(--dpk-paper-raised) 0%, var(--dpk-paper) 100%);
    }

    .dpk-title {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .dpk-title h1 {
      font-size: 16.5px;
      font-weight: 620;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .dpk-template-mark {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 2px 9px 2px 7px;
      border-radius: 999px;
      background: var(--dpk-accent-soft);
      font-family: var(--dpk-mono);
      font-size: 9.5px;
      font-weight: 550;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--dpk-accent);
    }

    .dpk-template-mark::before {
      content: '';
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--dpk-accent);
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
      gap: 8px;
      margin-left: auto;
      padding: 4px 12px;
      border-radius: 999px;
      border: 1px solid var(--dpk-rule);
      background: var(--dpk-paper-sunken);
      font-family: var(--dpk-mono);
      font-size: 10px;
      letter-spacing: 0.04em;
      color: var(--dpk-ink-faint);
      white-space: nowrap;
    }

    .dpk-header-meta span + span::before {
      content: '';
      display: inline-block;
      width: 3px;
      height: 3px;
      margin-right: 8px;
      vertical-align: 1px;
      border-radius: 50%;
      background: var(--dpk-ink-faint);
      opacity: 0.5;
    }

    .dpk-lang-select {
      flex: none;
      height: 30px;
      padding: 0 10px;
      border: 1px solid var(--dpk-rule);
      border-radius: 999px;
      background: var(--dpk-paper-sunken);
      color: var(--dpk-ink-soft);
      font: inherit;
      font-size: 12px;
      cursor: pointer;
      transition:
        color 160ms ease,
        border-color 160ms ease;
    }

    .dpk-lang-select:hover {
      color: var(--dpk-ink);
      border-color: var(--dpk-rule-hover);
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
      width: 30px;
      height: 30px;
      padding: 0;
      border: 1px solid var(--dpk-rule);
      border-radius: 999px;
      background: var(--dpk-paper-sunken);
      color: var(--dpk-ink-soft);
      cursor: pointer;
      transition:
        color 160ms ease,
        border-color 160ms ease;
    }

    .dpk-theme-toggle svg {
      width: 15px;
      height: 15px;
    }

    .dpk-theme-toggle:hover {
      color: var(--dpk-ink);
      border-color: var(--dpk-rule-hover);
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
      width: 252px;
      flex: 0 0 auto;
      border-right: 1px solid var(--dpk-rule);
      background: linear-gradient(180deg, var(--dpk-paper-sunken) 0%, var(--dpk-paper-inset) 100%);
      overflow: auto;
      padding: 16px 14px;
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
      background: var(--dpk-paper);
    }

    .dpk-main-body {
      flex: 1 0 auto;
      display: grid;
      align-content: start;
      gap: 16px;
      min-width: 0;
      padding: 24px;
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
      padding: 10px 14px;
      border: 1px solid var(--dpk-rule);
      border-radius: var(--dpk-radius-lg);
      background: var(--dpk-paper-raised);
      box-shadow: var(--dpk-shadow-lg);
      font-size: 12.5px;
      line-height: 1.65;
      color: var(--dpk-ink-soft);
      pointer-events: auto;
    }

    .dpk-orphans {
      margin-top: 16px;
      border: 1px dashed var(--dpk-rule-strong);
      border-radius: var(--dpk-radius-sm);
      padding: 10px;
    }

    .dpk-banner {
      display: grid;
      gap: 4px;
      margin-bottom: 14px;
      border: 1px solid var(--dpk-accent);
      border-left-width: 3px;
      border-radius: var(--dpk-radius-sm);
      background: var(--dpk-accent-soft);
      padding: 10px 12px;
      max-width: 900px;
    }

    .dpk-banner strong {
      font-size: 13px;
    }

    .dpk-banner code {
      font-family: var(--dpk-mono);
      font-size: 11px;
      color: var(--dpk-ink-soft);
      overflow-wrap: anywhere;
    }

    .dpk-notes {
      flex: 0 0 auto;
      width: 344px;
      border-left: 1px solid var(--dpk-rule);
      background: var(--dpk-paper-raised);
      overflow: hidden;
      display: flex;
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
      background: var(--dpk-paper-sunken);
      font-size: 12px;
      color: var(--dpk-ink-faint);
    }

    /* --------------------------------------------------- floating review */

    /* Review toggle: pinned to the top right corner, always in the same place. */
    .dpk-fab {
      position: fixed;
      top: 10px;
      right: 16px;
      z-index: 60;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 38px;
      height: 38px;
      padding: 0;
      border: 1px solid var(--dpk-rule-strong);
      border-radius: 999px;
      background: var(--dpk-paper-raised);
      color: var(--dpk-ink-soft);
      box-shadow: var(--dpk-shadow);
      cursor: pointer;
      transition:
        color 160ms ease,
        background 160ms ease,
        border-color 160ms ease,
        box-shadow 160ms ease,
        transform 160ms cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    .dpk-fab:hover {
      color: var(--dpk-ink);
      transform: translateY(-2px) scale(1.05);
      box-shadow: var(--dpk-shadow-lg);
    }

    .dpk-fab:active {
      transform: translateY(0) scale(0.97);
      box-shadow: var(--dpk-shadow-xs);
    }

    .dpk-fab:focus-visible {
      outline: none;
      box-shadow: var(--dpk-focus);
    }

    .dpk-fab[aria-expanded='true'] {
      color: var(--dpk-accent-ink);
      border-color: transparent;
      background: linear-gradient(135deg, var(--dpk-accent), var(--dpk-accent-strong));
      box-shadow: 0 2px 8px rgba(217, 73, 32, 0.3);
    }

    .dpk-fab[aria-expanded='true']:hover {
      box-shadow: 0 4px 14px rgba(217, 73, 32, 0.4);
    }

    .dpk-fab-icon {
      position: relative;
      display: block;
      width: 16px;
      height: 12px;
      border: 1.6px solid currentColor;
      border-radius: 3.5px;
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
      top: -5px;
      right: -5px;
      min-width: 18px;
      height: 18px;
      padding: 0 4px;
      border: 2px solid var(--dpk-paper-raised);
      border-radius: 999px;
      background: linear-gradient(135deg, var(--dpk-accent-bright), var(--dpk-accent));
      color: var(--dpk-accent-ink);
      font-family: var(--dpk-mono);
      font-size: 9.5px;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      line-height: 14px;
      text-align: center;
      box-shadow: 0 1px 4px rgba(217, 73, 32, 0.3);
    }
  `,
];

/**
 * Base class for every `dpk-template-*` element.
 *
 * It owns the Web Platform contract (attributes, properties, events, slots),
 * the draft pipeline wiring, hash navigation and the review rail. Templates
 * only supply meaning (`definition`) and layout (`renderRegions`).
 */
