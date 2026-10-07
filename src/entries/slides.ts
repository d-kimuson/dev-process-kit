/**
 * `templates/slides.js` — the slides template on its own.
 *
 * A deck whose slide bodies hold diagram elements loads `components.js` next to
 * this entry. The entry itself carries the core API, the components the
 * template renders (the review rail and inline editing) and nothing else;
 * `index.js` carries every template.
 *
 * `ENTRIES` in `vite.config.ts` is what publishes this file as
 * `templates/slides.js`.
 */
import { defineCommentPanel } from '../components/comment-panel/index';
import { defineInlineEdit } from '../components/inline-edit';
import { startEntry } from '../core/version-loader';
import { defineSlidesElement } from '../templates/slides';

export * from '../core/index';
export { DpkComponentCommentPanel } from '../components/comment-panel/index';
export type { CommentPanelCallbacks } from '../components/comment-panel/index';
export { DpkComponentInlineEdit } from '../components/inline-edit';
export * as slides from '../templates/slides';

startEntry({
  entry: 'templates/slides.js',
  templates: ['slides'],
  register: () => {
    defineCommentPanel();
    defineInlineEdit();
    defineSlidesElement();
  },
});
