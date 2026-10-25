import { defineAppElement } from '../app/index';
/**
 * `views/plain.js` — the plain template on its own.
 *
 * Plain is the shell and the review pipeline around markup the author owns, which is
 * often a diagram: a page that puts diagram elements in `slot="main"` loads
 * `components.js` next to this entry. The entry itself carries the core API, the
 * components the template renders (the review rail and inline editing) and nothing
 * else; `index.js` carries every template.
 *
 * `ENTRIES` in `vite.config.ts` is what publishes this file as
 * `views/plain.js`.
 */
import { defineCommentPanel } from '../components/comment-panel/index';
import { defineInlineEdit } from '../components/inline-edit';
import { startEntry } from '../core/version-loader';
import { definePageElement } from '../page/index';
import { definePlainElement } from '../views/plain';

export * from '../core/index';
export { DpkCommentPanel } from '../components/comment-panel/index';
export type { CommentPanelCallbacks } from '../components/comment-panel/index';
export { DpkInlineEdit } from '../components/inline-edit';
export * as plain from '../views/plain';

startEntry({
  entry: 'views/plain.js',
  url: import.meta.url,
  views: ['plain'],
  register: () => {
    defineCommentPanel();
    defineInlineEdit();
    definePlainElement();
    defineAppElement();
    definePageElement();
  },
});
