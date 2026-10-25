import { defineAppElement } from '../app/index';
/**
 * `views/delegation-poker.js` — the delegation poker table on its own.
 *
 * The entry carries the core API, the components the template renders (the review rail
 * and inline editing are core elements every template uses) and nothing else. Load
 * `components.js` as well when the page also uses the diagram elements directly, or
 * `index.js` when it should carry every template.
 *
 * `ENTRIES` in `vite.config.ts` is what publishes this file as
 * `views/delegation-poker.js`.
 */
import { defineCommentPanel } from '../components/comment-panel/index';
import { defineInlineEdit } from '../components/inline-edit';
import { startEntry } from '../core/version-loader';
import { definePageElement } from '../page/index';
import { defineDelegationPokerElement } from '../views/delegation-poker';

export * from '../core/index';
export { DpkCommentPanel } from '../components/comment-panel/index';
export type { CommentPanelCallbacks } from '../components/comment-panel/index';
export { DpkInlineEdit } from '../components/inline-edit';
export * as delegationPoker from '../views/delegation-poker';

startEntry({
  entry: 'views/delegation-poker.js',
  url: import.meta.url,
  views: ['delegation-poker'],
  register: () => {
    defineCommentPanel();
    defineInlineEdit();
    defineDelegationPokerElement();
    defineAppElement();
    definePageElement();
  },
});
