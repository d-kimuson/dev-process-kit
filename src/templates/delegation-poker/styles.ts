import { css } from 'lit';

/**
 * Chrome of `<dpk-template-delegation-poker>`: the delegation board alone.
 *
 * A level carries one hue from blue (1, the delegator decides) to green (7,
 * fully delegated), set by `data-level` as `--lv`; the column heads, the cells
 * and the chips on them all read it.
 */
export const delegationPokerStyles = css`
  [data-level='1'] {
    --lv: var(--dpk-blue);
  }
  [data-level='2'] {
    --lv: color-mix(in oklab, var(--dpk-blue) 83%, var(--dpk-green));
  }
  [data-level='3'] {
    --lv: color-mix(in oklab, var(--dpk-blue) 67%, var(--dpk-green));
  }
  [data-level='4'] {
    --lv: color-mix(in oklab, var(--dpk-blue) 50%, var(--dpk-green));
  }
  [data-level='5'] {
    --lv: color-mix(in oklab, var(--dpk-blue) 33%, var(--dpk-green));
  }
  [data-level='6'] {
    --lv: color-mix(in oklab, var(--dpk-blue) 17%, var(--dpk-green));
  }
  [data-level='7'] {
    --lv: var(--dpk-green);
  }

  /* ---------------------------------------------------------- summary */

  .summary {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    font-size: 12px;
    color: var(--dpk-ink-soft);
  }

  .summary-chip {
    padding: 4px 10px;
    border: 1px solid var(--dpk-rule);
    border-radius: 999px;
    background: var(--dpk-paper-raised);
    box-shadow: var(--dpk-bevel), var(--dpk-shadow-xs);
    font-variant-numeric: tabular-nums;
  }

  /* ----------------------------------------------------------- status */

  .status {
    display: inline-block;
    padding: 2px 9px;
    border-radius: 999px;
    font-size: 11.5px;
    font-weight: 600;
    white-space: nowrap;
    background: var(--dpk-paper-sunken);
    color: var(--dpk-ink-soft);
  }

  .status[data-status='discuss'] {
    background: var(--dpk-amber-soft);
    color: var(--dpk-amber);
  }

  .status[data-status='consensus'] {
    background: var(--dpk-blue-soft);
    color: var(--dpk-blue);
  }

  .status[data-status='agreed'] {
    background: var(--dpk-green-soft);
    color: var(--dpk-green);
  }

  .locked {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    padding: 2px 8px;
    border: 1px solid var(--dpk-rule);
    border-radius: 999px;
    font-size: 11px;
    color: var(--dpk-ink-soft);
  }

  .locked::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 1px;
    background: currentColor;
  }

  .summary-chip[data-mode='strict'] {
    border-color: color-mix(in srgb, var(--dpk-amber) 45%, var(--dpk-rule));
    color: var(--dpk-amber);
  }

  /* ----------------------------------------------------------- confirm */

  .confirm-backdrop {
    position: fixed;
    inset: 0;
    z-index: 20;
    display: grid;
    place-items: center;
    padding: 16px;
    background: color-mix(in srgb, var(--dpk-ink) 28%, transparent);
    animation: dp-fade-in 140ms var(--dpk-ease);
  }

  .confirm {
    box-sizing: border-box;
    display: grid;
    gap: 12px;
    width: min(420px, 100%);
    padding: 20px;
    border: 1px solid var(--dpk-rule-strong);
    border-radius: var(--dpk-radius-lg);
    background: var(--dpk-paper-raised);
    box-shadow: var(--dpk-bevel), var(--dpk-shadow-lg);
    color: var(--dpk-ink);
  }

  .confirm h2 {
    margin: 0;
    font-size: 15px;
  }

  .confirm p {
    margin: 0;
    color: var(--dpk-ink-soft);
    font-size: 13px;
    line-height: 1.6;
  }

  .confirm-skip {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12.5px;
    color: var(--dpk-ink-soft);
    cursor: pointer;
  }

  .confirm-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }

  @keyframes dp-fade-in {
    from {
      opacity: 0;
    }
  }

  /* ------------------------------------------------------------- board */

  .board-panel {
    display: grid;
    gap: 12px;
    align-content: start;
  }

  .board-head {
    display: grid;
    gap: 4px;
  }

  .board-head h2 {
    margin: 0;
    font-size: 16px;
  }

  .board-hint {
    margin: 0;
    font-size: 12.5px;
    line-height: 1.6;
    color: var(--dpk-ink-soft);
  }

  .board-scroll {
    overflow-x: auto;
    border: 1px solid var(--dpk-rule);
    border-radius: var(--dpk-radius-lg);
    background: var(--dpk-paper-raised);
    box-shadow: var(--dpk-shadow-sm);
  }

  .board {
    display: grid;
    min-width: 980px;
  }

  .board-row {
    display: grid;
    grid-template-columns: minmax(220px, 2fr) repeat(7, minmax(84px, 1fr)) minmax(132px, 1fr);
    align-items: stretch;
    border-top: 1px solid var(--dpk-rule);
  }

  .board-row--head {
    border-top: 0;
    font-size: 11.5px;
    color: var(--dpk-ink-soft);
  }

  .board-row:not(.board-row--head):hover {
    background: color-mix(in srgb, var(--dpk-paper-sunken) 60%, transparent);
  }

  .board-row--head .cell-name,
  .board-row--head .cell-agree {
    align-content: end;
    font-weight: 600;
  }

  /* Decision area: its name, description, where it stands and its tools. */
  .cell-name {
    display: grid;
    align-content: center;
    gap: 4px;
    padding: 10px 12px;
    min-width: 0;
  }

  .row-title {
    display: flex;
    align-items: flex-start;
    gap: 6px;
  }

  .row-name {
    flex: 1;
    min-width: 0;
    font-size: 13.5px;
    font-weight: 600;
    line-height: 1.4;
  }

  .row-tools {
    display: flex;
    gap: 2px;
    opacity: 0;
    transition: opacity 120ms ease;
  }

  .board-row:hover .row-tools,
  .row-tools:focus-within {
    opacity: 1;
  }

  .row-description {
    margin: 0;
    font-size: 11.5px;
    line-height: 1.5;
    color: var(--dpk-ink-soft);
  }

  .row-meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: var(--dpk-ink-faint);
  }

  /* Level columns. */
  .cell {
    display: grid;
    border-left: 1px solid var(--dpk-rule);
    background: color-mix(in srgb, var(--lv) 5%, transparent);
  }

  .cell--head {
    align-content: end;
    justify-items: center;
    gap: 2px;
    padding: 10px 6px;
    background: color-mix(in srgb, var(--lv) 10%, transparent);
    text-align: center;
  }

  .cell--head b {
    font-size: 16px;
    line-height: 1;
    color: var(--lv);
  }

  .level-name {
    font-weight: 600;
    color: var(--dpk-ink);
  }

  .level-phrase {
    font-size: 10.5px;
    line-height: 1.45;
    color: var(--dpk-ink-faint);
  }

  .cell[data-agreed] {
    background: color-mix(in srgb, var(--lv) 26%, var(--dpk-paper-raised));
    box-shadow: inset 0 0 0 2px var(--lv);
  }

  /* The whole cell is the button that plays the reader's card at its level. */
  .cell-play {
    display: flex;
    flex-wrap: wrap;
    gap: 3px;
    align-content: center;
    justify-content: center;
    min-height: 56px;
    margin: 0;
    padding: 6px 4px;
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    cursor: pointer;
  }

  .cell-play:hover {
    background: color-mix(in srgb, var(--lv) 14%, transparent);
  }

  /* strict mode: the reader's card is final, so the row no longer takes clicks. */
  .cell-play[aria-disabled='true'] {
    cursor: default;
  }

  .cell-play[aria-disabled='true']:hover {
    background: transparent;
  }

  .cell-play:focus-visible {
    outline: none;
    box-shadow: inset var(--dpk-focus);
  }

  .chip {
    max-width: 100%;
    padding: 1px 7px;
    overflow: hidden;
    border-radius: 999px;
    background: var(--dpk-paper-raised);
    border: 1px solid color-mix(in srgb, var(--lv) 45%, var(--dpk-rule));
    font-size: 10.5px;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  /* A chip with a reason: hover it to read why. */
  .chip[data-reason] {
    text-decoration: underline dotted color-mix(in srgb, var(--dpk-ink-faint) 70%, transparent);
    text-underline-offset: 2px;
    cursor: help;
  }

  .chip[data-kind='you'] {
    border-color: var(--dpk-accent);
    background: var(--dpk-accent);
    color: var(--dpk-accent-ink);
    font-weight: 600;
  }

  /* The settled level. */
  .cell-agree {
    display: grid;
    align-content: center;
    padding: 8px 10px;
    border-left: 1px solid var(--dpk-rule);
  }

  .agree-select {
    width: 100%;
    min-width: 0;
    font-size: 12px;
  }

  .board-row[data-status='agreed'] .agree-select {
    border-color: color-mix(in srgb, var(--dpk-green) 55%, var(--dpk-rule));
  }

  .add-decision {
    justify-self: start;
    padding: 8px 14px;
    border: 1px dashed var(--dpk-rule-strong);
    border-radius: var(--dpk-radius);
    background: transparent;
    color: var(--dpk-ink-soft);
    font: inherit;
    cursor: pointer;
  }

  .add-decision:hover {
    border-color: var(--dpk-accent);
    color: var(--dpk-accent);
  }

  .add-decision:focus-visible {
    outline: none;
    box-shadow: var(--dpk-focus);
  }

  /* ------------------------------------------------------------- empty */

  .empty {
    display: grid;
    gap: 10px;
    max-width: 620px;
    padding: 28px 24px;
    border: 1px dashed var(--dpk-rule-strong);
    border-radius: var(--dpk-radius-lg);
    background: var(--dpk-dots), var(--dpk-paper-sunken);
  }

  .empty h2 {
    margin: 0;
  }

  .empty p {
    margin: 0;
    color: var(--dpk-ink-soft);
    line-height: 1.7;
  }

  .empty .dpk-btn {
    justify-self: start;
  }
`;
