/**
 * `templates/event-storming.js` — the event storming board on its own.
 *
 * The entry carries the core API, the components the template renders (the review rail
 * and inline editing are core elements every template uses) and nothing else. Load
 * `components.js` as well when the page also uses the diagram elements directly, or
 * `index.js` when it should carry every template.
 *
 * `ENTRIES` in `vite.config.ts` is what publishes this file as
 * `templates/event-storming.js`.
 */
import { defineCommentPanel } from '../components/comment-panel/index';
import { defineInlineEdit } from '../components/inline-edit';
import { startEntry } from '../core/version-loader';
import { defineEventStormingElement } from '../templates/event-storming';

export * from '../core/index';
export { DpkComponentCommentPanel } from '../components/comment-panel/index';
export type { CommentPanelCallbacks } from '../components/comment-panel/index';
export { DpkComponentInlineEdit } from '../components/inline-edit';
export * as eventStorming from '../templates/event-storming';

startEntry({
  entry: 'templates/event-storming.js',
  templates: ['event-storming'],
  register: () => {
    defineCommentPanel();
    defineInlineEdit();
    defineEventStormingElement();
  },
});
