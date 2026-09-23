import { html, type TemplateResult } from 'lit';

import type { ShellRegions, TemplateRenderContext } from '../../core/shell/contracts';
import type { ActionTarget } from '../../core/types';
import type { GrillState } from './model';

import { TemplateElement } from '../../core/element';
import { copyText } from '../../lib/dom/clipboard';
import { answerQuestion, type AnswerInput } from './actions';
import { grillDefinition } from './definition';
import { presentGrillHeader, presentGrillPanel, nextOpenQuestion, type CopyStatus } from './present';
import { GRILL_QUESTIONS_ATTRIBUTE, collectLabelBindings, positionLabels, type LabelBinding } from './render/labels';
import { renderQuestionPanel } from './render/panel';
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

  readonly definition = grillDefinition;

  static override properties = {
    tab: { state: true },
    folded: { state: true },
  };

  declare private tab: 'questions' | 'review';
  declare private folded: boolean;

  #bindings: readonly LabelBinding[] = [];
  #positionPending = false;
  #scrolledQuestion: string | null = null;
  #focusFree: string | null = null;
  #observer: MutationObserver | null = null;
  #copyStatus: CopyStatus = 'idle';
  #copyTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    super();
    this.tab = 'questions';
    this.folded = false;
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
    if (this.#copyTimer !== null) clearTimeout(this.#copyTimer);
    this.#copyTimer = null;
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
    this.#scrolledQuestion = null;
    context.navigate({ question: questionId });
  }

  // ------------------------------------------------------------------ chrome

  /**
   * Folding gives the integrated question/review column's width back to the main area.
   */
  #renderHeaderControl(context: TemplateRenderContext<GrillState>): TemplateResult {
    const header = presentGrillHeader(context.state);
    const press = this.folded ? '質問 / Review をひらく' : '質問 / Review をたたむ';
    const label = `${press}（${header.progress}）`;
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
    const panel = presentGrillPanel(context.state, context.navigation);
    const copyLabel =
      this.#copyStatus === 'copied'
        ? 'コピーしました'
        : this.#copyStatus === 'failed'
          ? 'コピーできませんでした'
          : '回答・Review をまとめてコピー';
    return html`
      <div class="grill-panel">
        <div class="grill-tabs" role="tablist" aria-label="質問 / Review">
          ${(['questions', 'review'] as const).map(
            (tab) => html`
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
                ${tab === 'questions' ? '質問' : 'Review'}<span class="grill-count"
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
          ${renderQuestionPanel(panel, {
            open: (questionId) => this.#openQuestion(context, questionId),
            answer: (questionId, answer) => this.#answer(questionId, answer),
            next: (questionId) => this.#advance(questionId),
          })}
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
        <div class="grill-footer">
          <button
            class="dpk-btn dpk-btn--accent grill-copy"
            type="button"
            data-status=${this.#copyStatus}
            ?disabled=${context.actions.length === 0}
            @click=${() => void this.#copy()}
          >
            ${copyLabel}
          </button>
          <span class="grill-sr" role="status">${this.#copyStatus === 'idle' ? '' : copyLabel}</span>
        </div>
      </div>
    `;
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
    this.renderRoot.querySelector<HTMLButtonElement>(`[data-tab="${this.tab}"]`)?.focus();
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
    this.#reportCopy((await copyText(text)) ? 'copied' : 'failed');
  }

  /** The button reports the outcome, then goes back to its label. */
  #reportCopy(status: Exclude<CopyStatus, 'idle'>): void {
    this.#copyStatus = status;
    this.requestUpdate();
    if (this.#copyTimer !== null) clearTimeout(this.#copyTimer);
    this.#copyTimer = setTimeout(() => {
      this.#copyTimer = null;
      this.#copyStatus = 'idle';
      this.requestUpdate();
    }, 2400);
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
    if (this.tab !== 'questions' || this.folded || openId === null || openId === this.#scrolledQuestion) return;
    this.#scrolledQuestion = openId;
    const card = this.renderRoot.querySelector(`[data-question="${openId}"]`);
    if (card !== null && typeof card.scrollIntoView === 'function') card.scrollIntoView({ block: 'nearest' });
  }
}

export const defineGrillElement = (): void => {
  if (!customElements.get('dpk-template-grill')) customElements.define('dpk-template-grill', DpkTemplateGrill);
};
