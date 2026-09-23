/**
 * Shell chrome styles: the shadow-DOM look of every `artifact-*` element.
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
      background: var(--af-paper);
    }

    .af-shell {
      display: grid;
      grid-template-rows: auto minmax(0, 1fr) auto;
      min-height: 100%;
      max-height: 100%;
    }

    /* ------------------------------------------------------------- header */

    .af-header {
      display: flex;
      align-items: center;
      gap: 16px;
      /* Right padding keeps the header content clear of the fixed review button. */
      padding: 14px 78px 14px 20px;
      border-bottom: 1px solid var(--af-rule);
      background: linear-gradient(180deg, var(--af-paper-raised) 0%, var(--af-paper) 100%);
    }

    .af-title {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .af-title h1 {
      font-size: 16.5px;
      font-weight: 620;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .af-template-mark {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 2px 9px 2px 7px;
      border-radius: 999px;
      background: var(--af-accent-soft);
      font-family: var(--af-mono);
      font-size: 9.5px;
      font-weight: 550;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--af-accent);
    }

    .af-template-mark::before {
      content: '';
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--af-accent);
    }

    .af-header-slot {
      flex: 1;
      min-width: 0;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .af-header-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-left: auto;
      padding: 4px 12px;
      border-radius: 999px;
      border: 1px solid var(--af-rule);
      background: var(--af-paper-sunken);
      font-family: var(--af-mono);
      font-size: 10px;
      letter-spacing: 0.04em;
      color: var(--af-ink-faint);
      white-space: nowrap;
    }

    .af-header-meta span + span::before {
      content: '';
      display: inline-block;
      width: 3px;
      height: 3px;
      margin-right: 8px;
      vertical-align: 1px;
      border-radius: 50%;
      background: var(--af-ink-faint);
      opacity: 0.5;
    }

    /* --------------------------------------------------------------- body */

    .af-body {
      display: flex;
      min-height: 0;
    }

    .af-sidebar {
      width: 252px;
      flex: 0 0 auto;
      border-right: 1px solid var(--af-rule);
      background: linear-gradient(180deg, var(--af-paper-sunken) 0%, var(--af-paper-inset) 100%);
      overflow: auto;
      padding: 16px 14px;
    }

    .af-sidebar[hidden] {
      display: none;
    }

    .af-main {
      flex: 1 1 0%;
      display: flex;
      flex-direction: column;
      min-width: 0;
      overflow: auto;
      background: var(--af-paper);
    }

    .af-main-body {
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
    .af-memo {
      position: sticky;
      bottom: 0;
      z-index: 5;
      padding: 0 20px 20px;
      pointer-events: none;
    }

    .af-memo[hidden] {
      display: none;
    }

    .af-memo ::slotted(*) {
      display: block;
      max-width: 100%;
      padding: 10px 14px;
      border: 1px solid var(--af-rule);
      border-radius: var(--af-radius-lg);
      background: var(--af-paper-raised);
      box-shadow: var(--af-shadow-lg);
      font-size: 12.5px;
      line-height: 1.65;
      color: var(--af-ink-soft);
      pointer-events: auto;
    }

    .af-orphans {
      margin-top: 16px;
      border: 1px dashed var(--af-rule-strong);
      border-radius: var(--af-radius-sm);
      padding: 10px;
    }

    .af-banner {
      display: grid;
      gap: 4px;
      margin-bottom: 14px;
      border: 1px solid var(--af-accent);
      border-left-width: 3px;
      border-radius: var(--af-radius-sm);
      background: var(--af-accent-soft);
      padding: 10px 12px;
      max-width: 900px;
    }

    .af-banner strong {
      font-size: 13px;
    }

    .af-banner code {
      font-family: var(--af-mono);
      font-size: 11px;
      color: var(--af-ink-soft);
      overflow-wrap: anywhere;
    }

    .af-notes {
      flex: 0 0 auto;
      width: 344px;
      border-left: 1px solid var(--af-rule);
      background: var(--af-paper-raised);
      overflow: hidden;
      display: flex;
    }

    .af-notes[hidden] {
      display: none;
    }

    /* ------------------------------------------------------------- footer */

    .af-footer {
      border-top: 1px solid var(--af-rule);
      padding: 10px 20px;
      display: flex;
      gap: 12px;
      align-items: center;
      background: var(--af-paper-sunken);
      font-size: 12px;
      color: var(--af-ink-faint);
    }

    /* --------------------------------------------------- floating review */

    /* Review toggle: pinned to the top right corner, always in the same place. */
    .af-fab {
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
      border: 1px solid var(--af-rule-strong);
      border-radius: 999px;
      background: var(--af-paper-raised);
      color: var(--af-ink-soft);
      box-shadow: var(--af-shadow);
      cursor: pointer;
      transition:
        color 160ms ease,
        background 160ms ease,
        border-color 160ms ease,
        box-shadow 160ms ease,
        transform 160ms cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    .af-fab:hover {
      color: var(--af-ink);
      transform: translateY(-2px) scale(1.05);
      box-shadow: var(--af-shadow-lg);
    }

    .af-fab:active {
      transform: translateY(0) scale(0.97);
      box-shadow: var(--af-shadow-xs);
    }

    .af-fab:focus-visible {
      outline: none;
      box-shadow: var(--af-focus);
    }

    .af-fab[aria-expanded='true'] {
      color: var(--af-accent-ink);
      border-color: transparent;
      background: linear-gradient(135deg, var(--af-accent), #c23e12);
      box-shadow: 0 2px 8px rgba(217, 73, 32, 0.3);
    }

    .af-fab[aria-expanded='true']:hover {
      box-shadow: 0 4px 14px rgba(217, 73, 32, 0.4);
    }

    .af-fab-icon {
      position: relative;
      display: block;
      width: 16px;
      height: 12px;
      border: 1.6px solid currentColor;
      border-radius: 3.5px;
    }

    .af-fab-icon::after {
      content: '';
      position: absolute;
      left: 2px;
      bottom: -4px;
      border-left: 3.5px solid transparent;
      border-right: 3.5px solid transparent;
      border-top: 4px solid currentColor;
    }

    .af-fab-badge {
      position: absolute;
      top: -5px;
      right: -5px;
      min-width: 18px;
      height: 18px;
      padding: 0 4px;
      border: 2px solid var(--af-paper-raised);
      border-radius: 999px;
      background: linear-gradient(135deg, #e55a2b, var(--af-accent));
      color: var(--af-accent-ink);
      font-family: var(--af-mono);
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
 * Base class for every `artifact-*` root element.
 *
 * It owns the Web Platform contract (attributes, properties, events, slots),
 * the draft pipeline wiring, hash navigation and the review rail. Templates
 * only supply meaning (`definition`) and layout (`renderRegions`).
 */
