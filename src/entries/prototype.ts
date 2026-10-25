import { defineAppElement } from '../app/index';
/**
 * `views/prototype.js` — the UX prototype template on its own.
 *
 * The entry carries the core API, the components the template renders (the review rail
 * and inline editing are core elements every template uses) and nothing else. Load
 * `components.js` as well when the page also uses the diagram elements directly, or
 * `index.js` when it should carry every template.
 *
 * `ENTRIES` in `vite.config.ts` is what publishes this file as
 * `views/prototype.js`.
 */
import { defineCommentPanel } from '../components/comment-panel/index';
import { defineInlineEdit } from '../components/inline-edit';
import { startEntry } from '../core/version-loader';
import { definePageElement } from '../page/index';
import { definePrototypeElement } from '../views/prototype';

export * from '../core/index';
export { DpkCommentPanel } from '../components/comment-panel/index';
export type { CommentPanelCallbacks } from '../components/comment-panel/index';
export { DpkInlineEdit } from '../components/inline-edit';
export * as prototype from '../views/prototype';

startEntry({
  entry: 'views/prototype.js',
  url: import.meta.url,
  views: ['prototype'],
  register: () => {
    defineCommentPanel();
    defineInlineEdit();
    definePrototypeElement();
    defineAppElement();
    definePageElement();
  },
});
