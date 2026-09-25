import { html, nothing, type TemplateResult } from 'lit';

import type { Locale } from '../../core/i18n';
import type { ShellRegions, TemplateRenderContext } from '../../core/shell/contracts';
import type { ActionTarget } from '../../core/types';
import type { GrillState } from './model';

import { handoffFailureLabel } from '../../core/claude-handoff';
import { TemplateElement } from '../../core/element';
import { copyText } from '../../lib/dom/clipboard';
import { revealWithin } from '../../lib/dom/scroll';
import { answerQuestion, type AnswerInput } from './actions';
import { grillDefinitionFor } from './definition';
import { grillMessages, type GrillMessages } from './messages';
import {
  presentGrillHeader,
  presentGrillPanel,
  presentPastRound,
  presentRoundChoices,
  nextOpenQuestion,
  resolveRound,
  type CopyStatus,
  type GrillRoundChoice,
  type GrillRoundSelection,
  type SendStatus,
} from './present';
import { GRILL_QUESTIONS_ATTRIBUTE, collectLabelBindings, positionLabels, type LabelBinding } from './render/labels';
import { renderPastRound, renderQuestionPanel } from './render/panel';
import { grillStyles } from './styles';

/**
 * `<dpk-template-grill>` — a review of questions over whatever the author puts in
 * `slot="main"`.
 *
 * The template owns the question list (sidebar), the Q badges over the main area,
 * and the answers as draft actions: the review rail, the hand-off and the
 * persistence are the core's. The main area itself is free — a diagram
 * component, a table, prose, anything with `data-grill-questions` on the parts a
 * question is about.
 */
export class DpkTemplateGrill extends TemplateElement<GrillState> {
  static override styles = [TemplateElement.styles, grillStyles];

  protected override definitionFor(locale: Locale) {
    return grillDefinitionFor(locale);
  }

  static override properties = {
    tab: { state: true },
    folded: { state: true },
    round: { state: true },
  };

  declare private tab: 'questions' | 'review';
  declare private folded: boolean;
  /** Which questions the questions tab shows; earlier rounds are only looked at, never answered. */
  declare private round: GrillRoundSelection;

  #bindings: readonly LabelBinding[] = [];
  #positionPending = false;
  #scrolledQuestion: string | null = null;
  #focusFree: string | null = null;
  #observer: MutationObserver | null = null;
  #copyStatus: CopyStatus = 'idle';
  #flashTimer: ReturnType<typeof setTimeout> | null = null;
  #sendStatus: SendStatus = { kind: 'idle' };

  constructor() {
    super();
    this.tab = 'questions';
    this.folded = false;
    this.round = 'current';
  }

