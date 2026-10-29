import { html, nothing, type TemplateResult } from 'lit';
import { repeat } from 'lit/directives/repeat.js';

import type { ViewRenderContext } from '../../../core/shell/contracts';
import type { SlideStep } from '../interactions';
import type { SlidesMessages } from '../messages';
import type { Slide, SlidesState } from '../model';

import { iconClose } from '../../../core/icons';
import { slideComments, slidePosition, type SlideComment } from '../present';
import { renderNotes, type NotesOptions } from './notes';
import { renderParkedBodies, renderSlide, renderSlideMove } from './slide';

export type StageOptions = {
  /** The unsent comment on a slide; each slide keeps its own. */
  readonly draftFor: (slideId: string) => string;
  /** The notes pane: the unsent text on a slide, and its explicit submit. */
  readonly notes: NotesOptions;
  readonly onStep: (step: SlideStep) => void;
  readonly onPresent: () => void;
  readonly onDraft: (slideId: string, body: string) => void;
  readonly onComment: (slideId: string) => void;
  readonly onDeleteComment: (commentId: string) => void;
};

/**
 * The slide on screen, the bar that moves through the deck, the notes written
 * for it and the comments on it.
 *
 * The slide body is author markup (`slot="preview"` + `data-preview-id` = the
 * slide id), routed into a slot this element renders. Slot assignment does not
 * cross shadow roots, which is why the stage is a render function of the
 * template element and not a child element of its own.
 */
export const renderStage = (
  context: ViewRenderContext<SlidesState>,
  m: SlidesMessages,
  options: StageOptions,
): TemplateResult => {
  const position = slidePosition(context.state, context.navigation);
  if (position === null) {
    return html`<div class="deck">
      <p class="dpk-empty deck-empty">${m.noSlidesBefore}<code>slides</code>${m.noSlidesAfter}</p>
    </div>`;
  }
  const { slide, index, total } = position;
  return html`
    <div class="deck">
      <div class="stage">${renderSlide(slide, index)}</div>
      <div class="dpk-toolbar deck-bar">
        ${renderSlideMove(m, {
          position: {
            index,
            total,
            hasPrevious: position.previous !== undefined,
            hasNext: position.next !== undefined,
          },
          onStep: options.onStep,
          prefix: 'deck',
        })}
        <div class="deck-progress" aria-hidden="true">
          <span style=${`width:${((index + 1) / total) * 100}%`}></span>
        </div>
        <button class="dpk-btn deck-present" type="button" title=${m.fullscreenHint} @click=${options.onPresent}>
          ${m.present}
        </button>
      </div>
      ${renderNotes(m, slide, options.notes)}
      ${renderComments(m, slide, slideComments(context.comments, slide.id), options)}
      ${renderParkedBodies(context.state, slide.id)}
    </div>
  `;
};

/**
 * What the reader asks or wants changed is about the slide in front of them, so
 * the form sits right under it and always writes to it. The list above the form
 * has a height of its own and scrolls, so the form stays put as comments pile up.
 */
const renderComments = (
  m: SlidesMessages,
  slide: Slide,
  comments: readonly SlideComment[],
  options: StageOptions,
): TemplateResult => {
  const draft = options.draftFor(slide.id);
  const canSubmit = draft.trim() !== '';
  return html`
    <section class="slide-comments" aria-label=${m.commentOnSlide}>
      ${
        comments.length === 0
          ? nothing
          : html`<ul class="slide-comment-list">
              ${repeat(
                comments,
                (comment) => comment.id,
                (comment) => html`<li>
                  <span class="slide-comment-body">${comment.body}</span>
                  <button
                    class="dpk-icon-btn slide-comment-delete"
                    type="button"
                    aria-label=${m.deleteComment}
                    title=${m.deleteComment}
                    @click=${() => options.onDeleteComment(comment.id)}
                  >
                    ${iconClose()}
                  </button>
                </li>`,
              )}
            </ul>`
      }
      <div class="slide-comment-form">
        <textarea
          class="dpk-textarea slide-comment-input"
          aria-label=${m.commentOnSlide}
          placeholder=${m.commentPlaceholder}
          .value=${draft}
          @input=${(event: Event) => {
            if (event.currentTarget instanceof HTMLTextAreaElement)
              options.onDraft(slide.id, event.currentTarget.value);
          }}
          @keydown=${(event: KeyboardEvent) => {
            if (event.isComposing || event.key !== 'Enter' || !(event.metaKey || event.ctrlKey)) return;
            event.preventDefault();
            if (canSubmit) options.onComment(slide.id);
          }}
        ></textarea>
        <div class="slide-comment-actions">
          <button
            class="dpk-btn dpk-btn--accent slide-comment-submit"
            type="button"
            ?disabled=${!canSubmit}
            @click=${() => options.onComment(slide.id)}
          >
            ${m.addComment}
          </button>
          <span class="slide-comment-hint">${m.submitHint}</span>
        </div>
      </div>
    </section>
  `;
};
