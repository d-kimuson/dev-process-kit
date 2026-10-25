import { defineAppElement } from '../app/index';
/**
 * `views/slides.js` — the slides template on its own.
 *
 * A deck whose slide bodies hold diagram elements loads `components.js` next to
 * this entry. The entry itself carries the core API, the components the
 * template renders (the review rail and inline editing) and nothing else;
 * `index.js` carries every template.
 *
 * `ENTRIES` in `vite.config.ts` is what publishes this file as
 * `views/slides.js`.
 */
import { defineCommentPanel } from '../components/comment-panel/index';
import { defineInlineEdit } from '../components/inline-edit';
import { startEntry } from '../core/version-loader';
import { definePageElement } from '../page/index';
import { defineSlidesElement } from '../views/slides';

export * from '../core/index';
export { DpkCommentPanel } from '../components/comment-panel/index';
export type { CommentPanelCallbacks } from '../components/comment-panel/index';
export { DpkInlineEdit } from '../components/inline-edit';
export * as slides from '../views/slides';

startEntry({
  entry: 'views/slides.js',
  url: import.meta.url,
  views: ['slides'],
  register: () => {
    defineCommentPanel();
    defineInlineEdit();
    defineSlidesElement();
    defineAppElement();
    definePageElement();
  },
});
