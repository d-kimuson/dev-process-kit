/**
 * `templates/plain.js` — the plain template on its own.
 *
 * Plain is the shell and the review pipeline around markup the author owns, which is
 * often a diagram: a page that puts diagram elements in `slot="main"` loads
 * `components.js` next to this entry. The entry itself carries the core API, the
 * components the template renders (the review rail and inline editing) and nothing
 * else; `index.js` carries every template.
 *
 * `RELEASE_ENTRIES` in `scripts/release.ts` is what publishes this file as
 * `templates/plain.js`.
 */
import { defineCommentPanel } from '../components/comment-panel/index';
import { defineInlineEdit } from '../components/inline-edit';
import { FRAMEWORK_VERSION } from '../core/index';
import { announce } from '../lib/announce';
import { definePlainElement } from '../templates/plain';

export * from '../core/index';
export { DpkComponentCommentPanel } from '../components/comment-panel/index';
export type { CommentPanelCallbacks } from '../components/comment-panel/index';
export { DpkComponentInlineEdit } from '../components/inline-edit';
export * as plain from '../templates/plain';

defineCommentPanel();
defineInlineEdit();
definePlainElement();
announce(FRAMEWORK_VERSION, ['plain']);
