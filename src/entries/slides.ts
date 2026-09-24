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
import { FRAMEWORK_VERSION } from '../core/index';
import { announce } from '../lib/announce';
import { defineSlidesElement } from '../templates/slides';

export * from '../core/index';
export { DpkComponentCommentPanel } from '../components/comment-panel/index';
export type { CommentPanelCallbacks } from '../components/comment-panel/index';
export { DpkComponentInlineEdit } from '../components/inline-edit';
export * as slides from '../templates/slides';

defineCommentPanel();
defineInlineEdit();
defineSlidesElement();
announce(FRAMEWORK_VERSION, ['slides']);
