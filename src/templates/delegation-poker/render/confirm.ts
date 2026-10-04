import { html, nothing, type TemplateResult } from 'lit';

import type { DelegationPokerMessages } from '../messages';
import type { DelegationLevel } from '../model';

import { onCheckedChange } from '../../../lib/dom/events';

/** A strict-mode card waiting for the reader to confirm it. */
export type PendingPlay = {
  readonly decisionId: string;
  readonly decisionName: string;
  readonly level: DelegationLevel;
  /** "Don't ask again" is ticked. */
  readonly skip: boolean;
};

export type ConfirmHandlers = {
  readonly toggleSkip: (skip: boolean) => void;
  readonly confirm: () => void;
  readonly cancel: () => void;
};

/**
 * The warning before a strict-mode card: once played it cannot be changed.
 * Modal over the board; Escape or the backdrop cancel.
 */
export const renderConfirm = (
  m: DelegationPokerMessages,
  pending: PendingPlay | null,
  handlers: ConfirmHandlers,
): TemplateResult | typeof nothing => {
  if (pending === null) return nothing;
  return html`<div class="confirm-backdrop" @click=${handlers.cancel}>
    <div
      class="confirm"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="dp-confirm-title"
      aria-describedby="dp-confirm-body"
      data-testid="confirm-play"
      @click=${(event: Event) => event.stopPropagation()}
      @keydown=${(event: KeyboardEvent) => {
        if (event.key === 'Escape') handlers.cancel();
      }}
    >
      <h2 id="dp-confirm-title">${m.confirmTitle}</h2>
      <p id="dp-confirm-body">${m.confirmBody(m.levelLabel(pending.level), pending.decisionName)}</p>
      <label class="confirm-skip">
        <input type="checkbox" .checked=${pending.skip} @change=${onCheckedChange(handlers.toggleSkip)} />
        ${m.confirmSkip}
      </label>
      <div class="confirm-actions">
        <button class="dpk-btn" type="button" data-testid="confirm-play-cancel" @click=${handlers.cancel}>
          ${m.confirmCancel}
        </button>
        <button
          class="dpk-btn dpk-btn--accent"
          type="button"
          data-testid="confirm-play-ok"
          data-level=${pending.level}
          @click=${handlers.confirm}
        >
          ${m.confirmPlay}
        </button>
      </div>
    </div>
  </div>`;
};
