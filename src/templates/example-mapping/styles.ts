import { css } from 'lit';

/**
 * Board chrome of `<artifact-example-mapping>`: the table the cards sit on.
 *
 * Grouping is shown by a tinted lane around a rule, and inside it a green area
 * for its examples above a red one for its questions — never by a border on
 * one side. Cards style themselves.
 */
export const exampleMappingStyles = css`
  /* ------------------------------------------------------------ legend */

  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 14px;
    margin: 0;
    padding: 0;
    list-style: none;
    font-size: 11.5px;
    color: var(--af-ink-soft);
  }

  .legend li {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .legend-swatch {
    width: 14px;
    height: 11px;
    border-radius: 2px;
    background: var(--em-card-bg);
    box-shadow: 0 1px 2px rgba(30, 24, 10, 0.18);
  }

  /* ------------------------------------------------------------- board */

  .board {
    display: grid;
    gap: 22px;
    align-content: start;
  }

  .story-section {
    display: grid;
    gap: 18px;
    min-width: 0;
    padding: 20px 22px 24px;
    border: 1px solid var(--af-rule);
    border-radius: var(--af-radius-lg);
    background:
      radial-gradient(circle, rgba(20, 28, 44, 0.07) 1px, transparent 1.2px) 0 0 / 18px 18px,
      var(--af-paper-raised);
    box-shadow: var(--af-shadow);
    transition: outline-color 150ms ease;
  }

  .story-section[data-drop='true'] {
    outline: 2px dashed var(--af-blue);
    outline-offset: 4px;
  }

  /* The story heads the table: one wide card, with where it stands beside it. */
  .story-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 14px 20px;
  }

  .story-slot {
    width: min(420px, 100%);
  }

  .story-meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
  }

  .readiness {
    padding: 4px 11px;
    border-radius: 999px;
    font-size: 11.5px;
    font-weight: 650;
    background: var(--af-paper-sunken);
    color: var(--af-ink-soft);
  }

  .readiness[data-readiness='ready'] {
    background: var(--af-green-soft);
    color: var(--af-green);
  }

  .readiness[data-readiness='open-questions'],
  .readiness[data-readiness='too-big'] {
    background: rgba(214, 53, 80, 0.1);
    color: #b81c33;
  }

  .readiness[data-readiness='thin'] {
    background: var(--af-amber-soft);
    color: var(--af-amber);
  }

  .tally {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 9px;
    border: 1px solid var(--af-rule);
    border-radius: 999px;
    background: var(--af-paper-raised);
    font-family: var(--af-mono);
    font-size: 10.5px;
    font-variant-numeric: tabular-nums;
    color: var(--af-ink-soft);
  }

  .tally-dot {
    width: 8px;
    height: 8px;
    border-radius: 2px;
    background: var(--em-card-bg);
  }

  /* ------------------------------------------------- rules and examples */

  /* Rules side by side under the story; the row scrolls, never the page. */
  .rules-row {
    display: flex;
    align-items: flex-start;
    gap: 14px;
    min-width: 0;
    overflow-x: auto;
    padding: 4px 4px 16px;
    border-radius: var(--af-radius);
  }

  .rules-row[data-drop='true'] {
    background: var(--af-blue-soft);
  }

  /* A rule and its examples read as one lane: a soft tint, no side border. */
  .rule-col {
    flex: 0 0 204px;
    display: grid;
    gap: 16px;
    align-content: start;
    padding: 10px 10px 14px;
    border-radius: var(--af-radius-lg);
    background: linear-gradient(180deg, rgba(51, 102, 204, 0.09), rgba(51, 102, 204, 0.03) 70%, transparent);
  }

  .rule-col[data-dragging] {
    opacity: 0.45;
  }

  /* Examples on top, questions below: two areas, each its own drop target. */
  .card-area {
    display: grid;
    gap: 12px;
    align-content: start;
    min-height: 44px;
    padding: 8px 8px 10px;
    border-radius: var(--af-radius);
  }

  .card-area--example {
    background: rgba(74, 163, 94, 0.08);
  }

  .card-area--question {
    background: rgba(214, 53, 80, 0.06);
  }

  .card-area--question artifact-example-mapping-card {
    min-height: 56px;
  }

  .card-area[data-drop='true'] {
    outline: 2px dashed var(--af-blue);
    outline-offset: 2px;
  }

  .area-label {
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 0;
    font-size: 10.5px;
    font-weight: 600;
    letter-spacing: 0.04em;
    color: var(--af-ink-soft);
  }

  .stack-hint {
    margin: 0;
    font-size: 11px;
    color: var(--af-ink-faint);
    text-align: center;
  }

  /* -------------------------------------------------------- add buttons */

  .add-card,
  .add-rule,
  .add-story {
    border: 1px dashed var(--af-rule-strong);
    border-radius: var(--af-radius-sm);
    background: rgba(255, 255, 255, 0.6);
    color: var(--af-ink-faint);
    font: inherit;
    font-size: 11.5px;
    cursor: pointer;
    transition:
      background 140ms ease,
      border-color 140ms ease,
      color 140ms ease;
  }

  .add-card {
    padding: 6px 8px;
  }

  .add-rule {
    flex: 0 0 120px;
    display: grid;
    place-items: center;
    align-content: center;
    gap: 2px;
    min-height: 96px;
  }

  .add-plus {
    font-size: 18px;
    line-height: 1;
  }

  .add-story {
    justify-self: start;
    padding: 10px 18px;
    font-size: 12.5px;
  }

  .add-card:hover,
  .add-rule:hover,
  .add-story:hover {
    border-color: var(--af-blue);
    background: var(--af-blue-soft);
    color: var(--af-blue);
  }

  .empty {
    display: grid;
    gap: 10px;
    max-width: 620px;
    padding: 28px 24px;
    border: 1px dashed var(--af-rule-strong);
    border-radius: var(--af-radius-lg);
    background: var(--af-paper-raised);
  }

  .empty p {
    margin: 0;
    color: var(--af-ink-soft);
    line-height: 1.7;
  }
`;
