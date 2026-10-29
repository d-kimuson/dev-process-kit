import { nothing } from 'lit';

import type { Locale } from '../../core/i18n';
import type { ShellRegions, ViewRenderContext } from '../../core/shell/contracts';
import type { Slide, SlidesState } from './model';

import { atomStyles } from '../../components/atoms/styles';
import { COMMENT_ACTION } from '../../core/action';
import { ViewElement } from '../../core/element';
import { slidesAction } from './actions';
import { slidesDefinitionFor } from './definition';
import { slideKeyStep, stepSlide, type SlideStep } from './interactions';
import { slidesMessages } from './messages';
import { slidesPresentation, slidesPresenting } from './present';
import { renderOutline } from './render/outline';
import { renderPresentation } from './render/presenter';
import { renderStage } from './render/stage';
import { slidesStyles } from './styles';

/** Keys typed into these belong to the field, not to the deck. */
const TYPING_TARGET = 'input, textarea, select, [contenteditable]:not([contenteditable="false"])';

const isTypingTarget = (node: EventTarget): boolean =>
  node instanceof HTMLElement && (node.isContentEditable || node.matches(TYPING_TARGET));

/**
 * Whether the element is on screen: it, or anything it sits in, carries `hidden`.
 * A page of `<dpk-app>` that is not showing is hidden this way, and a deck on it
 * must not take the keys meant for the deck the reader is looking at. Checked on
 * the attributes rather than with layout, which a non-browser DOM does not have.
 */
const isShowing = (element: Element): boolean => {
  for (let node: Element | null = element; node !== null;) {
    if (node.hasAttribute('hidden')) return false;
    const root = node.getRootNode();
    node = node.parentElement ?? (root instanceof ShadowRoot ? root.host : null);
  }
  return true;
};

/**
 * `<dpk-view-slides>` — a deck an agent explains something with.
 *
 * The outline lists the slides, the stage shows one at a time at 16:9, and the
 * arrow keys (or PageUp / PageDown from a clicker) move through them. Which
 * slide is on screen is navigation (`#slide=<id>`), never a draft action.
 *
 * Two things the reader produces live here. A comment on a slide (or on the
 * deck) goes into the draft as a comment. The speaker notes are the author's
 * material: the pane under the stage writes them into the slide on screen with
 * an explicit submit, as a patch that the rail lists with the changes. Notes are
 * never drawn on the slide.
 *
 * Presentation mode shows the slide as the whole screen with the notes beside
 * it. It is viewing state too (`#present=1`), so entering and leaving tells the
 * agent nothing, and the same keys move through it; Escape leaves it.
 */
export class DpkViewSlides extends ViewElement<SlidesState> {
  static override styles = [ViewElement.styles, atomStyles, slidesStyles];

  /** Unsent comments by slide id; replaced, never mutated. */
  #drafts: ReadonlyMap<string, string> = new Map();
  /** Unsent notes by slide id; the reload path is the kit's own unsent-text store. */
  #notes: ReadonlyMap<string, string> = new Map();
  /** Whether the last render was presenting, so the surface takes focus only on the way in. */
  #presenting = false;
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

  protected override renderRegions(context: ViewRenderContext<SlidesState>): ShellRegions {
    const m = slidesMessages(this.locale);
    const presenting = slidesPresenting(context.navigation);
    const options = {
      canFullscreen: document.fullscreenEnabled === true,
      draftFor: (slideId: string) => this.#drafts.get(slideId) ?? '',
      notes: {
        textFor: (slide: Slide) => this.#notes.get(slide.id) ?? slide.notes,
        onDraft: (slide: Slide, text: string) => this.#setNotesDraft(slide, text),
        onSave: (slideId: string) => this.#saveNotes(slideId),
      },
      onStep: (step: SlideStep) => this.#go(step),
      onPresent: () => this.#setPresenting(true),
      onExit: () => this.#setPresenting(false),
      onFullscreen: () => this.#fullscreen(),
      onDraft: (slideId: string, body: string) => this.#setDraft(slideId, body),
      onComment: (slideId: string) => this.#comment(slideId),
      onDeleteComment: (commentId: string) => this.removeAction(commentId),
    };
    return {
      // Presenting is the deck alone: no outline, no bar, no comments around it.
      sidebar: presenting ? nothing : renderOutline(context, m),
      sidebarHidden: presenting || context.state.slides.length === 0,
      main: presenting ? renderPresentation(context, m, options) : renderStage(context, m, options),
    };
  }

  protected override updated(): void {
    super.updated();
    this.#focusOnPresent();
    this.#revealNewestComment();
  }

  /**
   * The reader entered presentation from a control that no longer exists, so
   * the surface takes the focus. It owns no key handling of its own: the deck
   * listens on the document.
   */
  #focusOnPresent(): void {
    const presenting = slidesPresenting(this.navigation);
    if (presenting && !this.#presenting) this.renderRoot.querySelector<HTMLElement>('.presentation')?.focus();
    this.#presenting = presenting;
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

  #setPresenting(presenting: boolean): void {
    // Viewing state only: the hash carries it, the draft is untouched.
    this.navigate(slidesPresentation(presenting));
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

  /** What the reader has typed but not sent; it comes back with the slide. */
  #setNotesDraft(slide: Slide, text: string): void {
    const notes = new Map(this.#notes);
    if (text === slide.notes) notes.delete(slide.id);
    else notes.set(slide.id, text);
    this.#notes = notes;
    this.requestUpdate();
  }

  /** Sends the notes into the draft; the rail lists it with the changes, not the comments. */
  #saveNotes(slideId: string): void {
    const text = (this.#notes.get(slideId) ?? '').trim();
    const outcome = this.dispatch(slidesAction.setNotes(slideId, text));
    if (!outcome.ok) return;
    const notes = new Map(this.#notes);
    notes.delete(slideId);
    this.#notes = notes;
    this.requestUpdate();
  }

  #fullscreen(): void {
    const surface = this.renderRoot.querySelector('.presentation');
    if (!(surface instanceof HTMLElement) || document.fullscreenElement !== null) return;
    // Refused when the frame is not allowed full screen; the page stays as it is.
    surface.requestFullscreen().catch(() => undefined);
  }

  #onKeydown = (event: KeyboardEvent): void => {
    // Listens on `document` so a clicker's PageUp/PageDown reaches it from anywhere, not just while
    // the deck has focus — but that means a deck on a page that is not showing (its `<dpk-page>` is
    // hidden) must not swallow keys meant for the deck the reader is looking at.
    if (event.defaultPrevented || !isShowing(this)) return;
    if (event.key === 'Escape') {
      // An open review rail outranks the deck: the Escape is for closing it, and
      // the next one leaves presentation.
      if (!slidesPresenting(this.navigation) || this.notesOpen || event.isComposing) return;
      event.preventDefault();
      this.#setPresenting(false);
      return;
    }
    const step = slideKeyStep(event);
    if (step === null || event.composedPath().some(isTypingTarget)) return;
    event.preventDefault();
    this.#go(step);
  };
}

export const defineSlidesElement = (): void => {
  if (!customElements.get('dpk-view-slides')) customElements.define('dpk-view-slides', DpkViewSlides);
};