  override connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener('scroll', this.#schedulePosition, true);
    window.addEventListener('resize', this.#schedulePosition);
    // A diagram pans and zooms without scrolling, so its badges follow its view.
    this.addEventListener('dpk-diagram-view', this.#schedulePosition);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener('scroll', this.#schedulePosition, true);
    window.removeEventListener('resize', this.#schedulePosition);
    this.removeEventListener('dpk-diagram-view', this.#schedulePosition);
    this.#observer?.disconnect();
    this.#observer = null;
    this.#clearFlash();
  }

  protected override renderRegions(context: TemplateRenderContext<GrillState>): ShellRegions {
    // Badges are derived from the DOM (the author's markup, and the shadow roots
    // a diagram component renders into), so they are collected as part of the
    // render that draws them — never as a follow-up update.
    this.#bindings = collectLabelBindings(this, context.state, context.navigation);
    return {
      header: this.#renderHeaderControl(context),
      main: this.#renderStage(context, this.#bindings),
      sidebar: this.#renderSidebar(context),
      sidebarHidden: this.folded,
    };
  }

  protected override updated(): void {
    super.updated();
    this.#observeScopes();
    this.#schedulePosition();
    this.#revealOpenQuestion();
    const focus = this.#focusFree;
    if (focus !== null) {
      this.#focusFree = null;
      this.renderRoot.querySelector<HTMLTextAreaElement>(`[data-free-text="${focus}"]`)?.focus();
    }
  }

  protected override get integratedReview(): boolean {
    return true;
  }

  override requestComment(target: string | ActionTarget): void {
    this.tab = 'review';
    this.folded = false;
    super.requestComment(target);
  }

  #openQuestion(context: TemplateRenderContext<GrillState>, questionId: string): void {
    this.tab = 'questions';
    this.folded = false;
    this.round = 'current';
    this.#scrolledQuestion = null;
    context.navigate({ question: questionId });
  }

  // ------------------------------------------------------------------ chrome

  /**
   * Folding gives the integrated question/review column's width back to the main area.
   */
  #renderHeaderControl(context: TemplateRenderContext<GrillState>): TemplateResult {
    const m = grillMessages(this.locale);
    const header = presentGrillHeader(m, context.state);
    const label = m.toggleLabel(this.folded ? m.openPanel : m.closePanel, header.progress);
    return html`
      <button
        type="button"
        class="grill-toggle"
        aria-expanded=${this.folded ? 'false' : 'true'}
        aria-label=${label}
        title=${label}
        @click=${() => (this.folded = !this.folded)}
      >
        <span class="grill-toggle-glyph" aria-hidden="true">?</span>
        <span class="grill-toggle-badge" aria-hidden="true">${header.answered} / ${header.total}</span>
      </button>
    `;
  }

  #renderSidebar(context: TemplateRenderContext<GrillState>): TemplateResult {
    const m = grillMessages(this.locale);
    const round = resolveRound(context.state, this.round);
    const rounds = presentRoundChoices(m, context.state, round);
    const past = round === 'current' ? null : presentPastRound(m, context.state, round);
    return html`
      <div class="grill-panel">
        <div class="grill-tabs" role="tablist" aria-label=${m.tabs}>
          ${(['questions', 'review'] as const).map((tab) =>
            tab === 'questions' && rounds.length > 0
              ? this.#renderRoundTab(m, rounds)
              : html`
                  <button
                    type="button"
                    role="tab"
                    id=${`grill-tab-${tab}`}
                    data-tab=${tab}
                    aria-controls=${`grill-panel-${tab}`}
                    aria-selected=${String(this.tab === tab)}
                    tabindex=${this.tab === tab ? 0 : -1}
                    @click=${() => (this.tab = tab)}
                    @keydown=${(event: KeyboardEvent) => this.#tabKey(event)}
                  >
                    ${tab === 'questions' ? m.questionsTab : m.reviewTab}<span class="grill-count"
                      >${tab === 'questions' ? context.state.questions.length : context.actions.length}</span
                    >
                  </button>
                `,
          )}
        </div>
        <div
          class="grill-tab-panel"
          id="grill-panel-questions"
          role="tabpanel"
          aria-labelledby="grill-tab-questions"
          ?hidden=${this.tab !== 'questions'}
        >
          ${
            past === null
              ? renderQuestionPanel(m, presentGrillPanel(context.state, context.navigation), {
                  open: (questionId) => this.#openQuestion(context, questionId),
                  answer: (questionId, answer) => this.#answer(questionId, answer),
                  next: (questionId) => this.#advance(questionId),
                })
              : renderPastRound(m, past)
          }
        </div>
        <div
          class="grill-tab-panel"
          id="grill-panel-review"
          role="tabpanel"
          aria-labelledby="grill-tab-review"
          ?hidden=${this.tab !== 'review'}
        >
          ${this.renderReviewPanel(context)}
        </div>
        ${this.#renderFooter(context.actions.length === 0)}
      </div>
    `;
  }

  /**
   * The hand-off. Inside a Claude Artifact the review goes straight to Claude,
   * with copying kept as the way on when a send fails.
   */
  #renderFooter(empty: boolean): TemplateResult {
    const m = grillMessages(this.locale);
    const copyLabel =
      this.#copyStatus === 'copied' ? m.copied : this.#copyStatus === 'failed' ? m.copyFailed : m.copyAll;
    if (!this.canSendToClaude) {
      return html`
        <div class="grill-footer">
          <button
            class="dpk-btn dpk-btn--accent grill-copy"
            type="button"
            data-status=${this.#copyStatus}
            ?disabled=${empty}
            @click=${() => void this.#copy()}
          >
            ${copyLabel}
          </button>
          <span class="grill-sr" role="status">${this.#copyStatus === 'idle' ? '' : copyLabel}</span>
        </div>
      `;
    }
    const send = this.#sendStatus;
    const sendLabel =
      send.kind === 'pending'
        ? m.sending
        : send.kind === 'sent'
          ? m.sent
          : send.kind === 'failed'
            ? m.sendFailed
            : m.sendAll;
    const note = send.kind === 'failed' ? handoffFailureLabel(send.reason, this.locale) : null;
    const announced = note ?? (send.kind === 'sent' ? sendLabel : this.#copyStatus === 'idle' ? '' : copyLabel);
    return html`
      <div class="grill-footer">
        <div class="grill-footer-actions">
          <button
            class="dpk-btn dpk-btn--accent grill-send"
            type="button"
            data-status=${send.kind}
            ?disabled=${empty || send.kind === 'pending'}
            @click=${() => void this.#send()}
          >
            ${sendLabel}
          </button>
          <button
            class="dpk-btn dpk-btn--ghost grill-copy"
            type="button"
            data-status=${this.#copyStatus}
            title=${m.copyAll}
            ?disabled=${empty}
            @click=${() => void this.#copy()}
          >
            ${this.#copyStatus === 'copied' ? m.copyDone : m.copy}
          </button>
        </div>
        ${note === null ? null : html`<p class="grill-footer-note">${note}</p>`}
        <span class="grill-sr" role="status">${announced}</span>
      </div>
    `;
  }

  /**
   * The questions tab as a select of rounds. It only opens once its tab is
   * selected: from Review it is disabled, and a tab button laid over it just
   * switches back.
   */
  #renderRoundTab(m: GrillMessages, rounds: readonly GrillRoundChoice[]): TemplateResult {
    const selected = this.tab === 'questions';
    const select = html`
      <select
        class="grill-round"
        id=${selected ? 'grill-tab-questions' : nothing}
        data-tab=${selected ? 'questions' : nothing}
        aria-label=${m.roundSelect}
        aria-controls="grill-panel-questions"
        ?disabled=${!selected}
        @change=${(event: Event) => this.#pickRound(event)}
      >
        ${rounds.map(
          (choice) => html`<option value=${choice.value} ?selected=${choice.selected}>${choice.label}</option>`,
        )}
      </select>
    `;
    return html`
      <div class="grill-round-tab" data-selected=${String(selected)}>
        ${select}
        ${
          selected
            ? nothing
            : html`<button
                type="button"
                role="tab"
                class="grill-round-switch"
                id="grill-tab-questions"
                data-tab="questions"
                aria-controls="grill-panel-questions"
                aria-selected="false"
                aria-label=${rounds.find((choice) => choice.selected)?.label ?? m.questionsTab}
                tabindex="-1"
                @click=${() => (this.tab = 'questions')}
                @keydown=${(event: KeyboardEvent) => this.#tabKey(event)}
              ></button>`
        }
      </div>
    `;
  }

  #pickRound(event: Event): void {
    const select = event.currentTarget;
    if (!(select instanceof HTMLSelectElement)) return;
    this.tab = 'questions';
    this.round = select.value === 'current' ? 'current' : Number(select.value);
    // Back on the current questions, the list scrolls to the open one again.
    this.#scrolledQuestion = null;
  }

  #tabKey(event: KeyboardEvent): void {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    this.tab =
      event.key === 'Home'
        ? 'questions'
        : event.key === 'End'
          ? 'review'
          : this.tab === 'questions'
            ? 'review'
            : 'questions';
    // The questions tab can change element (the round select) when selected, so focus after the render.
    const tab = this.tab;
    void this.updateComplete.then(() => this.renderRoot.querySelector<HTMLElement>(`[data-tab="${tab}"]`)?.focus());
  }

