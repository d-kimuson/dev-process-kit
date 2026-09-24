import { css } from 'lit';

export const grillStyles = css`
  .dpk-main {
    order: 1;
  }

  /* The shell's sidebar becomes a right-hand rail, keeping its width and scroll. */
  .dpk-sidebar {
    order: 2;
    width: 336px;
    display: flex;
    flex-direction: column;
    gap: 0;
    padding: 0;
    border-right: 0;
    border-left: 1px solid var(--dpk-rule);
  }

  /* The header reserves room for the corner button, exactly like the review
     button in the other templates. */
  .grill-panel {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
  }

  .grill-tab-panel {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    overflow: auto;
  }

  .grill-tab-panel[hidden],
  .dpk-sidebar[hidden] {
    display: none;
  }

  .grill-tab-panel dpk-component-comment-panel {
    flex: 1;
  }

  /* ------------------------------------------------------- header control */

  /*
   * The one control the reader always needs: the questions. It sits where the
   * other templates put their review button, and folds the question column away
   * so the diagrams get the width back.
   */
  .grill-toggle {
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
    font-size: 16.5px;
    font-weight: 650;
    line-height: 1;
    box-shadow: var(--dpk-shadow);
    cursor: pointer;
    transition:
      color 160ms ease,
      background 160ms ease,
      border-color 160ms ease,
      box-shadow 160ms ease,
      transform 160ms cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .grill-toggle:hover {
    color: var(--dpk-ink);
    transform: translateY(-2px) scale(1.05);
    box-shadow: var(--dpk-shadow-lg);
  }

  .grill-toggle:active {
    transform: translateY(0) scale(0.97);
    box-shadow: var(--dpk-shadow-xs);
  }

  .grill-toggle:focus-visible {
    outline: none;
    box-shadow: var(--dpk-focus);
  }

  .grill-toggle[aria-expanded='true'] {
    color: var(--dpk-accent-ink);
    border-color: transparent;
    background: linear-gradient(135deg, var(--dpk-accent), var(--dpk-accent-strong));
    box-shadow: 0 2px 8px rgba(217, 73, 32, 0.3);
  }

  .grill-toggle-glyph {
    display: block;
  }

  .grill-toggle-badge {
    position: absolute;
    top: -5px;
    right: -5px;
    min-width: 22px;
    height: 18px;
    padding: 0 5px;
    border: 2px solid var(--dpk-paper-raised);
    border-radius: 999px;
    background: var(--dpk-paper-inset);
    color: var(--dpk-ink-faint);
    font-family: var(--dpk-mono);
    font-size: 9px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    line-height: 14px;
    /* The widest value is wider than the button it sits on: keep it on one line. */
    white-space: nowrap;
    text-align: center;
  }

  .grill-toggle[aria-expanded='true'] .grill-toggle-badge {
    background: var(--dpk-paper-raised);
    color: var(--dpk-ink-soft);
  }

  /* ------------------------------------------------------------- the list */

  .grill-tabs {
    display: flex;
    align-items: center;
    gap: 2px;
    flex-shrink: 0;
    padding: 8px 10px;
    border-bottom: 1px solid var(--dpk-rule);
    background: var(--dpk-paper-raised);
  }

  .grill-tabs button {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 5px 9px;
    border: 1px solid transparent;
    border-radius: var(--dpk-radius-xs);
    background: transparent;
    color: var(--dpk-ink-faint);
    font-size: 11.5px;
    cursor: pointer;
  }

  .grill-tabs button:hover {
    background: var(--dpk-paper-inset);
    color: var(--dpk-ink);
  }

  .grill-tabs button[aria-selected='true'] {
    border-color: var(--dpk-rule-strong);
    background: var(--dpk-paper-raised);
    color: var(--dpk-ink);
    font-weight: 600;
    box-shadow: var(--dpk-shadow-xs);
  }

  .grill-count {
    font-family: var(--dpk-mono);
    font-size: 10px;
    font-variant-numeric: tabular-nums;
    color: var(--dpk-ink-faint);
  }

  .grill-list {
    flex: 1;
    min-height: 0;
    overflow: auto;
    overscroll-behavior: contain;
    padding: 2px 10px 12px;
  }

  .grill-empty {
    margin: 0;
    padding: 22px 8px;
    text-align: center;
    font-size: 12px;
    color: var(--dpk-ink-faint);
  }

  .grill-question {
    border-bottom: 1px solid var(--dpk-rule);
  }

  .grill-question:last-child {
    border-bottom: 0;
  }

  .grill-heading {
    display: flex;
    align-items: flex-start;
    gap: 9px;
    width: 100%;
    padding: 11px 6px;
    border: 0;
    border-radius: var(--dpk-radius-xs);
    background: none;
    text-align: left;
    cursor: pointer;
  }

  .grill-heading:hover {
    background: var(--dpk-paper-sunken);
  }

  .grill-ref {
    flex: 0 0 auto;
    display: grid;
    place-items: center;
    min-width: 30px;
    height: 22px;
    padding: 0 6px;
    border: 1px solid var(--dpk-rule-strong);
    border-radius: 999px;
    font-family: var(--dpk-mono);
    font-size: 10px;
    font-variant-numeric: tabular-nums;
    color: var(--dpk-ink-faint);
  }

  .grill-question[data-answered='true'] .grill-ref {
    border-color: transparent;
    background: var(--dpk-green-soft);
    color: var(--dpk-green);
    font-weight: 600;
  }

  .grill-question:has(.grill-heading[aria-expanded='true']) .grill-ref {
    border-color: transparent;
    background: var(--dpk-accent-soft);
    color: var(--dpk-accent);
    font-weight: 600;
  }

  .grill-heading-text {
    flex: 1;
    min-width: 0;
  }

  .grill-heading-text strong {
    display: block;
    font-size: 12.5px;
    font-weight: 600;
    line-height: 1.6;
  }

  .grill-summary {
    display: block;
    margin-top: 4px;
    font-size: 10.5px;
    line-height: 1.6;
    color: var(--dpk-green);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .grill-chevron {
    flex: 0 0 auto;
    width: 16px;
    color: var(--dpk-ink-faint);
    font-size: 12px;
    line-height: 22px;
    text-align: center;
  }

  .grill-body {
    padding: 0 6px 13px 45px;
  }

  .grill-description {
    margin: 0 0 8px;
    font-size: 11.5px;
    line-height: 1.85;
    color: var(--dpk-ink-soft);
  }

  .grill-note {
    margin: 0 0 10px;
    padding: 7px 10px;
    border-left: 2px solid var(--dpk-amber);
    border-radius: 0 var(--dpk-radius-xs) var(--dpk-radius-xs) 0;
    background: var(--dpk-amber-soft);
    font-size: 11px;
    line-height: 1.7;
    color: var(--dpk-ink-soft);
  }

  .grill-choices {
    display: grid;
    gap: 6px;
  }

  .grill-choice {
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
  }

  .grill-choice:hover {
    border-color: var(--dpk-rule-strong);
  }

  .grill-choice:has(input:checked) {
    border-color: color-mix(in srgb, var(--dpk-green) 45%, transparent);
    background: var(--dpk-green-soft);
  }

  .grill-choice input {
    flex: 0 0 auto;
    margin: 3px 0 0;
    accent-color: var(--dpk-green);
  }

  .grill-choice-text {
    display: flex;
    gap: 7px;
    min-width: 0;
  }

  .grill-letter {
    flex: 0 0 auto;
    font-family: var(--dpk-mono);
    font-size: 10px;
    line-height: 1.9;
    color: var(--dpk-green);
  }

  .grill-free {
    margin-top: 7px;
    min-height: 76px;
    max-height: 240px;
  }

  .grill-clear {
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

  .grill-clear:hover {
    color: var(--dpk-ink);
  }

  .grill-footer {
    flex-shrink: 0;
    padding: 10px 12px;
    border-top: 1px solid var(--dpk-rule);
    background: var(--dpk-paper-raised);
  }

  .grill-copy {
    width: 100%;
  }

  /* Inside a Claude Artifact: send is the way, copy the fallback beside it. */
  .grill-footer-actions {
    display: flex;
    gap: 6px;
  }

  .grill-send {
    flex: 1;
    min-width: 0;
  }

  .grill-footer-actions .grill-copy {
    width: auto;
    flex-shrink: 0;
  }

  .grill-send[data-status='sent'] {
    border-color: transparent;
    background: var(--dpk-green);
    color: var(--dpk-accent-ink);
  }

  .grill-send[data-status='failed'] {
    border-color: transparent;
    background: var(--dpk-amber);
    color: var(--dpk-accent-ink);
  }

  .grill-footer-note {
    margin: 8px 0 0;
    color: var(--dpk-ink-soft);
    font-size: 11.5px;
    line-height: 1.5;
  }

  /* The copy button reports the outcome, so a click is never silent. */
  .grill-copy[data-status='copied'] {
    border-color: transparent;
    background: var(--dpk-green);
    color: var(--dpk-accent-ink);
  }

  .grill-copy[data-status='copied']:hover:not([disabled]) {
    border-color: transparent;
    background: color-mix(in srgb, var(--dpk-green) 85%, #000);
  }

  .grill-copy[data-status='failed'] {
    border-color: transparent;
    background: var(--dpk-amber);
    color: var(--dpk-accent-ink);
  }

  .grill-copy[data-status='failed']:hover:not([disabled]) {
    border-color: transparent;
    background: color-mix(in srgb, var(--dpk-amber) 85%, #000);
  }

  /* Announced to assistive tech; the button label change alone is easy to miss. */
  .grill-sr {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    padding: 0;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
    border: 0;
  }

  /* -------------------------------------------------- main area and badges */

  .grill-stage {
    position: relative;
    min-width: 0;
  }

  .grill-labels {
    position: absolute;
    inset: 0;
    z-index: 3;
    overflow: hidden;
    pointer-events: none;
  }

  .grill-label {
    position: absolute;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 30px;
    height: 22px;
    padding: 0 7px;
    border: 2px solid var(--dpk-paper-raised);
    border-radius: 999px;
    background: var(--dpk-accent);
    color: var(--dpk-accent-ink);
    font-family: var(--dpk-mono);
    font-size: 10px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    box-shadow: var(--dpk-shadow-xs);
    cursor: pointer;
    pointer-events: auto;
  }

  .grill-label[data-visible='false'] {
    visibility: hidden;
  }

  .grill-label:hover {
    background: color-mix(in srgb, var(--dpk-accent) 80%, #000);
  }

  .grill-label[data-answered='true'] {
    background: var(--dpk-green);
  }

  .grill-label[aria-pressed='true'] {
    box-shadow:
      0 0 0 2px color-mix(in srgb, var(--dpk-accent) 45%, transparent),
      var(--dpk-shadow-xs);
  }

  .grill-label:focus-visible {
    outline: none;
    box-shadow: var(--dpk-focus);
  }
`;
