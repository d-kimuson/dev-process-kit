/**
 * `templates/grill.js` — the grill template on its own.
 *
 * Grill puts its question badges over markup the author owns, including the diagram
 * elements, so a page that grills a diagram loads `components.js` next to this entry.
 * The entry itself carries the core API, the components the template renders (the
 * review rail and inline editing) and nothing else; `index.js` carries every template.
 *
 * `ENTRIES` in `vite.config.ts` is what publishes this file as
 * `templates/grill.js`.
 */
import { defineCommentPanel } from '../components/comment-panel/index';
import { defineInlineEdit } from '../components/inline-edit';
import { startEntry } from '../core/version-loader';
import { defineGrillElement } from '../templates/grill';

export * from '../core/index';
export { DpkComponentCommentPanel } from '../components/comment-panel/index';
export type { CommentPanelCallbacks } from '../components/comment-panel/index';
export { DpkComponentInlineEdit } from '../components/inline-edit';
export * as grill from '../templates/grill';

startEntry({
  entry: 'templates/grill.js',
  templates: ['grill'],
  register: () => {
    defineCommentPanel();
    defineInlineEdit();
    defineGrillElement();
  },
});
