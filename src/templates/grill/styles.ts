import { css } from 'lit';

export const grillStyles = css`
  .af-main {
    order: 1;
  }

  /* The shell's sidebar becomes a right-hand rail, keeping its width and scroll. */
  .af-sidebar {
    order: 2;
    width: 336px;
    display: flex;
    flex-direction: column;
    gap: 0;
    padding: 0;
    border-right: 0;
    border-left: 1px solid var(--af-rule);
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
  .af-sidebar[hidden] {
    display: none;
  }

  .grill-tab-panel artifact-comment-panel {
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
    border: 1px solid var(--af-rule-strong);
    border-radius: 999px;
    background: var(--af-paper-raised);
    color: var(--af-ink-soft);
    font-size: 16.5px;
    font-weight: 650;
    line-height: 1;
    box-shadow: var(--af-shadow);
    cursor: pointer;
    transition:
      color 160ms ease,
      background 160ms ease,
      border-color 160ms ease,
      box-shadow 160ms ease,
      transform 160ms cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .grill-toggle:hover {
    color: var(--af-ink);
    transform: translateY(-2px) scale(1.05);
    box-shadow: var(--af-shadow-lg);
  }

  .grill-toggle:active {
    transform: translateY(0) scale(0.97);
    box-shadow: var(--af-shadow-xs);
  }

  .grill-toggle:focus-visible {
    outline: none;
    box-shadow: var(--af-focus);
  }

  .grill-toggle[aria-expanded='true'] {
    color: var(--af-accent-ink);
    border-color: transparent;
    background: linear-gradient(135deg, var(--af-accent), #c23e12);
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
    border: 2px solid var(--af-paper-raised);
    border-radius: 999px;
    background: var(--af-paper-inset);
    color: var(--af-ink-faint);
    font-family: var(--af-mono);
    font-size: 9px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    line-height: 14px;
    /* The widest value is wider than the button it sits on: keep it on one line. */
    white-space: nowrap;
    text-align: center;
  }

  .grill-toggle[aria-expanded='true'] .grill-toggle-badge {
    background: var(--af-paper-raised);
    color: var(--af-ink-soft);
  }

  /* ------------------------------------------------------------- the list */

  .grill-tabs {
    display: flex;
    align-items: center;
    gap: 2px;
    flex-shrink: 0;
    padding: 8px 10px;
    border-bottom: 1px solid var(--af-rule);
    background: var(--af-paper-raised);
  }

  .grill-tabs button {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 5px 9px;
    border: 1px solid transparent;
    border-radius: var(--af-radius-xs);
    background: transparent;
    color: var(--af-ink-faint);
    font-size: 11.5px;
    cursor: pointer;
  }

  .grill-tabs button:hover {
    background: var(--af-paper-inset);
    color: var(--af-ink);
  }

  .grill-tabs button[aria-selected='true'] {
    border-color: var(--af-rule-strong);
    background: var(--af-paper-raised);
    color: var(--af-ink);
    font-weight: 600;
    box-shadow: var(--af-shadow-xs);
  }

  .grill-count {
    font-family: var(--af-mono);
    font-size: 10px;
    font-variant-numeric: tabular-nums;
    color: var(--af-ink-faint);
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
    color: var(--af-ink-faint);
  }

  .grill-question {
    border-bottom: 1px solid var(--af-rule);
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
    border-radius: var(--af-radius-xs);
    background: none;
    text-align: left;
    cursor: pointer;
  }

  .grill-heading:hover {
    background: var(--af-paper-sunken);
  }

  .grill-ref {
    flex: 0 0 auto;
    display: grid;
    place-items: center;
    min-width: 30px;
    height: 22px;
    padding: 0 6px;
    border: 1px solid var(--af-rule-strong);
    border-radius: 999px;
    font-family: var(--af-mono);
    font-size: 10px;
    font-variant-numeric: tabular-nums;
    color: var(--af-ink-faint);
  }

  .grill-question[data-answered='true'] .grill-ref {
    border-color: transparent;
    background: var(--af-green-soft);
    color: var(--af-green);
    font-weight: 600;
  }

  .grill-question:has(.grill-heading[aria-expanded='true']) .grill-ref {
    border-color: transparent;
    background: var(--af-accent-soft);
    color: var(--af-accent);
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
    color: var(--af-green);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .grill-chevron {
    flex: 0 0 auto;
    width: 16px;
    color: var(--af-ink-faint);
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
    color: var(--af-ink-soft);
  }

  .grill-note {
    margin: 0 0 10px;
    padding: 7px 10px;
    border-left: 2px solid var(--af-amber);
    border-radius: 0 var(--af-radius-xs) var(--af-radius-xs) 0;
    background: var(--af-amber-soft);
    font-size: 11px;
    line-height: 1.7;
    color: var(--af-ink-soft);
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
    border: 1px solid var(--af-rule);
    border-radius: var(--af-radius-sm);
    background: var(--af-paper);
    font-size: 11.5px;
    line-height: 1.7;
    cursor: pointer;
  }

  .grill-choice:hover {
    border-color: var(--af-rule-strong);
  }

  .grill-choice:has(input:checked) {
    border-color: color-mix(in srgb, var(--af-green) 45%, transparent);
    background: var(--af-green-soft);
  }

  .grill-choice input {
    flex: 0 0 auto;
    margin: 3px 0 0;
    accent-color: var(--af-green);
  }

  .grill-choice-text {
    display: flex;
    gap: 7px;
    min-width: 0;
  }

  .grill-letter {
    flex: 0 0 auto;
    font-family: var(--af-mono);
    font-size: 10px;
    line-height: 1.9;
    color: var(--af-green);
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
    color: var(--af-ink-faint);
    font-size: 10.5px;
    text-decoration: underline;
    text-underline-offset: 3px;
    cursor: pointer;
  }

  .grill-clear:hover {
    color: var(--af-ink);
  }

  .grill-footer {
    flex-shrink: 0;
    padding: 10px 12px;
    border-top: 1px solid var(--af-rule);
    background: var(--af-paper-raised);
  }

  .grill-copy {
    width: 100%;
  }

  /* The copy button reports the outcome, so a click is never silent. */
  .grill-copy[data-status='copied'] {
    border-color: transparent;
    background: var(--af-green);
    color: var(--af-accent-ink);
  }

  .grill-copy[data-status='copied']:hover:not([disabled]) {
    border-color: transparent;
    background: color-mix(in srgb, var(--af-green) 85%, #000);
  }

  .grill-copy[data-status='failed'] {
    border-color: transparent;
    background: var(--af-amber);
    color: var(--af-accent-ink);
  }

  .grill-copy[data-status='failed']:hover:not([disabled]) {
    border-color: transparent;
    background: color-mix(in srgb, var(--af-amber) 85%, #000);
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
    border: 2px solid var(--af-paper-raised);
    border-radius: 999px;
    background: var(--af-accent);
    color: var(--af-accent-ink);
    font-family: var(--af-mono);
    font-size: 10px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    box-shadow: var(--af-shadow-xs);
    cursor: pointer;
    pointer-events: auto;
  }

  .grill-label[data-visible='false'] {
    visibility: hidden;
  }

  .grill-label:hover {
    background: color-mix(in srgb, var(--af-accent) 80%, #000);
  }

  .grill-label[data-answered='true'] {
    background: var(--af-green);
  }

  .grill-label[aria-pressed='true'] {
    box-shadow:
      0 0 0 2px color-mix(in srgb, var(--af-accent) 45%, transparent),
      var(--af-shadow-xs);
  }

  .grill-label:focus-visible {
    outline: none;
    box-shadow: var(--af-focus);
  }
`;
