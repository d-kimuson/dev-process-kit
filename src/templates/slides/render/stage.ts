import { html, nothing, type TemplateResult } from 'lit';
import { repeat } from 'lit/directives/repeat.js';

import type { TemplateRenderContext } from '../../../core/shell/contracts';
import type { SlideStep } from '../interactions';
import type { SlidesMessages } from '../messages';
import type { Slide, SlidesState } from '../model';

import { iconChevronLeft, iconChevronRight, iconClose, iconMaximize } from '../../../core/icons';
import { slideComments, slidePosition, type SlideComment } from '../present';

export type StageOptions = {
  /** Whether the browser lets this page go full screen (a sandboxed frame may not). */
  readonly canFullscreen: boolean;
  /** The unsent comment on a slide; each slide keeps its own. */
  readonly draftFor: (slideId: string) => string;
  readonly onStep: (step: SlideStep) => void;
  readonly onFullscreen: () => void;
  readonly onDraft: (slideId: string, body: string) => void;
  readonly onComment: (slideId: string) => void;
  readonly onDeleteComment: (commentId: string) => void;
};

/**
 * The slide on screen, the bar that moves through the deck, and the comments
 * on the slide with a form to add one.
 *
 * The slide body is author markup (`slot="preview"` + `data-preview-id` = the
 * slide id), routed into a slot this element renders. Slot assignment does not
 * cross shadow roots, which is why the stage is a render function of the
 * template element and not a child element of its own.
 */
export const renderStage = (
  context: TemplateRenderContext<SlidesState>,
  m: SlidesMessages,
  options: StageOptions,
): TemplateResult => {
  const position = slidePosition(context.state, context.navigation);
  if (position === null) {
    return html`<div class="deck">
      <p class="deck-empty">${m.noSlidesBefore}<code>slides</code>${m.noSlidesAfter}</p>
    </div>`;
  }
  const { slide, index, total } = position;
  return html`
    <div class="deck">
      <div class="stage">${renderSlide(slide, index)}</div>
      <div class="deck-bar">
        <div class="deck-move">
          <button
            class="dpk-icon-btn deck-prev"
            type="button"
            aria-label=${m.previous}
            title=${m.previous}
            ?disabled=${position.previous === undefined}
            @click=${() => options.onStep('previous')}
          >
            ${iconChevronLeft()}
          </button>
          <span class="deck-counter" role="status" aria-label=${m.position(index + 1, total)}>
            <strong>${index + 1}</strong> / ${total}
          </span>
          <button
            class="dpk-icon-btn deck-next"
            type="button"
            aria-label=${m.next}
            title=${m.next}
            ?disabled=${position.next === undefined}
            @click=${() => options.onStep('next')}
          >
            ${iconChevronRight()}
          </button>
        </div>
        <div class="deck-progress" aria-hidden="true">
          <span style=${`width:${((index + 1) / total) * 100}%`}></span>
        </div>
        ${
          options.canFullscreen
            ? html`<button
                class="dpk-btn deck-fullscreen"
                type="button"
                title=${m.fullscreenHint}
                @click=${options.onFullscreen}
              >
                ${iconMaximize()} ${m.fullscreen}
              </button>`
            : nothing
        }
      </div>
      ${renderComments(m, slide, slideComments(context.comments, slide.id), options)}
      ${renderParkedBodies(context.state, slide.id)}
    </div>
  `;
};

const renderSlide = (slide: Slide, index: number): TemplateResult => html`
  <article
    class="slide"
    data-layout=${slide.layout}
    aria-roledescription="slide"
    aria-label=${`${index + 1}. ${slide.title}`}
  >
    <div class="slide-content">
      <h2 class="slide-title">${slide.title}</h2>
      ${slide.subtitle === '' ? nothing : html`<p class="slide-subtitle">${slide.subtitle}</p>`}
      ${
        slide.points.length === 0
          ? nothing
          : html`<ul class="slide-points">
              ${slide.points.map((point) => html`<li>${point}</li>`)}
            </ul>`
      }
      <div class="slide-body"><slot name=${`preview:${slide.id}`}></slot></div>
    </div>
    <span class="slide-number" aria-hidden="true">${index + 1}</span>
  </article>
`;

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

/**
 * Every slide body except the one on screen still needs a slot in this shadow
 * root; otherwise it would fall back to the generic `slot="preview"` bucket and
 * show up as an orphan.
 */
const renderParkedBodies = (state: SlidesState, currentId: string): TemplateResult | typeof nothing => {
  const parked = state.slides.filter((slide) => slide.id !== currentId);
  if (parked.length === 0) return nothing;
  return html`<div class="parked" aria-hidden="true">
    ${parked.map((slide) => html`<slot name=${`preview:${slide.id}`}></slot>`)}
  </div>`;
};
