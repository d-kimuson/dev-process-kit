import { html, nothing, type TemplateResult } from 'lit';
import { repeat } from 'lit/directives/repeat.js';

import type { TemplateRenderContext } from '../../../core/shell/contracts';
import type { DelegationPokerMessages } from '../messages';
import type { PlayMode } from '../mode';

import { iconTrash } from '../../../core/icons';
import { onCommit, onSelectChange } from '../../../lib/dom/events';
import { DELEGATION_LEVELS, type DelegationPokerState } from '../model';
import { delegationParties, presentBoard, type BoardCell, type BoardLevel, type BoardRow } from '../present';
import { commentButton, type PokerHandlers } from './shared';

export type BoardProps = {
  readonly context: TemplateRenderContext<DelegationPokerState>;
  readonly handlers: PokerHandlers;
  readonly m: DelegationPokerMessages;
  readonly mode: PlayMode;
};

/** Who hands authority to whom, and how far the game has come. */
export const renderSummary = (props: BoardProps): TemplateResult => {
  const { context, m, mode } = props;
  const { progress } = presentBoard(m, context.state, mode);
  const { delegator, delegate } = delegationParties(m, context.state);
  return html`<div class="summary">
    <span class="summary-chip" title=${m.partiesLabel}>${delegator} → ${delegate}</span>
    <span class="summary-chip" data-testid="mode" data-mode=${mode} title=${m.modeTitle(mode)}
      >${m.modeLabel(mode)}</span
    >
    <span class="summary-chip" data-testid="progress"
      >${m.progress(progress.played, progress.agreed, progress.total)}</span
    >
  </div>`;
};

export const renderEmpty = (props: BoardProps): TemplateResult => {
  const { handlers, m } = props;
  return html`<div class="empty">
    <h2>${m.noDecisionsTitle}</h2>
    <p>${m.noDecisionsBody}</p>
    <button class="dpk-btn dpk-btn--accent" type="button" data-testid="add-decision" @click=${handlers.addDecision}>
      ${m.firstDecision}
    </button>
  </div>`;
};

/**
 * The delegation board is the whole game: decision areas down the side, the
 * seven levels across. Clicking a cell plays the reader's card there, which
 * turns that row's other cards face up; the last column settles the level.
 */
export const renderBoard = (props: BoardProps): TemplateResult => {
  const { context, handlers, m, mode } = props;
  const board = presentBoard(m, context.state, mode);
  return html`<section class="board-panel" aria-labelledby="dp-board-title">
    <header class="board-head">
      <h2 id="dp-board-title">${m.board}</h2>
      <p class="board-hint">${m.boardHint(mode)}</p>
    </header>
    <div class="board" role="table" aria-labelledby="dp-board-title" data-testid="board">
      <div class="board-head-scroll" role="rowgroup">
        <div class="board-row board-row--head" role="row">
          <span class="cell-name" role="columnheader">${m.decisionColumn}</span>
          ${board.levels.map(renderLevelHead)}
          <span class="cell-agree" role="columnheader">${m.agreeColumn}</span>
        </div>
      </div>
      <div class="board-scroll" role="rowgroup" @scroll=${followBoardScroll}>
        ${repeat(
          board.rows,
          (row) => row.id,
          (row) => renderRow(props, board.levels, row),
        )}
      </div>
    </div>
    <button class="add-decision" type="button" data-testid="add-decision" @click=${handlers.addDecision}>
      ${m.addDecision}
    </button>
  </section>`;
};

/**
 * The level heads stay at the top of the main column while the decisions
 * scroll by, so they live outside the board's sideways scroller (which would
 * otherwise be what they stick to) and follow it across instead.
 */
const followBoardScroll = (event: Event): void => {
  const scroller = event.currentTarget;
  if (!(scroller instanceof HTMLElement)) return;
  const head = scroller.previousElementSibling;
  if (head instanceof HTMLElement) head.scrollLeft = scroller.scrollLeft;
};

