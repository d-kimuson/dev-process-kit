import { css } from 'lit';

export const grillStyles = css`
  /*
   * The rail and its hand-off only work inside a bounded shell. A page that gives
   * the host no height (no \`height: 100%\` up the chain) would grow the shell to
   * its content and scroll the whole document, carrying the rail and the copy
   * button off screen; the viewport height is the fallback. A host with a height
   * still wins: the shell's own min/max-height pin it to that.
   */
  .dpk-shell {
    height: 100dvh;
  }

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
    background: var(--dpk-glass);
    backdrop-filter: blur(12px);
    color: var(--dpk-ink-soft);
    font-size: 16.5px;
    font-weight: 650;
    line-height: 1;
    box-shadow: var(--dpk-bevel), var(--dpk-shadow);
    cursor: pointer;
    transition:
      color 160ms var(--dpk-ease),
      background 160ms var(--dpk-ease),
      border-color 160ms var(--dpk-ease),
      box-shadow 160ms var(--dpk-ease),
      transform 160ms var(--dpk-ease-spring);
  }

  .grill-toggle:hover {
    color: var(--dpk-ink);
    transform: translateY(-2px) scale(1.05);
    box-shadow: var(--dpk-bevel), var(--dpk-shadow-lg);
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
    background: linear-gradient(135deg, var(--dpk-accent-bright), var(--dpk-accent-strong));
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.24),
      0 2px 8px color-mix(in srgb, var(--dpk-accent) 40%, transparent);
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
    background: linear-gradient(180deg, var(--dpk-paper-raised), var(--dpk-paper-inset));
    color: var(--dpk-ink-soft);
    font-family: var(--dpk-mono);
    font-size: 9px;
    font-weight: 650;
    font-variant-numeric: tabular-nums;
    line-height: 14px;
    /* The widest value is wider than the button it sits on: keep it on one line. */
    white-space: nowrap;
    text-align: center;
    box-shadow: var(--dpk-bevel), var(--dpk-shadow-xs);
  }

  .grill-toggle[aria-expanded='true'] .grill-toggle-badge {
    background: var(--dpk-paper-raised);
    color: var(--dpk-accent);
  }

  /* ------------------------------------------------------------- the list */

  /* A segmented control: a sunken track with the active tab raised out of it. */
  .grill-tabs {
    display: flex;
    align-items: center;
    gap: 3px;
    flex-shrink: 0;
    margin: 10px;
    padding: 3px;
    border: 1px solid var(--dpk-rule);
    border-radius: var(--dpk-radius);
    background: var(--dpk-paper-sunken);
    box-shadow: inset 0 1px 2px var(--dpk-shade-1);
  }

  .grill-tabs button {
    flex: 1 1 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    padding: 6px 9px;
    border: 1px solid transparent;
    border-radius: var(--dpk-radius-sm);
    background: transparent;
    color: var(--dpk-ink-faint);
    font-size: 11.5px;
    cursor: pointer;
    transition:
      background 140ms var(--dpk-ease),
      color 140ms var(--dpk-ease),
      box-shadow 140ms var(--dpk-ease);
  }

  .grill-tabs button:hover {
    color: var(--dpk-ink);
  }

  .grill-tabs button[aria-selected='true'] {
    background: var(--dpk-paper-raised);
    color: var(--dpk-ink);
    font-weight: 600;
    box-shadow: var(--dpk-bevel), var(--dpk-shadow-xs);
  }

  .grill-count {
    font-family: var(--dpk-mono);
    font-size: 10px;
    font-variant-numeric: tabular-nums;
    color: var(--dpk-ink-faint);
  }

  .grill-tabs button[aria-selected='true'] .grill-count {
    color: var(--dpk-accent);
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
    margin: 6px 0;
    border: 1px solid transparent;
    border-radius: var(--dpk-radius);
    transition:
      background 140ms var(--dpk-ease),
      border-color 140ms var(--dpk-ease);
  }

  .grill-question:has(.grill-heading[aria-expanded='true']) {
    border-color: var(--dpk-rule);
    background: var(--dpk-paper-raised);
    box-shadow: var(--dpk-bevel), var(--dpk-shadow-xs);
  }

  .grill-heading {
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

  .grill-heading:hover {
    background: var(--dpk-paper-sunken);
  }

  .grill-question:has(.grill-heading[aria-expanded='true']) .grill-heading:hover {
    background: none;
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

  .grill-question[data-answered='true'] .grill-ref {
    border-color: transparent;
    background: linear-gradient(180deg, var(--dpk-green-soft), color-mix(in srgb, var(--dpk-green) 16%, transparent));
    color: var(--dpk-green);
    box-shadow: var(--dpk-bevel);
  }

  .grill-question:has(.grill-heading[aria-expanded='true']) .grill-ref {
    border-color: transparent;
    background: linear-gradient(180deg, var(--dpk-accent-bright), var(--dpk-accent));
    color: var(--dpk-accent-ink);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.24),
      0 2px 6px -2px color-mix(in srgb, var(--dpk-accent) 55%, transparent);
  }

  .grill-heading-text {
    flex: 1;
    min-width: 0;
  }

  .grill-heading-text strong {
    display: block;
    font-size: 12.5px;
    font-weight: 620;
    line-height: 1.6;
    letter-spacing: -0.005em;
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
    line-height: 22px;
    text-align: center;
  }

  .grill-chevron svg {
    display: block;
    width: 13px;
    height: 13px;
    margin: 4.5px auto 0;
    transition: transform 180ms var(--dpk-ease);
  }

  .grill-heading[aria-expanded='true'] .grill-chevron svg {
    transform: rotate(90deg);
    color: var(--dpk-accent);
  }

  .grill-body {
    padding: 2px 8px 14px 47px;
    animation: dpk-grill-open 180ms var(--dpk-ease) backwards;
  }

  @keyframes dpk-grill-open {
    from {
      opacity: 0;
      transform: translateY(-4px);
    }
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
    background: linear-gradient(90deg, var(--dpk-amber-soft), transparent);
    font-size: 11px;
    line-height: 1.7;
    color: var(--dpk-ink-soft);
  }

  .grill-choices {
    display: grid;
    gap: 6px;
  }

  .grill-choice {
    position: relative;
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 8px 9px 8px 12px;
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

  /* Selection indicator: a colored bar on the leading edge, like the rail's
     comment cards — quiet until a choice is actually picked. */
  .grill-choice::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    background: transparent;
    transition: background 140ms var(--dpk-ease);
  }

  .grill-choice:hover {
    border-color: var(--dpk-rule-hover);
    background: var(--dpk-paper-inset);
  }

  .grill-choice:has(input:checked) {
    border-color: color-mix(in srgb, var(--dpk-green) 45%, transparent);
    background: var(--dpk-green-soft);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--dpk-green) 30%, transparent);
  }

  .grill-choice:has(input:checked)::before {
    background: var(--dpk-green);
  }

  .grill-choice--free {
    border-style: dashed;
  }

  .grill-choice--free[data-free='true'] {
    border-style: solid;
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
    font-weight: 600;
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
    box-shadow: 0 -6px 12px -10px var(--dpk-shade-2);
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

  /* The author's own markup lands in slot="main": nudge its prose toward the
     kit's own type scale, so the diagrams it wraps don't feel bolted on. */
  .grill-stage ::slotted(h1),
  .grill-stage ::slotted(h2),
  .grill-stage ::slotted(h3) {
    font-family: var(--dpk-display);
    font-weight: 660;
    letter-spacing: -0.015em;
    color: var(--dpk-ink);
  }

  .grill-stage ::slotted(p) {
    line-height: 1.75;
    color: var(--dpk-ink-soft);
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
    background: linear-gradient(180deg, var(--dpk-accent-bright), var(--dpk-accent));
    color: var(--dpk-accent-ink);
    font-family: var(--dpk-mono);
    font-size: 10px;
    font-weight: 650;
    font-variant-numeric: tabular-nums;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.28),
      0 2px 6px -2px color-mix(in srgb, var(--dpk-accent) 55%, transparent);
    cursor: pointer;
    pointer-events: auto;
    transition:
      transform 160ms var(--dpk-ease-spring),
      box-shadow 160ms var(--dpk-ease),
      background 160ms var(--dpk-ease);
  }

  .grill-label[data-visible='false'] {
    visibility: hidden;
  }

  .grill-label:hover {
    transform: translateY(-1px) scale(1.06);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.3),
      0 4px 10px -2px color-mix(in srgb, var(--dpk-accent) 60%, transparent);
  }

  .grill-label[data-answered='true'] {
    background: linear-gradient(180deg, color-mix(in srgb, var(--dpk-green) 85%, white), var(--dpk-green));
  }

  .grill-label[aria-pressed='true'] {
    box-shadow:
      0 0 0 2px color-mix(in srgb, var(--dpk-accent) 45%, transparent),
      var(--dpk-shadow-sm);
  }

  .grill-label:focus-visible {
    outline: none;
    box-shadow: var(--dpk-focus);
  }
`;
