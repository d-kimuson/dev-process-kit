import { css } from 'lit';

import { controls, popoverSurface, tokens } from '../../core/theme';

/**
 * Formal spec styling. A document in the page's flow (no canvas, no fixed
 * height): claims as cards grouped under what they are about. The assurance
 * tone colors the card's edge, so an incomplete or bounded claim is noticed
 * while scrolling.
 */
export const formalSpecStyles = [
  tokens,
  controls,
  popoverSurface,
  css`
    :host {
      display: block;
      container-type: inline-size;
      color: var(--dpk-ink);
      font-family: var(--dpk-body);
    }

    .spec {
      display: grid;
      gap: 14px;
    }

    /* ----------------------------------------------------------- toolbar */

    .spec-toolbar {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: 4px 10px;
      padding: 0 2px 10px;
      border-bottom: 1px solid var(--dpk-rule);
    }

    .spec-title {
      font-family: var(--dpk-display);
      font-size: 14px;
      font-weight: 650;
    }

    .spec-subject {
      color: var(--dpk-ink-soft);
      font-size: 12.5px;
    }

    .spec-stats {
      display: inline-flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 6px;
      margin-left: auto;
      color: var(--dpk-ink-faint);
      font-size: 12px;
    }

    .spec-chip {
      padding: 1px 8px;
      border-radius: 999px;
      font-weight: 600;
    }

    .spec-notice,
    .spec-empty {
      margin: 0;
      padding: 14px;
      border-radius: var(--dpk-radius);
      font-size: 12.5px;
    }

    .spec-notice {
      background: var(--dpk-danger-soft);
      color: var(--dpk-danger);
    }

    .spec-empty {
      color: var(--dpk-ink-faint);
      text-align: center;
    }

    /* ------------------------------------------------------------ tones */

    [data-tone='sound'] {
      --tone: var(--dpk-green);
      --tone-soft: var(--dpk-green-soft);
    }

    [data-tone='caveat'] {
      --tone: var(--dpk-amber);
      --tone-soft: var(--dpk-amber-soft);
    }

    [data-tone='unsound'] {
      --tone: var(--dpk-danger);
      --tone-soft: var(--dpk-danger-soft);
    }

    [data-tone='planned'] {
      --tone: var(--dpk-blue);
      --tone-soft: var(--dpk-blue-soft);
    }

    .spec-chip,
    .assurance-badge {
      background: var(--tone-soft);
      color: var(--tone);
    }

    /* ----------------------------------------------------------- targets */

    .spec-groups {
      display: grid;
      gap: 28px;
    }

    .target-group {
      display: grid;
      gap: 12px;
    }

    .target-head {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: 4px 10px;
    }

    .target-label {
      color: var(--dpk-ink-faint);
      font-size: 11.5px;
      font-weight: 650;
      letter-spacing: 0.04em;
    }

    .target-name {
      margin: 0;
      font-family: var(--dpk-display);
      font-size: 17px;
      font-weight: 700;
    }

    .target-code {
      padding: 1px 7px;
      border: 1px solid var(--dpk-rule);
      border-radius: var(--dpk-radius-sm);
      background: var(--dpk-paper-sunken);
      color: var(--dpk-ink-soft);
      font-family: var(--dpk-mono);
      font-size: 12px;
    }

    .target-head .comment-trigger {
      align-self: center;
      margin-left: auto;
    }

    .target-summary {
      margin: -4px 0 0;
      color: var(--dpk-ink-soft);
      font-size: 13.5px;
      line-height: 1.7;
    }

    /* ------------------------------------------------------------ claims */

    .spec-claims {
      display: grid;
      gap: 8px;
    }

    .claim {
      padding: 10px 14px 10px 8px;
      border: 1px solid var(--dpk-rule);
      border-left: 4px solid var(--tone);
      border-radius: var(--dpk-radius-lg);
      background: var(--dpk-paper-raised);
      box-shadow: var(--dpk-bevel), var(--dpk-shadow-sm);
    }

    /* Folded, the head row is the whole card: the statement and how strongly it holds. */
    .claim-head {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      cursor: pointer;
    }

    .claim-toggle {
      display: grid;
      flex: none;
      place-items: center;
      width: 24px;
      height: 24px;
      margin-top: 1px;
      padding: 0;
      border: none;
      border-radius: var(--dpk-radius);
      background: transparent;
      color: var(--dpk-ink-faint);
      cursor: pointer;
    }

    .claim-toggle svg {
      width: 14px;
      height: 14px;
      transition: transform 120ms ease;
    }

    .claim-toggle[aria-expanded='true'] svg {
      transform: rotate(90deg);
    }

    .claim-toggle:hover,
    .claim-toggle:focus-visible {
      background: var(--dpk-paper-sunken);
      color: var(--dpk-ink);
    }

    .claim-body {
      display: grid;
      gap: 14px;
      margin: 12px 0 6px 32px;
    }

    /* The badge explains itself in a tooltip, so it is a button that hover, focus or a tap opens. */
    .assurance-badge {
      flex: none;
      margin-top: 2px;
      padding: 2px 10px;
      border: none;
      border-radius: 999px;
      font: inherit;
      font-size: 11.5px;
      font-weight: 650;
      white-space: nowrap;
      cursor: help;
    }

    .assurance-badge:focus-visible {
      outline: 2px solid var(--tone);
      outline-offset: 2px;
    }

    .claim-head .comment-trigger {
      margin-left: auto;
    }

    .claim-statement {
      flex: 1;
      margin: 0;
      font-size: 14.5px;
      line-height: 1.65;
      font-weight: 500;
    }

    /* Subjects / premises / conclusions: the structure of the claim, one row per part. */
    .claim-parts {
      display: grid;
      grid-template-columns: max-content 1fr;
      margin: 0;
      border: 1px solid var(--dpk-rule);
      border-radius: var(--dpk-radius);
      background: var(--dpk-paper-sunken);
      overflow: hidden;
    }

    .claim-part {
      display: contents;
    }

    .claim-part > dt,
    .claim-part > dd {
      margin: 0;
      padding: 9px 12px;
      border-top: 1px solid var(--dpk-rule);
    }

    .claim-part:first-child > dt,
    .claim-part:first-child > dd {
      border-top: none;
    }

    .claim-part > dt {
      color: var(--dpk-ink-soft);
      font-size: 11.5px;
      font-weight: 650;
      letter-spacing: 0.04em;
      padding-top: 11px;
    }

    /* The conclusion is what the claim asserts: its label reads strongest. */
    .claim-part[data-part='conclusions'] > dt {
      color: var(--dpk-ink);
    }

    .claim-none {
      margin: 0;
      color: var(--dpk-ink-faint);
      font-size: 13px;
    }

    .clauses {
      display: grid;
      gap: 2px;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .clause {
      position: relative;
      display: flex;
      align-items: flex-start;
      gap: 6px;
      min-height: 28px;
      padding: 2px 0 2px 14px;
      font-size: 13.5px;
      line-height: 1.7;
    }

    .clause::before {
      content: '';
      position: absolute;
      left: 2px;
      top: 0.95em;
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: var(--dpk-ink-faint);
    }

    .clause-text {
      flex: 1;
      min-width: 0;
      overflow-wrap: anywhere;
    }

    /* ---------------------------------------------------------- assurance */

    .assurance {
      padding: 10px 14px;
      border-radius: var(--dpk-radius);
      background: var(--tone-soft);
      font-size: 12.5px;
      line-height: 1.6;
    }

    .assurance-label {
      margin: 0;
      color: var(--tone);
      font-weight: 650;
    }

    .assurance ul {
      margin: 4px 0 0;
      padding-left: 18px;
      color: var(--dpk-ink);
    }

    /* ---------------------------------------------------- examples / not */

    .claim-aside h5 {
      margin: 0 0 2px;
      color: var(--dpk-ink-soft);
      font-size: 11.5px;
      font-weight: 650;
      letter-spacing: 0.04em;
    }

    .claim-aside[data-part='not-claimed'] {
      padding: 10px 14px;
      border: 1px dashed var(--dpk-rule-strong);
      border-radius: var(--dpk-radius);
    }

    .claim-aside[data-part='not-claimed'] .clause::before {
      content: '×';
      left: 0;
      top: 0;
      width: auto;
      height: auto;
      border-radius: 0;
      background: none;
      color: var(--dpk-ink-faint);
      font-weight: 700;
    }

    .claim-aside[data-part='not-claimed'] .clause-text {
      color: var(--dpk-ink-soft);
    }

    /* ------------------------------------------------------------- footer */

    .claim-foot {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 6px 8px;
      padding-top: 10px;
      border-top: 1px solid var(--dpk-rule);
      color: var(--dpk-ink-faint);
      font-size: 11.5px;
    }

    .claim-foot-label {
      font-weight: 650;
    }

    .term-chip {
      padding: 1px 9px;
      border: 1px solid var(--dpk-rule-strong);
      border-radius: 999px;
      background: var(--dpk-paper);
      color: var(--dpk-ink-soft);
      font: inherit;
      cursor: help;
    }

    .term-chip:is(:hover, :focus-visible) {
      border-color: var(--dpk-violet);
      color: var(--dpk-violet);
    }

    .claim-source {
      margin-left: auto;
    }

    .claim-source code {
      font-family: var(--dpk-mono);
      font-size: 11px;
    }

    /* -------------------------------------------------------------- terms */

    .term {
      display: inline;
      padding: 0 1px;
      border: none;
      border-bottom: 1.5px dotted var(--dpk-violet);
      background: none;
      color: inherit;
      font: inherit;
      font-weight: 600;
      cursor: help;
    }

    .term:hover,
    .term:focus-visible {
      background: var(--dpk-violet-soft);
      outline: none;
    }

    /* ----------------------------------------------------------- tooltip */

    /* Sized to its text: the popover helper sets a fixed width, which only !important overrides. */
    .spec-tip {
      box-sizing: border-box;
      position: fixed;
      inset: auto;
      width: max-content !important;
      max-width: min(300px, calc(100vw - 16px));
      margin: 0;
      padding: 8px 11px;
      border: 1px solid var(--dpk-rule-strong);
      border-radius: var(--dpk-radius);
      background: var(--dpk-paper-raised);
      box-shadow: var(--dpk-bevel), var(--dpk-shadow-lg);
      color: var(--dpk-ink);
      font-size: 12.5px;
      line-height: 1.6;
      pointer-events: none;
    }

    .spec-tip p {
      margin: 0;
    }

    .tip-title {
      color: var(--dpk-violet);
      font-weight: 650;
    }

    .spec-tip[data-tone] .tip-title {
      color: var(--tone);
    }

    .term-static {
      border-bottom: 1.5px dotted var(--dpk-violet);
      font-weight: 600;
    }

    @container (max-width: 520px) {
      .claim-parts {
        grid-template-columns: 1fr;
      }

      .claim-part > dd {
        border-top: none;
        padding-top: 0;
      }
    }

    /* ---------------------------------------------------------- comments */

    .comment-trigger {
      flex: none;
      display: grid;
      place-items: center;
      width: 24px;
      height: 24px;
      padding: 4px;
      border: 1px solid var(--dpk-rule-strong);
      border-radius: var(--dpk-radius-sm);
      background: var(--dpk-paper-raised);
      color: var(--dpk-ink-soft);
      cursor: pointer;
      opacity: 0;
      transition: opacity 120ms ease;
    }

    .comment-trigger svg {
      width: 14px;
      height: 14px;
    }

    :is(.target-head, .claim-head, .clause):is(:hover, :focus-within) > .comment-trigger,
    .comment-trigger[aria-expanded='true'] {
      opacity: 1;
    }

    .comment-trigger:hover,
    .comment-trigger:focus-visible {
      border-color: var(--dpk-accent);
      background: var(--dpk-accent-soft);
      color: var(--dpk-accent);
      outline: none;
    }

    @media (hover: none) {
      .comment-trigger {
        opacity: 1;
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
  `,
];