const renderLevelHead = (level: BoardLevel): TemplateResult => html`<span
  class="cell cell--head"
  role="columnheader"
  data-level=${level.level}
>
  <b>${level.level}</b>
  <span class="level-name">${level.name}</span>
  <small class="level-phrase">${level.phrase}</small>
</span>`;

const renderRow = (props: BoardProps, levels: readonly BoardLevel[], row: BoardRow): TemplateResult => {
  const { context, handlers, m } = props;
  const target = `decision:${row.id}`;
  return html`<div
    class="board-row"
    role="row"
    data-decision=${row.id}
    data-status=${row.status}
    ?data-locked=${row.locked}
  >
    <div class="cell-name" role="rowheader">
      <div class="row-title">
        <dpk-component-inline-edit
          class="row-name"
          .value=${row.name}
          .label=${m.decisionNameLabel}
          @dpk-commit=${onCommit((value) => handlers.rename(row.id, value))}
        ></dpk-component-inline-edit>
        <span class="row-tools">
          ${commentButton(target, m.commentButton, context.commentCount(target), handlers)}
          <button
            class="dpk-icon-btn"
            type="button"
            data-testid="delete-decision"
            aria-label=${m.deleteButton}
            title=${m.deleteButton}
            @click=${() => handlers.deleteDecision(row.id)}
          >
            ${iconTrash()}
          </button>
        </span>
      </div>
      ${row.description === undefined ? nothing : html`<p class="row-description">${row.description}</p>`}
      <div class="row-meta">
        <span class="status" data-status=${row.status}>${m.statusLabel(row.status)}</span>
        ${row.locked ? html`<span class="locked" data-testid="locked">${m.locked}</span>` : nothing}
        ${row.hidden > 0 ? html`<small>${m.hiddenCards(row.hidden)}</small>` : nothing}
      </div>
    </div>
    ${row.cells.map((cell) => renderCell(props, row, levels, cell))}
    <div class="cell-agree" role="cell">${renderAgree(props, levels, row)}</div>
  </div>`;
};

const renderCell = (
  props: BoardProps,
  row: BoardRow,
  levels: readonly BoardLevel[],
  cell: BoardCell,
): TemplateResult => {
  const { handlers, m } = props;
  const label = levels.find((level) => level.level === cell.level)?.label ?? String(cell.level);
  return html`<div class="cell" role="cell" data-level=${cell.level} ?data-agreed=${cell.agreed}>
    <button
      class="cell-play"
      type="button"
      data-level=${cell.level}
      aria-pressed=${cell.yours ? 'true' : 'false'}
      aria-disabled=${row.locked ? 'true' : nothing}
      aria-label=${m.playAt(label, row.name)}
      @click=${() => handlers.play(row.id, cell.level)}
    >
      ${cell.chips.map(
        (chip) =>
          html`<span
            class="chip"
            data-kind=${chip.kind}
            ?data-reason=${chip.reason !== undefined}
            title=${chip.reason ?? nothing}
            >${chip.label}</span
          >`,
      )}
    </button>
  </div>`;
};

const renderAgree = (props: BoardProps, levels: readonly BoardLevel[], row: BoardRow): TemplateResult => {
  const { handlers, m } = props;
  return html`<select
    class="dpk-select agree-select"
    data-testid="agree"
    aria-label=${m.agreeLabel(row.name)}
    @change=${onSelectChange((value) => {
      const level = DELEGATION_LEVELS.find((candidate) => String(candidate) === value);
      if (level !== undefined && level !== row.agreed) handlers.agree(row.id, level);
    })}
  >
    ${row.agreed === undefined ? html`<option value="" disabled selected>${m.notAgreed}</option>` : nothing}
    ${levels.map(
      (level) => html`<option value=${level.level} ?selected=${level.level === row.agreed}>${level.label}</option>`,
    )}
  </select>`;
};
