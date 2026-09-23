import { css } from 'lit';

/**
 * Kanban styling. Columns are fixed-width lanes on the canvas; cards flow in
 * them, so the board's size is the browser's layout rather than a computed one.
 */
export const kanbanStyles = css`
  .kanban-board {
    display: flex;
    align-items: flex-start;
    gap: 14px;
    width: max-content;
    padding: 18px;
  }

  .kanban-column {
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 264px;
    padding: 10px;
    border: 1px solid var(--af-rule);
    border-radius: var(--af-radius);
    background: var(--af-paper-sunken);
    cursor: default;
    transition:
      border-color 150ms ease,
      box-shadow 150ms ease;
  }

  .kanban-column.is-selected {
    border-color: var(--af-ink-soft);
    box-shadow: 0 0 0 3px var(--af-blue-soft);
  }

  .kanban-column.is-drop-target {
    border-color: var(--af-blue);
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
    border-radius: var(--af-radius-xs);
    background: none;
    color: var(--af-ink);
    font-family: var(--af-body);
    font-size: 13px;
    font-weight: 650;
    text-align: left;
    cursor: pointer;
  }

  .kanban-column-title:focus-visible {
    outline: none;
    box-shadow: var(--af-focus);
  }

  .kanban-column-label {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* An authored colour marks the heading, not the cards: the status reads at a glance. */
  .kanban-column[data-color='gray'] {
    --kanban-tone: var(--af-ink-soft);
  }

  .kanban-column[data-color='blue'] {
    --kanban-tone: var(--af-blue);
  }

  .kanban-column[data-color='green'] {
    --kanban-tone: var(--af-green);
  }

  .kanban-column[data-color='amber'] {
    --kanban-tone: var(--af-amber);
  }

  .kanban-column[data-color='violet'] {
    --kanban-tone: var(--af-violet);
  }

  .kanban-column[data-color='red'] {
    --kanban-tone: var(--af-accent);
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
    background: var(--af-paper-raised);
    color: var(--af-ink-soft);
    font-family: var(--af-mono);
    font-size: 11px;
    font-weight: 600;
  }

  /* Over its WIP limit: the column asks for attention, not the cards. */
  .kanban-column.is-over {
    border-color: color-mix(in srgb, var(--af-accent) 55%, transparent);
  }

  .kanban-column.is-over .kanban-count {
    background: var(--af-accent-soft);
    color: var(--af-accent);
  }

  .kanban-column-head > .diagram-comment-trigger {
    position: absolute;
    top: 50%;
    right: 0;
    transform: translateY(-50%);
  }

  .kanban-column-description {
    margin: 0 2px;
    color: var(--af-ink-soft);
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

  .kanban-card {
    display: flex;
    flex-direction: column;
    gap: 5px;
    padding: 9px 34px 9px 11px;
    border: 1px solid var(--af-rule);
    border-radius: var(--af-radius-sm);
    background: var(--af-paper-raised);
    color: var(--af-ink);
    font-family: var(--af-body);
    box-shadow: var(--af-shadow-xs);
    cursor: grab;
    transition:
      border-color 150ms ease,
      box-shadow 150ms ease,
      opacity 150ms ease;
  }

  .kanban-card:hover {
    border-color: var(--af-rule-strong);
  }

  .kanban-card.is-selected {
    border-color: var(--af-ink-soft);
    box-shadow: 0 0 0 3px var(--af-blue-soft);
  }

  .kanban-card:focus-visible {
    outline: none;
    box-shadow: var(--af-focus);
  }

  .kanban-card.is-dragging {
    opacity: 0.4;
  }

  /* Changed on this page by a draft action: not authored yet. */
  .kanban-card.is-added {
    border-style: dashed;
    border-color: var(--af-green);
  }

  .kanban-card.is-moved {
    border-left: 3px solid var(--af-blue);
  }

  .kanban-card-title {
    font-size: 13px;
    font-weight: 560;
    line-height: 1.45;
    overflow-wrap: anywhere;
  }

  .kanban-card-description {
    display: -webkit-box;
    overflow: hidden;
    color: var(--af-ink-soft);
    font-size: 11.5px;
    line-height: 1.45;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    overflow-wrap: anywhere;
  }

  .kanban-card-meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px;
  }

  .kanban-tag {
    padding: 1px 6px;
    border-radius: var(--af-radius-xs);
    background: var(--af-paper-sunken);
    color: var(--af-ink-soft);
    font-size: 10.5px;
  }

  .kanban-assignee {
    margin-left: auto;
    color: var(--af-ink-faint);
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
    padding: 4px 6px;
    border-radius: var(--af-radius-xs);
    background: var(--af-paper-raised);
    color: var(--af-accent);
    font-size: 11.5px;
    line-height: 1.4;
  }

  /* Takes no room of its own, so the cards do not jump while dragging. */
  .kanban-drop-marker {
    height: 3px;
    margin: -5.5px 0;
    border-radius: 2px;
    background: var(--af-blue);
  }

  .kanban-add {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .kanban-add-button {
    padding: 6px 8px;
    border: 1px dashed var(--af-rule-strong);
    border-radius: var(--af-radius-sm);
    background: none;
    color: var(--af-ink-soft);
    font-family: var(--af-body);
    font-size: 12px;
    text-align: left;
    cursor: pointer;
  }

  .kanban-add-button:hover,
  .kanban-add-button:focus-visible {
    border-color: var(--af-ink-soft);
    color: var(--af-ink);
    outline: none;
  }

  .kanban-add .af-input {
    width: 100%;
    font-size: 12.5px;
  }
`;
