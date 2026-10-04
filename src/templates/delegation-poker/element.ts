import { html } from 'lit';

import type { Locale } from '../../core/i18n';
import type { ShellRegions, TemplateRenderContext } from '../../core/shell/contracts';
import type { PokerHandlers } from './render/shared';

import { TemplateElement } from '../../core/element';
import { assertNever } from '../../core/schema';
import { createEntityId } from '../../core/target';
import { delegationPokerAction } from './actions';
import { skipConfirmPreference, type SkipConfirmPreference } from './confirm-preference';
import { delegationPokerDefinitionFor } from './definition';
import { delegationPokerMessages, type DelegationPokerMessages } from './messages';
import { parsePlayMode, playIntent } from './mode';
import { allDelegationPokerIds, type DelegationPokerState } from './model';
import { renderBoard, renderEmpty, renderSummary } from './render/board';
import { renderConfirm, type ConfirmHandlers, type PendingPlay } from './render/confirm';
import { delegationPokerStyles } from './styles';

type Context = TemplateRenderContext<DelegationPokerState>;

/**
 * `<dpk-template-delegation-poker>` — Delegation Poker (Management 3.0).
 *
 * The board is a pure renderer of the context. The element only keeps what
 * `mode="strict"` needs on top: the card waiting for confirmation, and whether
 * the reader asked not to be warned again.
 */
export class DpkTemplateDelegationPoker extends TemplateElement<DelegationPokerState> {
  static override styles = [TemplateElement.styles, delegationPokerStyles];

  static override properties = {
    mode: { type: String },
    pending: { state: true },
    skipConfirm: { state: true },
  };

  /** `mode="strict"` makes a played card final; anything else is `lax`. */
  declare mode: string | null;
  declare private pending: PendingPlay | null;
  declare private skipConfirm: boolean;

  #preference: SkipConfirmPreference | null = null;
  /** Set when the dialog opens or closes, consumed by the next `updated()`. */
  #focus: 'dialog' | { readonly decisionId: string; readonly level: number } | null = null;

  constructor() {
    super();
    this.mode = null;
    this.pending = null;
    this.skipConfirm = false;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#preference = skipConfirmPreference(this.storage !== 'off' && this.storage !== 'memory');
    this.skipConfirm = this.#preference.read();
  }

  protected override definitionFor(locale: Locale) {
    return delegationPokerDefinitionFor(locale);
  }

  protected override renderRegions(context: Context): ShellRegions {
    const m = delegationPokerMessages(this.locale);
    const handlers = this.#handlers(context, m);
    const props = { context, handlers, m, mode: parsePlayMode(this.mode) };
    const body = context.state.decisions.length === 0 ? renderEmpty(props) : renderBoard(props);
    return {
      header: renderSummary(props),
      main: html`${body}${renderConfirm(m, this.pending, this.#confirmHandlers(context))}`,
    };
  }

  protected override updated(): void {
    super.updated();
    const focus = this.#focus;
    if (focus === null) return;
    this.#focus = null;
    if (focus === 'dialog') {
      this.renderRoot.querySelector<HTMLButtonElement>('[data-testid="confirm-play-ok"]')?.focus();
      return;
    }
    this.renderRoot
      .querySelector<HTMLButtonElement>(`[data-decision="${focus.decisionId}"] .cell-play[data-level="${focus.level}"]`)
      ?.focus();
  }

  #handlers(context: Context, m: DelegationPokerMessages): PokerHandlers {
    return {
      play: (decisionId, level) => {
        const decision = context.state.decisions.find((candidate) => candidate.id === decisionId);
        if (decision === undefined) return;
        const intent = playIntent(parsePlayMode(this.mode), decision, this.skipConfirm);
        switch (intent.kind) {
          case 'play':
            context.dispatch(delegationPokerAction.playCard(decisionId, level));
            return;
          case 'confirm':
            this.pending = { decisionId, decisionName: decision.name, level, skip: false };
            this.#focus = 'dialog';
            return;
          case 'locked':
            return;
          default:
            assertNever(intent);
        }
      },
      agree: (decisionId, level) => {
        context.dispatch(delegationPokerAction.agreeLevel(decisionId, level));
      },
      addDecision: () => {
        const id = createEntityId('decision', allDelegationPokerIds(context.state));
        context.dispatch(delegationPokerAction.addDecision(id, m.newDecision));
      },
      rename: (decisionId, name) => {
        context.dispatch(delegationPokerAction.setDecisionName(decisionId, name));
      },
      deleteDecision: (decisionId) => {
        context.dispatch(delegationPokerAction.deleteDecision(decisionId));
      },
      comment: (target) => this.requestComment(target),
    };
  }

  #confirmHandlers(context: Context): ConfirmHandlers {
    const close = (pending: PendingPlay): void => {
      this.pending = null;
      this.#focus = { decisionId: pending.decisionId, level: pending.level };
    };
    return {
      toggleSkip: (skip) => {
        if (this.pending !== null) this.pending = { ...this.pending, skip };
      },
      confirm: () => {
        const pending = this.pending;
        if (pending === null) return;
        if (pending.skip) {
          this.#preference?.remember();
          this.skipConfirm = true;
        }
        context.dispatch(delegationPokerAction.playCard(pending.decisionId, pending.level));
        close(pending);
      },
      cancel: () => {
        if (this.pending !== null) close(this.pending);
      },
    };
  }
}

export const defineDelegationPokerElement = (): void => {
  if (!customElements.get('dpk-template-delegation-poker'))
    customElements.define('dpk-template-delegation-poker', DpkTemplateDelegationPoker);
};
