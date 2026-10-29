import { html, nothing, type TemplateResult } from 'lit';

import type { SlideStep } from '../interactions';
import type { SlidesMessages } from '../messages';
import type { Slide, SlidesState } from '../model';

import { iconChevronLeft, iconChevronRight, iconMaximize } from '../../../core/icons';
import { targetRef } from '../../../core/target';

/**
 * The pieces the stage and the presentation surface share. Both render the same
 * 16:9 slide — the only difference is how much of the screen it is given — so a
 * deck looks the same whether it is reviewed or presented.
 */

/** The slide itself: what is projected, and nothing else. */
export const renderSlide = (slide: Slide, index: number): TemplateResult => html`
  <article
    class="slide"
    data-layout=${slide.layout}
    data-dpk-target=${targetRef({ type: 'slide', id: slide.id })}
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
 * Every slide body except the one on screen still needs a slot in this shadow
 * root; otherwise it would fall back to the generic `slot="preview"` bucket and
 * show up as an orphan.
 */
export const renderParkedBodies = (state: SlidesState, currentId: string): TemplateResult | typeof nothing => {
  const parked = state.slides.filter((slide) => slide.id !== currentId);
  if (parked.length === 0) return nothing;
  return html`<div class="parked" aria-hidden="true">
    ${parked.map((slide) => html`<slot name=${`preview:${slide.id}`}></slot>`)}
  </div>`;
};

export type SlideMoveOptions = {
  readonly position: {
    readonly index: number;
    readonly total: number;
    readonly hasPrevious: boolean;
    readonly hasNext: boolean;
  };
  readonly onStep: (step: SlideStep) => void;
  /** Prefix of the control classes: `deck` in the stage, `presentation` while presenting. */
  readonly prefix: string;
};

/**
 * Previous / next and where the deck is. Shared, so the buttons of the stage and
 * of the presentation surface never disagree about the ends of the deck.
 */
export const renderSlideMove = (m: SlidesMessages, options: SlideMoveOptions): TemplateResult => {
  const { position, onStep, prefix } = options;
  return html`<div class="${prefix}-move">
    <button
      class="dpk-icon-btn ${prefix}-prev"
      type="button"
      aria-label=${m.previous}
      title=${m.previous}
      ?disabled=${!position.hasPrevious}
      @click=${() => onStep('previous')}
    >
      ${iconChevronLeft()}
    </button>
    <span class="deck-counter" role="status" aria-label=${m.position(position.index + 1, position.total)}>
      <strong>${position.index + 1}</strong> / ${position.total}
    </span>
    <button
      class="dpk-icon-btn ${prefix}-next"
      type="button"
      aria-label=${m.next}
      title=${m.next}
      ?disabled=${!position.hasNext}
      @click=${() => onStep('next')}
    >
      ${iconChevronRight()}
    </button>
  </div>`;
};

/**
 * The browser's own full screen, offered from inside presentation mode where the
 * document allows it. `requestFullscreen` is missing in some frames (a sandboxed
 * one, for instance), so the button only exists where it works; presentation
 * itself never needs it.
 */
export const renderFullscreenButton = (
  m: SlidesMessages,
  canFullscreen: boolean,
  onFullscreen: () => void,
  className: string,
): TemplateResult | typeof nothing =>
  canFullscreen
    ? html`<button class="dpk-btn ${className}" type="button" title=${m.fullscreenHint} @click=${onFullscreen}>
        ${iconMaximize()} ${m.fullscreen}
      </button>`
    : nothing;
