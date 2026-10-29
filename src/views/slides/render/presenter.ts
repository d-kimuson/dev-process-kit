import { html, nothing, type TemplateResult } from 'lit';

import type { ViewRenderContext } from '../../../core/shell/contracts';
import type { SlideStep } from '../interactions';
import type { SlidesMessages } from '../messages';
import type { SlidesState } from '../model';

import { iconClose } from '../../../core/icons';
import { slidePosition } from '../present';
import { renderFullscreenButton, renderParkedBodies, renderSlide, renderSlideMove } from './slide';

export type PresentationOptions = {
  /** Whether the browser lets this page go full screen on top of presentation. */
  readonly canFullscreen: boolean;
  readonly onStep: (step: SlideStep) => void;
  readonly onExit: () => void;
  readonly onFullscreen: () => void;
};

/**
 * Presentation mode: the current slide as the whole screen.
 *
 * It is a surface this element owns, not the browser's full screen, so it works
 * where `requestFullscreen` is refused and is exercised in tests. Which slide it
 * shows, and whether it is on at all, comes from the hash like any other viewing
 * state (`#present=1&slide=<id>`).
 *
 * The surface carries `popover="manual"`, so a browser lifts it into the top
 * layer (`element.ts` opens it there where the API exists; without the API it is
 * the fixed overlay its own styles describe). The top layer is above the page's
 * own chrome and keeps a fixed box from being caught by a transformed ancestor
 * while the page settles.
 *
 * The stage and the deck bar are not rendered behind it: the outline, the bar and
 * the comment form are not part of presenting, and one slide body can only be
 * assigned to one slot.
 *
 * The speaker notes are a presenter aid: they sit beside the slide, never on it,
 * and they are shown whenever the slide has any — presenting is when they are
 * wanted, so there is no toggle to find.
 */
export const renderPresentation = (
  context: ViewRenderContext<SlidesState>,
  m: SlidesMessages,
  options: PresentationOptions,
): TemplateResult | typeof nothing => {
  const position = slidePosition(context.state, context.navigation);
  if (position === null) return nothing;
  const { slide, index, total } = position;
  const notes = slide.notes.trim();
  return html`
    <div
      class="presentation"
      popover="manual"
      role="dialog"
      aria-modal="true"
      aria-label=${m.presentation}
      tabindex="-1"
    >
      <div class="presentation-stage">${renderSlide(slide, index)}</div>
      <div class="presentation-bar" role="group" aria-label=${m.presentation}>
        ${renderSlideMove(m, {
          position: {
            index,
            total,
            hasPrevious: position.previous !== undefined,
            hasNext: position.next !== undefined,
          },
          onStep: options.onStep,
          prefix: 'presentation',
        })}
        ${renderFullscreenButton(m, options.canFullscreen, options.onFullscreen, 'deck-fullscreen')}
        <button class="dpk-btn presentation-exit" type="button" @click=${options.onExit}>
          ${iconClose()} ${m.exitPresentation}
        </button>
      </div>
      ${
        notes === ''
          ? nothing
          : html`<aside class="presentation-notes" aria-label=${m.speakerNotes}>
              <p class="dpk-label">${m.speakerNotes}</p>
              <p class="presentation-notes-body">${notes}</p>
            </aside>`
      }
      ${renderParkedBodies(context.state, slide.id)}
    </div>
  `;
};
