import { css } from 'lit';

/**
 * One colour per state, shared by the status pill and the todo marks: blue is
 * moving, amber is waiting on the reader, red is stuck, green is done, grey
 * has not started.
 *
 * The page is `main | rail`. The main area is the conversation — context,
 * work log and questions, one tab at a time — and scrolls on its own; the
 * shell's sidebar becomes a right-hand rail holding the outputs and the todo
 * list, so the work itself stays in view. The review floats over the rail
 * instead of taking a column of its own. On a phone the main area and the rail
 * stack and the page scrolls as one.
 */
export const taskBoardStyles = css`
  .dpk-main {
    order: 1;
  }

  .dpk-sidebar {
    order: 2;
    width: 360px;
    padding: 10px 14px 20px;
    border-right: 0;
    border-left: 1px solid var(--dpk-rule);
  }

  .board-rail {
    display: grid;
    gap: 14px;
  }

  /* The review opens where it always does, on the right, but over the rail:
     a third column would squeeze the board, and the shell's order would put
     it on the left of the main area. */
  .dpk-body {
    position: relative;
  }

  .dpk-notes {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    z-index: 30;
    width: 360px;
    max-width: 100%;
    box-shadow: var(--dpk-shadow-lg);
  }

  .board {
    display: grid;
    gap: 18px;
    max-width: 880px;
    width: 100%;
    margin: 0 auto;
  }

  @media (max-width: 760px) {
    /* Without a zero minimum, a truncated output row's full text width would
       widen the whole shell past the screen. */
    .dpk-body {
      flex-direction: column;
      min-width: 0;
      overflow: auto;
    }

    .dpk-main,
    .dpk-sidebar {
      flex: 0 0 auto;
      overflow: visible;
    }

    .dpk-sidebar {
      width: auto;
      border-left: 0;
      border-top: 1px solid var(--dpk-rule);
    }

    /* The body scrolls here, so an absolute panel would scroll away with it:
       the review takes the screen instead, below the floating button. */
    .dpk-notes {
      position: fixed;
      inset: 0;
      z-index: 50;
      width: auto;
      padding-top: 60px;
      border-left: 0;
    }
  }

  [data-status='working'],
  [data-status='doing'] {
    --board-tone: var(--dpk-blue);
    --board-tone-soft: var(--dpk-blue-soft);
  }

  [data-status='waiting'] {
    --board-tone: var(--dpk-amber);
    --board-tone-soft: var(--dpk-amber-soft);
  }

  [data-status='blocked'] {
    --board-tone: var(--dpk-danger);
    --board-tone-soft: var(--dpk-danger-soft);
  }

  [data-status='done'] {
    --board-tone: var(--dpk-green);
    --board-tone-soft: var(--dpk-green-soft);
  }

  [data-status='todo'] {
    --board-tone: var(--dpk-rule-strong);
    --board-tone-soft: var(--dpk-paper-sunken);
  }

  /* ------------------------------------------------------------- status */

  .board-status {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 4px 11px 4px 9px;
    border-radius: 999px;
    background: var(--board-tone-soft);
    color: color-mix(in srgb, var(--board-tone) 80%, var(--dpk-ink));
    font-size: 12.5px;
    font-weight: 650;
    white-space: nowrap;
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--board-tone) 28%, transparent);
  }

  /* On a phone the header has no room; the Context tab says the same. */
  @media (max-width: 720px) {
    .board-status--header {
      display: none;
    }
  }

  .board-status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--board-tone);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--board-tone) 22%, transparent);
  }

  .board-status[data-status='working'] .board-status-dot {
    animation: board-pulse 1.8s var(--dpk-ease) infinite;
  }

  @keyframes board-pulse {
    50% {
      box-shadow: 0 0 0 6px color-mix(in srgb, var(--board-tone) 0%, transparent);
    }
  }

  /* --------------------------------------------------------------- tabs */

  /* Stays at the top of the main area while a long log or question list scrolls. */
  .board-tabs {
    position: sticky;
    top: 0;
    z-index: 2;
    display: flex;
    gap: 3px;
    padding: 3px;
    border: 1px solid var(--dpk-rule);
    border-radius: var(--dpk-radius);
    background: var(--dpk-paper-sunken);
    box-shadow:
      inset 0 1px 2px var(--dpk-shade-1),
      0 6px 14px -10px var(--dpk-shade-3);
  }

  .board-tabs [role='tab'] {
    flex: 1 1 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    min-width: 0;
    padding: 7px 10px;
    border: 1px solid transparent;
    border-radius: var(--dpk-radius-sm);
    background: transparent;
    color: var(--dpk-ink-soft);
    font: inherit;
    font-size: 13px;
    font-weight: 550;
    white-space: nowrap;
    cursor: pointer;
    transition:
      color 140ms var(--dpk-ease),
      background 140ms var(--dpk-ease);
  }

  .board-tabs [role='tab']:hover {
    color: var(--dpk-ink);
  }

  .board-tabs [role='tab']:focus-visible {
    outline: none;
    box-shadow: var(--dpk-focus);
  }

  .board-tabs [role='tab'][aria-selected='true'] {
    background: var(--dpk-paper-raised);
    color: var(--dpk-ink);
    font-weight: 700;
    box-shadow: var(--dpk-bevel), var(--dpk-shadow-xs);
  }

  .board-tab-count {
    min-width: 18px;
    padding: 0 6px;
    border-radius: 999px;
    background: var(--dpk-rule);
    color: var(--dpk-ink-soft);
    font-family: var(--dpk-mono);
    font-size: 10.5px;
    font-weight: 650;
    font-variant-numeric: tabular-nums;
    line-height: 17px;
    text-align: center;
  }

  /* An open blocker: the agent is stuck until the reader answers. */
  .board-tabs [data-alert='true'] .board-tab-count {
    background: var(--dpk-danger);
    color: #fff;
  }

  .board-panel {
    display: grid;
    gap: 18px;
    min-width: 0;
    animation: board-fade 180ms var(--dpk-ease);
  }

  .board-panel[hidden] {
    display: none;
  }

  @keyframes board-fade {
    from {
      opacity: 0;
      transform: translateY(4px);
    }
  }

  /* ------------------------------------------------------------ context */

  .board-context {
    display: grid;
    gap: 14px;
    min-width: 0;
  }

  /* Why / What side by side, then Goals / Non-goals: a design doc at a glance. */
  .board-context-parts {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  @media (max-width: 760px) {
    .board-context-parts {
      grid-template-columns: minmax(0, 1fr);
    }
  }

  .board-context-part {
    display: grid;
    align-content: start;
    gap: 6px;
    min-width: 0;
    padding: 14px 16px;
    border: 1px solid var(--dpk-rule);
    border-radius: var(--dpk-radius-lg);
    background: var(--dpk-paper-raised);
    box-shadow: var(--dpk-shadow-xs), var(--dpk-bevel);
  }

  .board-context-part[data-context='why'],
  .board-context-part[data-context='what'] {
    border-top: 3px solid var(--dpk-accent);
  }

  .board-context-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .board-context-title {
    margin: 0;
    color: var(--dpk-ink-soft);
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .board-context-text {
    margin: 0;
    color: var(--dpk-ink);
    font-size: 14px;
    line-height: 1.7;
    white-space: pre-line;
  }

  .board-context-items {
    display: grid;
    gap: 4px;
    margin: 0;
    padding: 0;
    list-style: none;
    color: var(--dpk-ink);
    font-size: 13.5px;
    line-height: 1.6;
  }

  .board-context-items li {
    position: relative;
    padding-left: 20px;
  }

  .board-context-items li::before {
    position: absolute;
    left: 0;
    font-weight: 700;
  }

  .board-context-part[data-context='goals'] li::before {
    content: '✓';
    color: var(--dpk-green);
  }

  .board-context-part[data-context='nonGoals'] li::before {
    content: '−';
    color: var(--dpk-ink-faint);
  }

  .board-context-part[data-context='nonGoals'] .board-context-items {
    color: var(--dpk-ink-soft);
  }

  .board-figures {
    display: grid;
    gap: 14px;
    min-width: 0;
  }

  .board-figures ::slotted(*) {
    min-width: 0;
  }

  .board-updated {
    color: var(--dpk-ink-faint);
    font-size: 12px;
    font-variant-numeric: tabular-nums;
  }

  /* ----------------------------------------------------------- sections */

  .board-section {
    display: grid;
    gap: 12px;
    min-width: 0;
  }

  .board-rail-section {
    gap: 6px;
  }

  .board-section-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--dpk-rule);
  }

  .board-section-head h2 {
    margin: 0;
    color: var(--dpk-ink);
    font-size: 15px;
    font-weight: 700;
    letter-spacing: -0.01em;
  }

  /* The rail is narrow and always in view: its headings are labels, not breaks. */
  .board-rail-section .board-section-head {
    padding-bottom: 3px;
    line-height: 1.3;
  }

  .board-rail-section .board-section-head h2 {
    font-size: 11.5px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--dpk-ink-soft);
  }

  .board-section-meta {
    color: var(--dpk-ink-faint);
    font-size: 12px;
    font-variant-numeric: tabular-nums;
  }

  .board-lede {
    margin: -4px 0 0;
    color: var(--dpk-ink-soft);
    font-size: 12.5px;
  }

  .board-empty {
    margin: 0;
    padding: 12px 14px;
    border: 1px dashed var(--dpk-rule-strong);
    border-radius: var(--dpk-radius);
    color: var(--dpk-ink-faint);
    font-size: 13px;
  }

  .board-tag {
    flex: 0 0 auto;
    padding: 1px 7px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 650;
    line-height: 1.6;
    white-space: nowrap;
  }

  .board-tag[data-tone='done'] {
    background: var(--dpk-green-soft);
    color: color-mix(in srgb, var(--dpk-green) 75%, var(--dpk-ink));
  }

  .board-tag[data-tone='new'] {
    background: var(--dpk-accent-soft);
    color: var(--dpk-accent-ink);
  }

  .board-tag[data-tone='changed'] {
    background: var(--dpk-blue-soft);
    color: color-mix(in srgb, var(--dpk-blue) 75%, var(--dpk-ink));
  }

  .board-tag[data-tone='muted'] {
    background: var(--dpk-paper-inset);
    color: var(--dpk-ink-soft);
  }

  .board-comment {
    flex: 0 0 auto;
    position: relative;
  }

  /* ---------------------------------------------------------- questions */

  /* Blocking questions are red: the agent is waiting. The rest are amber: the
     agent goes on under its assumption. Either turns green once replied to. */
  .board-group {
    --board-group-tone: var(--dpk-amber);
    --board-group-soft: var(--dpk-amber-soft);
    display: grid;
    gap: 8px;
  }

  .board-group[data-group='blocking'] {
    --board-group-tone: var(--dpk-danger);
    --board-group-soft: var(--dpk-danger-soft);
  }

  .board-group-title {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0;
    color: color-mix(in srgb, var(--board-group-tone) 75%, var(--dpk-ink));
    font-size: 12.5px;
    font-weight: 700;
  }

  .board-group-title::before {
    content: '';
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--board-group-tone);
  }

  .board-group + .board-group {
    margin-top: 6px;
  }

  .board-questions {
    display: grid;
    gap: 10px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .board-card {
    display: grid;
    gap: 10px;
    padding: 14px 16px;
    border: 1px solid var(--dpk-rule);
    border-left: 3px solid var(--board-group-tone);
    border-radius: var(--dpk-radius);
    background: var(--dpk-paper-raised);
    box-shadow: var(--dpk-shadow-xs);
    transition:
      border-color 160ms var(--dpk-ease),
      background 160ms var(--dpk-ease);
  }

  .board-question[data-resolved='true'] {
    border-left-color: var(--dpk-green);
  }

  .board-card-head {
    display: flex;
    align-items: flex-start;
    gap: 10px;
  }

  .board-card-title {
    flex: 1 1 auto;
    margin: 0;
    color: var(--dpk-ink);
    font-size: 14px;
    font-weight: 650;
    line-height: 1.5;
  }

  .board-card-text {
    margin: 0;
    color: var(--dpk-ink-soft);
    font-size: 13px;
    line-height: 1.65;
    white-space: pre-line;
  }

  .board-ref {
    flex: 0 0 auto;
    padding: 2px 7px;
    border-radius: var(--dpk-radius-xs);
    background: var(--board-group-soft);
    color: color-mix(in srgb, var(--board-group-tone) 75%, var(--dpk-ink));
    font-family: var(--dpk-mono);
    font-size: 11.5px;
    font-weight: 700;
    line-height: 1.6;
  }

  .board-question[data-resolved='true'] .board-ref {
    background: var(--dpk-green-soft);
    color: color-mix(in srgb, var(--dpk-green) 75%, var(--dpk-ink));
  }

  .board-assumption {
    display: grid;
    gap: 3px;
    padding: 9px 12px;
    border-radius: var(--dpk-radius-sm);
    background: var(--dpk-paper-sunken);
  }

  .board-assumption-label {
    color: var(--dpk-ink-faint);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.03em;
  }

  .board-assumption-text {
    margin: 0;
    color: var(--dpk-ink);
    font-size: 13.5px;
    line-height: 1.55;
    white-space: pre-line;
  }

  .board-question[data-reply='answer'] .board-assumption-text {
    color: var(--dpk-ink-faint);
    text-decoration: line-through;
    text-decoration-color: color-mix(in srgb, var(--dpk-ink-faint) 60%, transparent);
  }

  .board-reply {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .board-approve svg {
    width: 14px;
    height: 14px;
  }

  .board-approve[aria-pressed='true'] {
    border-color: var(--dpk-green);
    background: var(--dpk-green-soft);
    color: color-mix(in srgb, var(--dpk-green) 70%, var(--dpk-ink));
  }

  .board-other[aria-pressed='true'] {
    border-color: color-mix(in srgb, var(--dpk-accent) 55%, var(--dpk-rule));
    background: var(--dpk-accent-soft);
    color: var(--dpk-accent-ink);
  }

  .board-answer {
    width: 100%;
    box-sizing: border-box;
    resize: vertical;
  }

  .board-answer[hidden] {
    display: none;
  }

  /* -------------------------------------------------------------- todos */

  .board-progress {
    height: 6px;
    border-radius: 999px;
    background: var(--dpk-rule);
    overflow: hidden;
  }

  .board-progress-fill {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: var(--dpk-green);
    transition: width 240ms var(--dpk-ease);
  }

  .board-todos {
    display: grid;
    margin: 0;
    padding: 0;
    list-style: none;
    border: 1px solid var(--dpk-rule);
    border-radius: var(--dpk-radius);
    background: var(--dpk-paper-raised);
    box-shadow: var(--dpk-shadow-xs);
    overflow: hidden;
  }

  .board-todo {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: start;
    gap: 10px;
    padding: 9px 12px;
    border-top: 1px solid var(--dpk-rule);
  }

  .board-todo:first-child {
    border-top: 0;
  }

  .board-todo[data-added='true'] {
    background: color-mix(in srgb, var(--dpk-accent) 5%, var(--dpk-paper-raised));
  }

  .board-todo[data-proposal='pending'] {
    background: color-mix(in srgb, var(--dpk-violet) 5%, var(--dpk-paper-raised));
  }

  .board-todo[data-proposal='decline'] {
    background: var(--dpk-paper-sunken);
  }

  .board-todo[data-proposal='decline'] .board-todo-text,
  .board-todo[data-proposal='decline'] .board-reason {
    color: var(--dpk-ink-faint);
  }

  .board-todo[data-proposal='decline'] .board-todo-text {
    text-decoration: line-through;
  }

  .board-todo-mark {
    width: 12px;
    height: 12px;
    margin-top: 4px;
    border: 2px solid var(--board-tone);
    border-radius: 50%;
    box-sizing: border-box;
  }

  .board-todo-mark[data-status='doing'] {
    background: linear-gradient(90deg, var(--board-tone) 50%, transparent 50%);
  }

  .board-todo-mark[data-status='done'],
  .board-todo-mark[data-status='blocked'] {
    background: var(--board-tone);
  }

  /* A proposal is not work yet: a question mark in place of the status. */
  .board-todo-mark--proposal {
    display: grid;
    place-items: center;
    width: 16px;
    height: 16px;
    margin: 2px -2px 0;
    border: 1.5px dashed var(--dpk-violet);
    background: var(--dpk-violet-soft);
    color: var(--dpk-violet);
    font-size: 10.5px;
    font-weight: 800;
    line-height: 1;
  }

  .board-todo[data-proposal='decline'] .board-todo-mark--proposal {
    border-color: var(--dpk-rule-strong);
    background: transparent;
    color: var(--dpk-ink-faint);
  }

  .board-todo-body {
    display: grid;
    gap: 4px;
    min-width: 0;
  }

  .board-todo-title {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px 6px;
    color: var(--dpk-ink);
    font-size: 13.5px;
    line-height: 1.5;
  }

  .board-todo[data-status='done'] .board-todo-text {
    color: var(--dpk-ink-faint);
    text-decoration: line-through;
    text-decoration-color: color-mix(in srgb, var(--dpk-ink-faint) 60%, transparent);
  }

  .board-todo-note,
  .board-reason {
    margin: 0;
    color: var(--dpk-ink-soft);
    font-size: 12px;
    line-height: 1.55;
  }

  .board-reason-label {
    margin-right: 6px;
    padding: 0 5px;
    border-radius: var(--dpk-radius-xs);
    background: var(--dpk-violet-soft);
    color: var(--dpk-violet);
    font-size: 10.5px;
    font-weight: 700;
  }

  .board-todo-controls {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    margin-top: 2px;
  }

  .board-todo-status {
    width: auto;
    min-width: 0;
    min-height: 26px;
    height: 26px;
    padding-top: 0;
    padding-bottom: 0;
    font-size: 12px;
  }

  .board-todo-status {
    border-color: color-mix(in srgb, var(--board-tone) 45%, var(--dpk-rule));
    background-color: var(--board-tone-soft);
    color: var(--dpk-ink);
    font-weight: 600;
  }

  /* The agent's own status: it reports it by rewriting the board. */
  .board-todo-state {
    display: inline-flex;
    align-items: center;
    height: 22px;
    padding: 0 8px;
    border-radius: 999px;
    background: var(--board-tone-soft);
    color: color-mix(in srgb, var(--board-tone) 75%, var(--dpk-ink));
    font-size: 11.5px;
    font-weight: 600;
    white-space: nowrap;
  }

  .board-todo-state[data-status='todo'] {
    color: var(--dpk-ink-soft);
  }

  .board-assignee {
    display: inline-flex;
    align-items: center;
    max-width: 140px;
    height: 22px;
    padding: 0 8px;
    border: 1px solid var(--dpk-rule);
    border-radius: 999px;
    color: var(--dpk-ink-soft);
    font-size: 11.5px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .board-assignee::before {
    content: '@';
    margin-right: 1px;
    color: var(--dpk-ink-faint);
  }

  .board-assignee[data-kind='human'] {
    border-color: color-mix(in srgb, var(--dpk-violet) 35%, var(--dpk-rule));
    background: var(--dpk-violet-soft);
    color: var(--dpk-violet);
    font-weight: 600;
  }

  .board-assignee[data-kind='human']::before {
    color: inherit;
  }

  /* ------------------------------------------------------ filter / done */

  .board-filter {
    display: inline-flex;
    justify-self: start;
    gap: 2px;
    padding: 2px;
    border: 1px solid var(--dpk-rule);
    border-radius: var(--dpk-radius-sm);
    background: var(--dpk-paper-sunken);
  }

  .board-filter-option {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 10px;
    border: 0;
    border-radius: var(--dpk-radius-xs);
    background: transparent;
    color: var(--dpk-ink-soft);
    font: inherit;
    font-size: 12px;
    cursor: pointer;
  }

  .board-filter-option:hover {
    color: var(--dpk-ink);
  }

  .board-filter-option:focus-visible {
    outline: none;
    box-shadow: var(--dpk-focus);
  }

  .board-filter-option[aria-pressed='true'] {
    background: var(--dpk-paper-raised);
    color: var(--dpk-ink);
    font-weight: 650;
    box-shadow: var(--dpk-bevel), var(--dpk-shadow-xs);
  }

  .board-filter-count {
    font-family: var(--dpk-mono);
    font-size: 10.5px;
    color: var(--dpk-violet);
  }

  .board-done {
    display: grid;
    gap: 6px;
  }

  .board-done-summary {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    justify-self: start;
    padding: 3px 8px 3px 4px;
    border-radius: var(--dpk-radius-xs);
    color: var(--dpk-ink-soft);
    font-size: 12px;
    font-weight: 600;
    list-style: none;
    cursor: pointer;
    user-select: none;
  }

  .board-done-summary::-webkit-details-marker {
    display: none;
  }

  .board-done-summary:hover {
    background: var(--dpk-paper-sunken);
    color: var(--dpk-ink);
  }

  .board-done-summary:focus-visible {
    outline: none;
    box-shadow: var(--dpk-focus);
  }

  .board-done-chevron {
    width: 6px;
    height: 6px;
    margin: 0 3px;
    border-right: 1.5px solid currentColor;
    border-bottom: 1.5px solid currentColor;
    transform: rotate(-45deg);
    transition: transform 160ms var(--dpk-ease);
  }

  .board-done[open] .board-done-chevron {
    transform: rotate(45deg);
  }

  .board-todo-controls .board-comment {
    margin-left: auto;
  }

  .board-decision {
    display: flex;
    gap: 6px;
  }

  .board-decide,
  .board-undo {
    min-height: 26px;
    height: 26px;
    padding: 0 10px;
    font-size: 12px;
  }

  .board-decide[data-decision='accept'] {
    border-color: color-mix(in srgb, var(--dpk-green) 50%, var(--dpk-rule));
    color: color-mix(in srgb, var(--dpk-green) 70%, var(--dpk-ink));
  }

  .board-decide[data-decision='accept']:hover {
    background: var(--dpk-green-soft);
  }

  .board-add-todo {
    display: grid;
    gap: 6px;
  }

  .board-add-row {
    display: flex;
    gap: 6px;
  }

  .board-add-assignee {
    flex: 1 1 auto;
    width: auto;
    min-width: 0;
  }

  .board-add-submit {
    flex: 0 0 auto;
  }

  /* ------------------------------------------------------------ outputs */

  .board-outputs {
    display: grid;
    margin: 0;
    padding: 0;
    list-style: none;
    border: 1px solid var(--dpk-rule);
    border-radius: var(--dpk-radius);
    background: var(--dpk-paper-raised);
    box-shadow: var(--dpk-shadow-xs);
    overflow: hidden;
  }

  .board-output {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 8px;
    padding: 6px 6px 6px 10px;
    border-top: 1px solid var(--dpk-rule);
  }

  .board-output:first-child {
    border-top: 0;
  }

  .board-output-body {
    display: grid;
    gap: 1px;
    min-width: 0;
  }

  .board-output-head {
    display: flex;
    align-items: baseline;
    gap: 6px;
    min-width: 0;
  }

  .board-kind {
    flex: 0 0 auto;
    padding: 0 5px;
    border-radius: var(--dpk-radius-xs);
    background: var(--dpk-paper-sunken);
    color: var(--dpk-ink-soft);
    font-family: var(--dpk-mono);
    font-size: 10px;
    font-weight: 700;
    line-height: 1.7;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .board-output-link,
  .board-output-label,
  .board-output-head .board-output-path {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--dpk-ink);
    font-size: 13px;
    font-weight: 600;
  }

  .board-output-link {
    text-decoration: none;
  }

  .board-output-link:hover {
    color: var(--dpk-blue);
    text-decoration: underline;
  }

  .board-output-link:focus-visible {
    outline: none;
    border-radius: var(--dpk-radius-xs);
    box-shadow: var(--dpk-focus);
  }

  .board-output-path {
    font-family: var(--dpk-mono);
    font-size: 12px;
  }

  .board-output-head .board-output-path {
    font-size: 12px;
  }

  .board-output-sub {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--dpk-ink-faint);
    font-family: var(--dpk-mono);
    font-size: 11px;
    font-weight: 400;
  }

  .board-output-text {
    margin: 2px 0 0;
    color: var(--dpk-ink-soft);
    font-size: 12px;
    line-height: 1.5;
  }

  .board-copy[data-copied='true'] {
    color: var(--dpk-green);
  }

  /* ---------------------------------------------------------------- log */

  .board-log {
    display: grid;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .board-log-entry {
    position: relative;
    display: grid;
    grid-template-columns: 28px minmax(0, 1fr);
    gap: 10px;
    padding-bottom: 14px;
  }

  /* The line that joins the exchanges into one conversation. */
  .board-log-entry::before {
    content: '';
    position: absolute;
    left: 13px;
    top: 30px;
    bottom: 0;
    width: 2px;
    background: var(--dpk-rule);
  }

  .board-log-entry:last-child::before {
    display: none;
  }

  .board-log-avatar {
    display: grid;
    place-items: center;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: var(--dpk-accent-soft);
    color: var(--dpk-accent-strong);
    font-size: 12px;
    font-weight: 700;
  }

  .board-log-entry[data-from='human'] .board-log-avatar {
    background: var(--dpk-violet-soft);
    color: var(--dpk-violet);
  }

  .board-log-body {
    min-width: 0;
    padding: 10px 14px 12px;
    border: 1px solid var(--dpk-rule);
    border-radius: var(--dpk-radius);
    background: var(--dpk-paper-raised);
  }

  .board-log-entry[data-from='human'] .board-log-body {
    background: color-mix(in srgb, var(--dpk-violet) 4%, var(--dpk-paper-raised));
    border-color: color-mix(in srgb, var(--dpk-violet) 22%, var(--dpk-rule));
  }

  .board-log-entry[data-latest='true'] .board-log-body {
    border-color: color-mix(in srgb, var(--dpk-accent) 45%, var(--dpk-rule));
    box-shadow:
      var(--dpk-shadow-sm),
      0 0 0 3px var(--dpk-accent-soft);
  }

  /* Where the task stands, on the newest entry only. */
  .board-log-now {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
    margin: -2px 0 10px;
    padding-bottom: 10px;
    border-bottom: 1px dashed var(--dpk-rule);
  }

  .board-section > .board-log-now {
    margin: 0;
    padding-bottom: 0;
    border-bottom: 0;
  }

  .board-log-head {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 24px;
  }

  .board-log-author {
    color: var(--dpk-ink);
    font-size: 12.5px;
    font-weight: 700;
  }

  .board-log-entry[data-from='human'] .board-log-author {
    color: var(--dpk-violet);
  }

  .board-log-at {
    color: var(--dpk-ink-faint);
    font-size: 11.5px;
    font-variant-numeric: tabular-nums;
  }

  .board-log-latest {
    padding: 1px 7px;
    border-radius: 999px;
    background: var(--dpk-accent-soft);
    color: var(--dpk-accent-strong);
    font-size: 10.5px;
    font-weight: 700;
  }

  .board-log-head .board-comment {
    margin-left: auto;
  }

  .board-log-title {
    margin: 4px 0 0;
    color: var(--dpk-ink);
    font-size: 14px;
    font-weight: 650;
    line-height: 1.5;
  }

  .board-log-text {
    margin: 4px 0 0;
    color: var(--dpk-ink);
    font-size: 13.5px;
    line-height: 1.65;
    white-space: pre-line;
  }

  .board-log-title + .board-log-text {
    color: var(--dpk-ink-soft);
    font-size: 13px;
  }

  .board-log-points {
    margin: 6px 0 0;
    padding-left: 18px;
    color: var(--dpk-ink-soft);
    font-size: 12.5px;
    line-height: 1.6;
  }

  @media (prefers-reduced-motion: reduce) {
    .board-status[data-status='working'] .board-status-dot {
      animation: none;
    }

    .board-progress-fill {
      transition: none;
    }

    .board-panel {
      animation: none;
    }
  }
`;
