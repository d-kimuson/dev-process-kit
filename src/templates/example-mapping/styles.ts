import { css } from 'lit';

/**
 * Board chrome of `<dpk-template-example-mapping>`: the table the cards sit on.
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
    gap: 6px;
    margin: 0;
    padding: 0;
    list-style: none;
    font-size: 11.5px;
    color: var(--dpk-ink-soft);
  }

  /* Each entry reads as a small raised chip, matching the pill vocabulary
     used for the readiness / tally summary next to it. */
  .legend li {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px 4px 6px;
    border: 1px solid var(--dpk-rule);
    border-radius: 999px;
    background: var(--dpk-paper-raised);
    box-shadow: var(--dpk-bevel), var(--dpk-shadow-xs);
  }

  .legend-swatch {
    width: 14px;
    height: 11px;
    border-radius: 2px;
    background: var(--em-card-bg);
    box-shadow: var(--dpk-shadow-xs);
  }

  /* ------------------------------------------------------------- board */

  .board {
    display: grid;
    gap: 22px;
    align-content: start;
  }

  .story-section {
    position: relative;
    display: grid;
    gap: 18px;
    min-width: 0;
    padding: 20px 22px 24px;
    border: 1px solid var(--dpk-rule);
    border-radius: var(--dpk-radius-lg);
    background:
      radial-gradient(circle, var(--dpk-rule) 1px, transparent 1.2px) 0 0 / 18px 18px,
      var(--dpk-paper-raised);
    box-shadow: var(--dpk-shadow);
    transition: outline-color 150ms ease;
  }

  /* A quiet top edge marks the section as one grouped unit, echoing the
     activity band accent used elsewhere in the kit. */
  .story-section::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    border-radius: var(--dpk-radius-lg) var(--dpk-radius-lg) 0 0;
    background: color-mix(in srgb, var(--dpk-accent) 45%, transparent);
  }

  .story-section[data-drop='true'] {
    outline: 2px dashed var(--dpk-blue);
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
    background: var(--dpk-paper-sunken);
    color: var(--dpk-ink-soft);
    box-shadow: var(--dpk-shadow-xs);
  }

  .readiness[data-readiness='ready'] {
    background: var(--dpk-green-soft);
    color: var(--dpk-green);
  }

  .readiness[data-readiness='open-questions'],
  .readiness[data-readiness='too-big'] {
    background: var(--dpk-danger-soft);
    color: var(--dpk-danger);
  }

  .readiness[data-readiness='thin'] {
    background: var(--dpk-amber-soft);
    color: var(--dpk-amber);
  }

  .tally {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 9px;
    border: 1px solid var(--dpk-rule);
    border-radius: 999px;
    background: var(--dpk-paper-raised);
    box-shadow: var(--dpk-bevel), var(--dpk-shadow-xs);
    font-family: var(--dpk-mono);
    font-size: 10.5px;
    font-variant-numeric: tabular-nums;
    color: var(--dpk-ink-soft);
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
    border-radius: var(--dpk-radius);
  }

  .rules-row[data-drop='true'] {
    background: var(--dpk-blue-soft);
  }

  /* A rule and its examples read as one lane: a soft tint plus a quiet left
     accent, so the grouping reads even where the tint thins out lower down. */
  .rule-col {
    position: relative;
    flex: 0 0 204px;
    display: grid;
    gap: 16px;
    align-content: start;
    padding: 10px 10px 14px;
    border-radius: var(--dpk-radius-lg);
    background: linear-gradient(
      180deg,
      color-mix(in srgb, var(--dpk-blue) 9%, transparent),
      color-mix(in srgb, var(--dpk-blue) 3%, transparent) 70%,
      transparent
    );
    box-shadow: inset 2px 0 0 color-mix(in srgb, var(--dpk-blue) 40%, transparent);
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
    border-radius: var(--dpk-radius);
    box-shadow: inset 0 1px 3px var(--dpk-shade-1);
  }

  .card-area--example {
    background: var(--dpk-green-soft);
  }

  .card-area--question {
    background: var(--dpk-danger-soft);
  }

  .card-area--question dpk-internal-example-mapping-card {
    min-height: 56px;
  }

  .card-area[data-drop='true'] {
    outline: 2px dashed var(--dpk-blue);
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
    color: var(--dpk-ink-soft);
  }

  .stack-hint {
    margin: 0;
    font-size: 11px;
    color: var(--dpk-ink-faint);
    text-align: center;
  }

  /* -------------------------------------------------------- add buttons */

  .add-card,
  .add-rule,
  .add-story {
    border: 1px dashed var(--dpk-rule-strong);
    border-radius: var(--dpk-radius-sm);
    background: color-mix(in srgb, var(--dpk-paper-raised) 60%, transparent);
    color: var(--dpk-ink-faint);
    font: inherit;
    font-size: 11.5px;
    cursor: pointer;
    transition:
      background 140ms var(--dpk-ease),
      border-color 140ms var(--dpk-ease),
      color 140ms var(--dpk-ease),
      transform 140ms var(--dpk-ease);
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
    border-color: var(--dpk-blue);
    background: var(--dpk-blue-soft);
    color: var(--dpk-blue);
    transform: translateY(-1px);
  }

  /* The empty state is the working canvas before anything is on it: same
     dot-grid ground as the other templates' boards. */
  .empty {
    display: grid;
    gap: 10px;
    max-width: 620px;
    padding: 28px 24px;
    border: 1px dashed var(--dpk-rule-strong);
    border-radius: var(--dpk-radius-lg);
    background: var(--dpk-dots), var(--dpk-paper-sunken);
  }

  .empty p {
    margin: 0;
    color: var(--dpk-ink-soft);
    line-height: 1.7;
  }
`;