  /**
   * The main area: the author's own markup, with the Q badges layered over it.
   * `slot="main"` lands here rather than after the template, so the badges share
   * a coordinate space with the content they annotate.
   */
  #renderStage(context: TemplateRenderContext<GrillState>, bindings: readonly LabelBinding[]): TemplateResult {
    return html`
      <div class="grill-stage">
        <slot name="main"></slot>
        <div class="grill-labels">
          ${bindings.map(
            (binding) => html`
              <button
                type="button"
                class="grill-label"
                data-label=${binding.index}
                data-answered=${String(binding.answered)}
                data-visible="false"
                aria-pressed=${binding.open ? 'true' : 'false'}
                aria-label=${`${binding.ref} · ${binding.title}`}
                title=${`${binding.ref} · ${binding.title}`}
                @click=${() => this.#openQuestion(context, binding.questionId)}
              >
                ${binding.ref}
              </button>
            `,
          )}
        </div>
      </div>
    `;
  }

  // ----------------------------------------------------------------- actions

  #answer(questionId: string, answer: AnswerInput): void {
    const outcome = this.dispatch(answerQuestion(questionId, answer));
    if (!outcome.ok) return;
    if (answer.kind === 'option') {
      // A choice is a decision: record it and move the review on.
      this.#advance(questionId);
      return;
    }
    // Free text is still being written; the caret stays put until ⌘/Ctrl+Enter.
    if (answer.kind === 'free' && answer.text === '') this.#focusFree = questionId;
  }

  /** Opens the next unanswered question, if there is one. */
  #advance(questionId: string): void {
    const next = nextOpenQuestion(this.derivation.state, questionId);
    if (next !== null) this.navigate({ question: next });
  }

  async #copy(): Promise<void> {
    const text = this.api.exportBrief();
    const copied = await copyText(text);
    this.#clearFlash();
    this.#copyStatus = copied ? 'copied' : 'failed';
    this.#flash();
  }

  async #send(): Promise<void> {
    this.#clearFlash();
    this.#sendStatus = { kind: 'pending' };
    this.requestUpdate();
    const outcome = await this.sendToClaude();
    this.#sendStatus = outcome.ok ? { kind: 'sent' } : { kind: 'failed', reason: outcome.reason };
    // A failure says what to do next, so it stays until the reader acts on it.
    if (outcome.ok) this.#flash();
    else this.requestUpdate();
  }

  /** One outcome at a time: it shows, then the buttons go back to their labels. */
  #flash(): void {
    this.requestUpdate();
    this.#flashTimer = setTimeout(() => {
      this.#flashTimer = null;
      this.#copyStatus = 'idle';
      this.#sendStatus = { kind: 'idle' };
      this.requestUpdate();
    }, 2400);
  }

  #clearFlash(): void {
    if (this.#flashTimer !== null) clearTimeout(this.#flashTimer);
    this.#flashTimer = null;
    this.#copyStatus = 'idle';
    this.#sendStatus = { kind: 'idle' };
  }

  // ------------------------------------------------------------ label layer

  #collect(): void {
    this.requestUpdate();
  }

  /** Watches the light DOM and every shadow root inside it (diagram internals). */
  #observeScopes(): void {
    this.#observer?.disconnect();
    this.#observer ??= new MutationObserver(() => {
      this.#collect();
      this.#schedulePosition();
    });
    this.#observer.observe(this, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [GRILL_QUESTIONS_ATTRIBUTE],
    });
    for (const element of this.querySelectorAll('*')) {
      if (element === this || !element.shadowRoot) continue;
      this.#observer.observe(element.shadowRoot, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: [GRILL_QUESTIONS_ATTRIBUTE],
      });
    }
  }

  #schedulePosition = (): void => {
    if (this.#positionPending) return;
    this.#positionPending = true;
    requestAnimationFrame(() => {
      this.#positionPending = false;
      const layer = this.renderRoot.querySelector<HTMLElement>('.grill-labels');
      if (layer) positionLabels(layer, this.#bindings);
    });
  };

  /** Opening a question from a badge moves the list to that question. */
  #revealOpenQuestion(): void {
    const openId = this.navigation['question'] ?? null;
    if (this.tab !== 'questions' || this.round !== 'current' || this.folded) return;
    if (openId === null || openId === this.#scrolledQuestion) return;
    this.#scrolledQuestion = openId;
    const card = this.renderRoot.querySelector(`[data-question="${openId}"]`);
    const list = card?.closest('.grill-list');
    if (card && list) revealWithin(list, card);
  }
}

export const defineGrillElement = (): void => {
  if (!customElements.get('dpk-template-grill')) customElements.define('dpk-template-grill', DpkTemplateGrill);
};
