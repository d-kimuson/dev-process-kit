import type { Locale } from '../../core/i18n';
import type { ShellRegions, TemplateRenderContext } from '../../core/shell/contracts';
import type { SlidesState } from './model';

import { COMMENT_ACTION } from '../../core/action';
import { TemplateElement } from '../../core/element';
import { slidesDefinitionFor } from './definition';
import { slideKeyStep, stepSlide, type SlideStep } from './interactions';
import { slidesMessages } from './messages';
import { renderOutline } from './render/outline';
import { renderStage } from './render/stage';
import { slidesStyles } from './styles';

/** Keys typed into these belong to the field, not to the deck. */
const TYPING_TARGET = 'input, textarea, select, [contenteditable]:not([contenteditable="false"])';

const isTypingTarget = (node: EventTarget): boolean =>
  node instanceof HTMLElement && (node.isContentEditable || node.matches(TYPING_TARGET));

/**
 * `<dpk-template-slides>` — a deck an agent explains something with.
 *
 * The outline lists the slides, the stage shows one at a time at 16:9, and the
 * arrow keys (or PageUp / PageDown from a clicker) move through them. Which
 * slide is on screen is navigation (`#slide=<id>`), never a draft action; the
 * only draft a reader produces is comments, on a slide or on the whole deck.
 * The form under the slide writes to the slide on screen, and an unsent comment
 * stays with its slide while the reader moves through the deck.
 *
 * "Full screen" shows the stage alone, where the browser allows it.
 */
export class DpkTemplateSlides extends TemplateElement<SlidesState> {
  static override styles = [TemplateElement.styles, slidesStyles];

  /** Unsent comments by slide id; replaced, never mutated. */
  #drafts: ReadonlyMap<string, string> = new Map();
  /** The comment list the reader last saw, to scroll only when it grows or changes slide. */
  #shownComments: { readonly slide: string; readonly count: number } = { slide: '', count: 0 };

  protected override definitionFor(locale: Locale) {
    return slidesDefinitionFor(locale);
  }

  override connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener('keydown', this.#onKeydown);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener('keydown', this.#onKeydown);
  }

  protected override renderRegions(context: TemplateRenderContext<SlidesState>): ShellRegions {
    const m = slidesMessages(this.locale);
    return {
      sidebar: renderOutline(context, m),
      sidebarHidden: context.state.slides.length === 0,
      main: renderStage(context, m, {
        canFullscreen: document.fullscreenEnabled === true,
        draftFor: (slideId) => this.#drafts.get(slideId) ?? '',
        onStep: (step) => this.#go(step),
        onFullscreen: () => this.#fullscreen(),
        onDraft: (slideId, body) => this.#setDraft(slideId, body),
        onComment: (slideId) => this.#comment(slideId),
        onDeleteComment: (commentId) => this.removeAction(commentId),
      }),
    };
  }

  protected override updated(): void {
    super.updated();
    this.#revealNewestComment();
  }

  /**
   * The newest comment is the one just written, so a list that grew, or the
   * list of another slide, shows its end. Typing in the form or deleting a
   * comment leaves the reader's scroll where it is.
   */
  #revealNewestComment(): void {
    const list = this.renderRoot.querySelector('.slide-comment-list');
    const shown = { slide: this.navigation['slide'] ?? '', count: list?.childElementCount ?? 0 };
    const previous = this.#shownComments;
    this.#shownComments = shown;
    if (list === null || (shown.slide === previous.slide && shown.count <= previous.count)) return;
    list.scrollTop = list.scrollHeight;
  }

  #go(step: SlideStep): void {
    const id = stepSlide(this.derivation.state, this.navigation['slide'], step);
    if (id !== undefined) this.navigate({ slide: id });
  }

  #setDraft(slideId: string, body: string): void {
    const drafts = new Map(this.#drafts);
    if (body === '') drafts.delete(slideId);
    else drafts.set(slideId, body);
    this.#drafts = drafts;
    this.requestUpdate();
  }

  #comment(slideId: string): void {
    const body = (this.#drafts.get(slideId) ?? '').trim();
    if (body === '') return;
    const outcome = this.dispatch({ type: COMMENT_ACTION, target: { type: 'slide', id: slideId }, payload: { body } });
    if (outcome.ok) this.#setDraft(slideId, '');
  }

  #fullscreen(): void {
    const stage = this.renderRoot.querySelector('.stage');
    if (!(stage instanceof HTMLElement) || document.fullscreenElement !== null) return;
    // Refused when the frame is not allowed full screen; the page stays as it is.
    stage.requestFullscreen().catch(() => undefined);
  }

  #onKeydown = (event: KeyboardEvent): void => {
    if (event.defaultPrevented) return;
    const step = slideKeyStep(event);
    if (step === null || event.composedPath().some(isTypingTarget)) return;
    event.preventDefault();
    this.#go(step);
  };
}

export const defineSlidesElement = (): void => {
  if (!customElements.get('dpk-template-slides')) customElements.define('dpk-template-slides', DpkTemplateSlides);
};
