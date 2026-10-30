import { css } from 'lit';

/**
 * One colour per state, shared by the status pill, the todo marks and the
 * board's columns: blue is moving, amber is waiting on the reader, red is
 * stuck, green is done, grey has not started.
 *
 * The page is `rail | main`. The main area is the design docs, the questions
 * and the work — the task board — one tab at a time, and scrolls on its own;
 * the shell's sidebar becomes a left-hand rail holding the outputs, so what the
 * agent has produced stays in view. It sits on the left because the review
 * floats over the page's right-hand edge: a rail there would be covered by it.
 * On a phone the outputs fold into a drawer over the board and the page scrolls
 * as one.
 */
export const taskBoardStyles = css`
  /* The shell's sidebar is a left-hand rail (see \`sidebarLayout\`), a drawer on a phone. */
  :host {
    --dpk-sidebar-padding: 12px 16px;
    --dpk-sidebar-padding-end: 20px;
  }

  .board-rail {
    display: grid;
    gap: 14px;
  }

  .board {
    display: grid;
    gap: 18px;
    max-width: 1100px;
    width: 100%;
    margin: 0 auto;
  }

  /* A tab that reads keeps a comfortable measure; the task board takes the whole column. */
  .board-panel > .board-designs,
  .board-panel > .board-section,
  .board-panel > .board-empty {
    max-width: 880px;
  }

  /* Stacked, the column is what ends the page: it clears the hand-off dock. */
  @media (max-width: 760px) {
    .dpk-main-body {
      padding-bottom: 24px;
    }
  }

  [data-status='working'],
  [data-status='doing'] {
    --board-tone: var(--dpk-blue);
    --board-tone-soft: var(--dpk-blue-soft);
    --tone: var(--dpk-blue);
    --tone-soft: var(--dpk-blue-soft);
  }

  [data-status='waiting'] {
    --board-tone: var(--dpk-amber);
    --board-tone-soft: var(--dpk-amber-soft);
    --tone: var(--dpk-amber);
    --tone-soft: var(--dpk-amber-soft);
  }

  [data-status='blocked'] {
    --board-tone: var(--dpk-danger);
    --board-tone-soft: var(--dpk-danger-soft);
    --tone: var(--dpk-danger);
    --tone-soft: var(--dpk-danger-soft);
  }

  [data-status='done'] {
    --board-tone: var(--dpk-green);
    --board-tone-soft: var(--dpk-green-soft);
    --tone: var(--dpk-green);
    --tone-soft: var(--dpk-green-soft);
  }

  [data-status='todo'] {
    --board-tone: var(--dpk-rule-strong);
    --board-tone-soft: var(--dpk-paper-sunken);
    --tone: var(--dpk-rule-strong);
    --tone-soft: var(--dpk-paper-sunken);
  }

  /* ------------------------------------------------------------- status */

  .board-status {
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--tone) 28%, transparent);
  }

  /* On a phone the header has no room; the Context tab says the same. */
  @media (max-width: 720px) {
    .board-status--header {
      display: none;
    }
  }

  .board-status[data-status='working']::before {
    animation: board-pulse 1.8s var(--dpk-ease) infinite;
  }

  @keyframes board-pulse {
    50% {
      box-shadow: 0 0 0 6px color-mix(in srgb, var(--tone) 0%, transparent);
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

  @media (max-width: 400px) {
    .board-tabs [role='tab'] {
      gap: 5px;
      padding-inline: 6px;
    }
  }

  /* Too narrow for every label whole, a label gives way before its count does. */
  .board-tab-label {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .board-tab-count {
    flex: none;
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

  /* ------------------------------------------------------------ designs */

  .board-designs {
    display: grid;
    gap: 14px;
    min-width: 0;
  }

  .board-design-layout {
    display: grid;
    grid-template-columns: 220px minmax(0, 1fr);
    gap: 14px;
    align-items: start;
    min-width: 0;
  }

  @media (max-width: 760px) {
    .board-design-layout {
      grid-template-columns: minmax(0, 1fr);
    }
  }

  .board-design-index {
    min-width: 0;
  }

  .board-design-index-list {
    display: grid;
    gap: 2px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .board-design-index-item {
    display: flex;
    align-items: baseline;
    gap: 8px;
    width: 100%;
    padding: 8px 10px;
    border: 1px solid transparent;
    border-radius: var(--dpk-radius-sm);
    background: transparent;
    color: var(--dpk-ink-soft);
    font: inherit;
    font-size: 13px;
    line-height: 1.5;
    text-align: start;
    cursor: pointer;
  }

  .board-design-index-item:hover {
    background: var(--dpk-paper-sunken);
    color: var(--dpk-ink);
  }

  .board-design-index-item:focus-visible {
    outline: none;
    box-shadow: var(--dpk-focus);
  }

  .board-design-index-item[aria-current='true'] {
    border-color: var(--dpk-rule);
    background: var(--dpk-paper-raised);
    color: var(--dpk-ink);
    font-weight: 650;
    box-shadow: var(--dpk-bevel), var(--dpk-shadow-xs);
  }

  .board-design-index-title {
    flex: 1 1 auto;
    min-width: 0;
    overflow-wrap: anywhere;
  }

  .board-design-index-count {
    flex: 0 0 auto;
    color: var(--dpk-ink-faint);
    font-family: var(--dpk-mono);
    font-size: 10.5px;
  }

  .board-design-detail {
    min-width: 0;
  }

  /*
   * A doc is the kit's card (the card atom), roomier for prose. Its title names
   * it, so no edge is colored to tell it apart (a stripe along any edge says
   * nothing the head does not; dev-docs/guidelines/coding.md).
   */
  .board-design {
    --dpk-card-gap: 10px;
    padding: 16px 18px;
  }

  .board-design-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
  }

  .board-design-title {
    margin: 0;
    color: var(--dpk-ink);
    font-size: 15px;
    font-weight: 700;
    line-height: 1.45;
  }

  .board-design-head .board-comment {
    flex: 0 0 auto;
  }

  .board-design-body {
    color: var(--dpk-ink);
    font-size: 14px;
    line-height: 1.7;
  }

  /* The prose atom is for a page; inside a card its headings come down a size. */
  .board-design-body :where(h1, h2, h3, h4) {
    margin-top: 1.1em;
    color: var(--dpk-ink);
    font-size: 13.5px;
    font-weight: 700;
    letter-spacing: 0;
    text-transform: none;
  }

  .board-design-tasks {
    display: grid;
    gap: 6px;
    padding-top: 10px;
    border-top: 1px dashed var(--dpk-rule);
  }

  .board-design-tasks-title {
    margin: 0;
    color: var(--dpk-ink-soft);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .board-design-task-list {
    display: grid;
    gap: 2px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .board-design-task {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    padding: 3px 0;
  }

  .board-design-task .board-todo-state {
    flex: 0 0 auto;
  }

  .board-design-task-title {
    min-width: 0;
    color: var(--dpk-ink);
    font-size: 13px;
    line-height: 1.5;
  }

  .board-design-task[data-proposal='decline'] .board-design-task-title {
    color: var(--dpk-ink-faint);
    text-decoration: line-through;
  }

  .board-design-empty {
    margin: 0;
    color: var(--dpk-ink-faint);
    font-size: 12px;
  }

  .board-design-figures {
    display: grid;
    gap: 14px;
    min-width: 0;
  }

  .board-design-figures ::slotted(*) {
    min-width: 0;
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
    display: block;
    max-width: none;
    margin: 0;
    padding: 12px 14px;
    border-radius: var(--dpk-radius);
    background: transparent;
    font-size: 13px;
    line-height: 1.5;
    text-align: start;
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

  .board-tag[data-tone='design'] {
    overflow: hidden;
    background: var(--dpk-paper-sunken);
    color: var(--dpk-ink-soft);
    font-weight: 550;
    text-overflow: ellipsis;
  }

  /* The doc a card belongs to sits on its own line: the title keeps the width. */
  .board-card-design {
    display: flex;
    min-width: 0;
  }

  .board-card-design .board-tag {
    max-width: 100%;
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

  /* A question is the kit's card (the card atom) in its group's tone: green once replied to. */
  .board-question {
    --dpk-card-tone: var(--board-group-tone);
    --dpk-card-gap: 10px;
    padding: 14px 16px;
  }

  .board-question[data-resolved='true'] {
    --dpk-card-tone: var(--dpk-green);
  }

  .board-question-head {
    gap: 10px;
  }

  .board-question-title {
    margin: 0;
    font-size: 14px;
    font-weight: 650;
    line-height: 1.5;
  }

  .board-question-text {
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

  /* -------------------------------------------------------------- tasks */

  .board-tasks {
    display: grid;
    gap: 12px;
    min-width: 0;
  }

  .board-tasks-bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 16px;
  }

  .board-tasks-progress {
    display: grid;
    flex: 1 1 240px;
    gap: 4px;
    min-width: 0;
  }

  .board-tasks-progress-label {
    color: var(--dpk-ink-soft);
    font-size: 12.5px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }

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

  /*
   * The board itself, drawn the way \`dpk-board-kanban\` draws one: lanes side by
   * side in reading order, taking an equal share of the column and scrolling
   * sideways on their own — never the page — once they no longer fit.
   */
  .board-kanban {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    max-width: 100%;
    padding-bottom: 4px;
    overflow-x: auto;
    overscroll-behavior-x: contain;
  }

  .board-lane {
    display: flex;
    flex: 1 1 232px;
    flex-direction: column;
    gap: 8px;
    min-width: 232px;
    max-width: 340px;
    padding: 10px;
    border: 1px solid var(--dpk-rule);
    border-radius: var(--dpk-radius-lg);
    background: var(--dpk-paper-sunken);
    box-shadow: inset 0 1px 3px var(--dpk-shade-1);
  }

  /* The lane's own tone, from the shared \`data-tone\` map; grey has no entry there. */
  .board-lane[data-tone='gray'] {
    --tone: var(--dpk-ink-soft);
    --tone-soft: var(--dpk-paper-raised);
  }

  /* Blocked reads red: the shared map names that tone \`danger\`, and the lane spells it \`red\`. */
  .board-lane[data-tone='red'] {
    --tone: var(--dpk-danger);
    --tone-soft: var(--dpk-danger-soft);
  }

  .board-lane-head {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 2px;
  }

  .board-lane-title {
    margin: 0;
    padding: 2px 9px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--tone, var(--dpk-ink-soft)) 14%, transparent);
    color: var(--tone, var(--dpk-ink-soft));
    font-size: 12px;
    font-weight: 650;
    letter-spacing: 0.01em;
    white-space: nowrap;
  }

  .board-lane-count {
    flex: none;
    margin-left: auto;
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

  .board-cards {
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-height: 44px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .board-card-slot {
    min-width: 0;
  }

  /* A todo is the kit's card (the card atom), tighter for a lane. */
  .board-card {
    --dpk-card-gap: 6px;
    padding: 10px 11px;
    overflow-wrap: anywhere;
  }

  /* Only a todo a person has can be dragged: its status is the reader's to set. */
  .board-card[draggable='true'] {
    cursor: grab;
  }

  .board-card[data-added='true'] {
    background: color-mix(in srgb, var(--dpk-accent) 6%, var(--dpk-paper-raised));
  }

  .board-card[data-proposal='pending'] {
    --dpk-card-tone: var(--dpk-violet);
  }

  .board-card[data-proposal='decline'] {
    background: var(--dpk-paper-sunken);
  }

  .board-card[data-proposal='decline'] .board-card-title,
  .board-card[data-proposal='decline'] .board-reason {
    color: var(--dpk-ink-faint);
  }

  .board-card[data-proposal='decline'] .board-card-title {
    text-decoration: line-through;
  }

  .board-card[data-status='done'] .board-card-title {
    color: var(--dpk-ink-faint);
    text-decoration: line-through;
    text-decoration-color: color-mix(in srgb, var(--dpk-ink-faint) 60%, transparent);
  }

  .board-card-head {
    display: flex;
    align-items: flex-start;
    gap: 6px;
  }

  .board-card-title {
    flex: 1 1 auto;
    min-width: 0;
    font-size: 13px;
    line-height: 1.5;
  }

  .board-card-tags {
    display: flex;
    flex: 0 0 auto;
    flex-wrap: wrap;
    gap: 4px;
  }

  /* A proposal is not work yet: a question mark beside its title. */
  .board-card-mark {
    flex: none;
    display: grid;
    place-items: center;
    width: 16px;
    height: 16px;
    margin-top: 1px;
    border: 1.5px dashed var(--dpk-violet);
    border-radius: 50%;
    background: var(--dpk-violet-soft);
    color: var(--dpk-violet);
    font-size: 10.5px;
    font-weight: 800;
    line-height: 1;
  }

  .board-card-mark[data-proposal='decline'] {
    border-color: var(--dpk-rule-strong);
    background: transparent;
    color: var(--dpk-ink-faint);
  }

  .board-card-note,
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

  .board-card-controls {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
  }

  .board-card-controls .board-comment {
    margin-left: auto;
  }

  /* A lane with nothing in it keeps its place, so the board's shape still says where the work is. */
  .board-lane-empty {
    margin: 0;
    padding: 10px 8px;
    border: 1px dashed var(--dpk-rule-strong);
    border-radius: var(--dpk-radius-sm);
    color: var(--dpk-ink-faint);
    font-size: 11.5px;
    text-align: center;
  }

  /* ------------------------------------------------------ status / filter */

  .board-todo-status {
    width: auto;
    min-width: 0;
    min-height: 26px;
    height: 26px;
    padding-top: 0;
    padding-bottom: 0;
    font-size: 12px;
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

  .board-filter {
    display: inline-flex;
    gap: 2px;
    padding: 2px;
    border: 1px solid var(--dpk-rule);
    border-radius: var(--dpk-radius-sm);
    background: var(--dpk-paper-sunken);
  }

  .board-tasks-bar .board-filter {
    margin-left: auto;
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

  /* A phone shows one lane and a hint of the next: the board still scrolls sideways, never the page. */
  @media (max-width: 640px) {
    .board-lane {
      flex-basis: 208px;
      min-width: 208px;
    }
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
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 8px;
    padding: 6px 6px 6px 10px;
    border-radius: 0;
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

  @media (prefers-reduced-motion: reduce) {
    .board-status[data-status='working']::before {
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
