import { html, nothing, type TemplateResult } from 'lit';
import { repeat } from 'lit/directives/repeat.js';

import type { TemplateRenderContext } from '../../../core/shell/contracts';
import type { SlidesMessages } from '../messages';
import type { SlidesState } from '../model';

/** The deck in reading order: one row per slide, with its note count. */
export const renderOutline = (context: TemplateRenderContext<SlidesState>, m: SlidesMessages): TemplateResult => {
  const { state, navigation } = context;
  const current = navigation['slide'];
  return html`
    <nav class="outline" aria-label=${m.outline}>
      <div class="outline-head">
        <span class="dpk-label">${m.outline}</span>
        <span class="dpk-label">${state.slides.length}</span>
      </div>
      <ol class="outline-list">
        ${repeat(
          state.slides,
          (slide) => slide.id,
          (slide, index) => {
            const isCurrent = slide.id === current;
            const notes = context.commentCount({ type: 'slide', id: slide.id });
            return html`
              <li class="outline-row" data-current=${String(isCurrent)} data-layout=${slide.layout}>
                <a href=${context.hashFor({ slide: slide.id })} aria-current=${isCurrent ? 'page' : nothing}>
                  <span class="outline-index">${String(index + 1).padStart(2, '0')}</span>
                  <span class="outline-title">${slide.title}</span>
                  ${notes > 0 ? html`<span class="outline-note">${notes}</span>` : nothing}
                </a>
              </li>
            `;
          },
        )}
      </ol>
    </nav>
  `;
};
