/**
 * `templates/grill.js` — the grill template on its own.
 *
 * Grill puts its question badges over markup the author owns, including the diagram
 * elements, so a page that grills a diagram loads `components.js` next to this entry.
 * The entry itself carries the core API, the components the template renders (the
 * review rail and inline editing) and nothing else; `index.js` carries every template.
 *
 * `RELEASE_ENTRIES` in `scripts/release.ts` is what publishes this file as
 * `templates/grill.js`.
 */
import { defineCommentPanel } from '../components/comment-panel/index';
import { defineInlineEdit } from '../components/inline-edit';
import { FRAMEWORK_VERSION } from '../core/index';
import { announce } from '../lib/announce';
import { defineGrillElement } from '../templates/grill';

export * from '../core/index';
export { DpkComponentCommentPanel } from '../components/comment-panel/index';
export type { CommentPanelCallbacks } from '../components/comment-panel/index';
export { DpkComponentInlineEdit } from '../components/inline-edit';
export * as grill from '../templates/grill';

defineCommentPanel();
defineInlineEdit();
defineGrillElement();
announce(FRAMEWORK_VERSION, ['grill']);
