import { defineAppElement } from '../app/index';
/**
 * `views/usm.js` — the user story mapping template on its own.
 *
 * The entry carries the core API, the components the template renders (the review rail
 * and inline editing are core elements every template uses) and nothing else. Load
 * `components.js` as well when the page also uses the diagram elements directly, or
 * `index.js` when it should carry every template.
 *
 * `ENTRIES` in `vite.config.ts` is what publishes this file as
 * `views/usm.js`.
 */
import { defineCommentPanel } from '../components/comment-panel/index';
import { defineCommentThread } from '../components/comment-thread/index';
import { defineInlineEdit } from '../components/inline-edit';
import { defineMatrix } from '../components/matrix/index';
import { defineTable } from '../components/table/index';
import { startEntry } from '../core/version-loader';
import { definePageElement } from '../page/index';
import { defineUsmElement } from '../views/usm';

export * from '../core/index';
export { DpkCommentPanel } from '../components/comment-panel/index';
export type { CommentPanelCallbacks } from '../components/comment-panel/index';
export { DpkCommentThread } from '../components/comment-thread/index';
export type { CommentThreadItem } from '../components/comment-thread/index';
export { DpkInlineEdit } from '../components/inline-edit';
export { DpkMatrix } from '../components/matrix/index';
export { DpkTable } from '../components/table/index';
export * as usm from '../views/usm';

startEntry({
  entry: 'views/usm.js',
  url: import.meta.url,
  views: ['usm'],
  register: () => {
    defineCommentPanel();
    defineCommentThread();
    defineInlineEdit();
    defineMatrix();
    defineTable();
    defineUsmElement();
    defineAppElement();
    definePageElement();
  },
});
