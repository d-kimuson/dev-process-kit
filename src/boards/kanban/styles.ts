import { css } from 'lit';

/**
 * Kanban styling. Columns are fixed-width lanes read left to right in normal
 * document flow; a board wider than the panel scrolls horizontally on its
 * own (the panel's own body never scrolls sideways), and cards wrap within a
 * column rather than panning anywhere.
 */
export const kanbanStyles = css`
  /* The columns and, while a card is open, its detail beside them. */
  .kanban-stage {
    display: flex;
    align-items: flex-start;
    gap: 14px;
    min-width: 0;
  }

  .kanban-board {
    flex: 1 1 auto;
    min-width: 0;
    display: flex;
    align-items: flex-start;
    gap: 14px;
    max-width: 100%;
    overflow-x: auto;
    /* An edge swipe here must pan the board, never fall through to browser back/forward. */
    overscroll-behavior-x: contain;
    padding-bottom: 4px;
  }

  .kanban-column {
    display: flex;
    flex-direction: column;
    flex: none;
    gap: 8px;
    width: 264px;
    padding: 10px;
    border: 1px solid var(--dpk-rule);
    border-radius: var(--dpk-radius-lg);
    background: var(--dpk-paper-sunken);
    box-shadow: inset 0 1px 3px var(--dpk-shade-1);
    cursor: default;
    transition:
      border-color 150ms var(--dpk-ease),
      box-shadow 150ms var(--dpk-ease);
  }

  .kanban-column.is-selected {
    border-color: color-mix(in srgb, var(--dpk-blue) 55%, transparent);
    box-shadow:
      inset 0 1px 3px var(--dpk-shade-1),
      inset 0 0 0 2px color-mix(in srgb, var(--dpk-blue) 40%, transparent);
  }

  .kanban-column.is-drop-target {
    border-color: var(--dpk-blue);
    background: color-mix(in srgb, var(--dpk-blue-soft) 60%, var(--dpk-paper-sunken));
    box-shadow:
      inset 0 1px 3px var(--dpk-shade-1),
      inset 0 0 0 2px color-mix(in srgb, var(--dpk-blue) 30%, transparent);
  }

  .kanban-column-head {
    position: relative;
    display: flex;
    align-items: center;
  }

  .kanban-column-title {
    display: flex;
    flex: 1;
    align-items: center;
    gap: 8px;
    min-width: 0;
    padding: 2px 34px 2px 2px;
    border: 0;
    border-radius: var(--dpk-radius-xs);
    background: none;
    color: var(--dpk-ink);
    font-family: var(--dpk-body);
    font-size: 13px;
    font-weight: 650;
    letter-spacing: -0.01em;
    text-align: left;
    cursor: pointer;
  }

  .kanban-column-title:focus-visible {
    outline: none;
    box-shadow: var(--dpk-focus);
  }

  .kanban-column-label {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* An authored color marks the heading, not the cards: the status reads at a glance. */
  .kanban-column[data-color='gray'] {
    --kanban-tone: var(--dpk-ink-soft);
  }

  .kanban-column[data-color='blue'] {
    --kanban-tone: var(--dpk-blue);
  }

  .kanban-column[data-color='green'] {
    --kanban-tone: var(--dpk-green);
  }

  .kanban-column[data-color='amber'] {
    --kanban-tone: var(--dpk-amber);
  }

  .kanban-column[data-color='violet'] {
    --kanban-tone: var(--dpk-violet);
  }

  .kanban-column[data-color='red'] {
    --kanban-tone: var(--dpk-accent);
  }

  .kanban-column[data-color] .kanban-column-label {
    padding: 2px 9px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--kanban-tone) 14%, transparent);
    color: var(--kanban-tone);
  }

  .kanban-count {
    flex: none;
    padding: 1px 7px;
    border-radius: 999px;
    background: var(--dpk-paper-raised);
    color: var(--dpk-ink-soft);
    font-family: var(--dpk-mono);
    font-size: 11px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    box-shadow: var(--dpk-bevel), var(--dpk-shadow-xs);
  }

  /* Over its WIP limit: the column asks for attention, not the cards. */
  .kanban-column.is-over {
    border-color: color-mix(in srgb, var(--dpk-accent) 55%, transparent);
  }

  .kanban-column.is-over .kanban-count {
    background: var(--dpk-accent-soft);
    color: var(--dpk-accent);
  }

  .kanban-column-head > .diagram-comment-trigger {
    position: absolute;
    top: 50%;
    right: 0;
    transform: translateY(-50%);
  }

  .kanban-column-description {
    margin: 0 2px;
    color: var(--dpk-ink-soft);
    font-size: 11.5px;
    line-height: 1.45;
  }

  .kanban-cards {
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-height: 44px;
  }

  .kanban-card-slot {
    position: relative;
  }

  /* The card is the kit's card (the card atom); the board adds the room for the comment trigger and the grab. */
  .kanban-card {
    --dpk-card-gap: 6px;
    padding-right: 34px;
    cursor: grab;
  }

  /* Changed on this page by a draft action: not authored yet. */
  .kanban-card.is-added {
    border-style: dashed;
    border-color: var(--dpk-green);
    background: linear-gradient(var(--dpk-green-soft), var(--dpk-green-soft)), var(--dpk-paper-raised);
  }

  .kanban-card.is-moved {
    border-color: var(--dpk-blue);
    background: linear-gradient(var(--dpk-blue-soft), var(--dpk-blue-soft)), var(--dpk-paper-raised);
  }

  /* The key rides in the card's head: keep it clear of the comment trigger that takes the top right. */
  .kanban-card .dpk-card-key {
    margin-right: 4px;
  }

  .kanban-card-meta {
    align-items: center;
  }

  .kanban-assignee {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    margin-left: auto;
    color: var(--dpk-ink-faint);
    font-size: 11px;
  }

  .kanban-card-slot > .diagram-comment-trigger {
    position: absolute;
    top: 5px;
    right: 5px;
    z-index: 2;
  }

  .kanban-error {
    margin: 6px 0 0;
    padding: 4px 7px;
    border-radius: var(--dpk-radius-xs);
    background: var(--dpk-accent-soft);
    color: var(--dpk-accent);
    font-size: 11.5px;
    line-height: 1.4;
  }

  /* Takes no room of its own, so the cards do not jump while dragging. */
  .kanban-drop-marker {
    height: 3px;
    margin: -5.5px 0;
    border-radius: 2px;
    background: var(--dpk-blue);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--dpk-blue) 22%, transparent);
    animation: dpk-drop-in 140ms var(--dpk-ease-spring) backwards;
  }

  @keyframes dpk-drop-in {
    from {
      opacity: 0;
      transform: scaleX(0.4);
    }
  }

  .kanban-add {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .kanban-add-button {
    padding: 6px 8px;
    border: 1px dashed var(--dpk-rule-strong);
    border-radius: var(--dpk-radius-sm);
    background: none;
    color: var(--dpk-ink-soft);
    font-family: var(--dpk-body);
    font-size: 12px;
    text-align: left;
    cursor: pointer;
    transition:
      border-color 140ms var(--dpk-ease),
      background 140ms var(--dpk-ease),
      color 140ms var(--dpk-ease);
  }

  .kanban-add-button:hover,
  .kanban-add-button:focus-visible {
    border-color: color-mix(in srgb, var(--dpk-blue) 45%, var(--dpk-rule-strong));
    background: var(--dpk-paper-raised);
    color: var(--dpk-ink);
    outline: none;
  }

  .kanban-add .dpk-input {
    width: 100%;
    font-size: 12.5px;
  }

  /* In normal document flow (not over a canvas): a plain, non-floating notice. */
  .kanban-empty {
    margin: 0;
    padding: 16px 20px;
    border: 1.5px dashed var(--dpk-rule-strong);
    border-radius: var(--dpk-radius);
    background: color-mix(in srgb, var(--dpk-paper-raised) 55%, transparent);
    color: var(--dpk-ink-faint);
    font-size: 12px;
    text-align: center;
  }

  .kanban-notice {
    margin: 0;
    padding: 12px 16px 12px 19px;
    border: 1px solid color-mix(in srgb, var(--dpk-danger) 35%, transparent);
    border-radius: var(--dpk-radius);
    background: linear-gradient(90deg, var(--dpk-danger) 0 3px, transparent 3px), var(--dpk-danger-soft);
    box-shadow: var(--dpk-bevel), var(--dpk-shadow);
    color: var(--dpk-ink-soft);
    font-size: 12px;
  }

  /* ------------------------------------------------------------ card detail */

  /* A panel beside the columns, not over them: the board narrows instead of
     hiding what the reader was comparing. Sticky within the panel body, so it
     stays in view while a tall column scrolls. */
  .kanban-detail {
    flex: none;
    position: sticky;
    top: 0;
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    width: min(380px, 100%);
    max-height: calc(100vh - var(--dpk-header-height, 0px) - 96px);
    border: 1px solid var(--dpk-rule-strong);
    border-radius: var(--dpk-radius-lg);
    background: var(--dpk-paper-raised);
    box-shadow: var(--dpk-shadow-lg);
    overflow: hidden;
  }
  .kanban-detail:focus {
    outline: none;
  }
  .kanban-detail-head {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 10px 10px 14px;
    border-bottom: 1px solid var(--dpk-rule);
    /* The close button keeps clear of a floating menu docked at the right edge. */
    padding-inline-end: calc(10px + var(--dpk-floating-menu-clearance, 0px));
  }
  .kanban-detail-key {
    color: var(--dpk-ink-faint);
    font-family: var(--dpk-mono);
    font-size: 11px;
    font-weight: 650;
    font-variant-numeric: tabular-nums;
  }
  .kanban-detail-column {
    padding: 1px 8px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--kanban-tone, var(--dpk-ink-faint)) 12%, var(--dpk-paper-sunken));
    color: var(--kanban-tone, var(--dpk-ink-soft));
    font-size: 11px;
    font-weight: 650;
  }
  .kanban-detail-close {
    margin-left: auto;
  }
  .kanban-detail-body {
    display: grid;
    align-content: start;
    gap: 18px;
    min-height: 0;
    padding: 14px 16px 20px;
    overflow: auto;
  }
  .kanban-detail-title {
    margin: 0;
    font-size: 17px;
    font-weight: 700;
    line-height: 1.35;
    letter-spacing: -0.01em;
  }
  .kanban-detail-title dpk-inline-edit,
  .kanban-detail-field > dpk-inline-edit {
    display: block;
    margin: 0 -4px;
  }
  .kanban-detail-field {
    display: grid;
    gap: 7px;
    min-width: 0;
  }
  .kanban-statuses {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .kanban-status {
    padding: 4px 11px;
    border: 1px solid var(--dpk-rule-strong);
    border-radius: 999px;
    background: var(--dpk-paper-raised);
    color: var(--dpk-ink-soft);
    font: inherit;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
  }
  .kanban-status[aria-pressed='true'] {
    border-color: color-mix(in srgb, var(--dpk-blue) 55%, transparent);
    background: var(--dpk-blue-soft);
    color: var(--dpk-blue);
  }
  .kanban-status:focus-visible {
    outline: none;
    box-shadow: var(--dpk-focus);
  }
  .kanban-tag-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
  }
  .kanban-tag {
    gap: 2px;
    padding-right: 2px;
  }
  .kanban-tag-remove {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border: 0;
    border-radius: 999px;
    background: none;
    color: inherit;
    cursor: pointer;
    opacity: 0.7;
  }
  .kanban-tag-remove:hover,
  .kanban-tag-remove:focus-visible {
    background: color-mix(in srgb, var(--dpk-ink) 8%, transparent);
    opacity: 1;
    outline: none;
  }
  .kanban-tag-remove svg {
    width: 11px;
    height: 11px;
  }
  .kanban-tag-add {
    flex: 1 1 110px;
    min-width: 90px;
    font-size: 12px;
  }
  .kanban-link-list {
    display: grid;
    gap: 4px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .kanban-link-list li {
    display: flex;
    align-items: center;
    gap: 4px;
    min-width: 0;
    border: 1px solid var(--dpk-rule);
    border-radius: var(--dpk-radius-sm);
    background: var(--dpk-paper-sunken);
  }
  .kanban-link {
    display: flex;
    flex: 1 1 auto;
    align-items: center;
    gap: 6px;
    min-width: 0;
    padding: 6px 8px;
    color: var(--dpk-ink-soft);
    font-family: var(--dpk-mono);
    font-size: 11.5px;
    font-weight: 600;
    text-decoration: none;
  }
  .kanban-link span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .kanban-link:hover span {
    text-decoration: underline;
  }
  .kanban-link svg {
    flex: none;
    width: 12px;
    height: 12px;
  }
  .kanban-link-remove {
    flex: none;
    width: 24px;
    height: 24px;
    margin-right: 4px;
  }
  .kanban-link-add {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .kanban-link-add [data-role='link-url'] {
    flex: 1 1 100%;
    font-size: 12px;
  }
  .kanban-link-add [data-role='link-label'] {
    flex: 1 1 120px;
    font-size: 12px;
  }
  .kanban-link-add .dpk-btn {
    flex: none;
  }
  .kanban-card-links .link-chip {
    max-width: 100%;
  }
  .kanban-card-links .link-chip span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* A narrow screen stacks the panel under the board instead of squeezing both. */
  @media (max-width: 860px) {
    .kanban-stage {
      flex-direction: column;
    }
    .kanban-detail {
      position: static;
      width: 100%;
      max-height: none;
    }
  }
`;
