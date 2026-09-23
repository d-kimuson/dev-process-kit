/**
 * `templates/prototype.js` — the UX prototype template on its own.
 *
 * The entry carries the core API, the components the template renders (the review rail
 * and inline editing are core elements every artifact uses) and nothing else. Load
 * `components.js` as well when the page also uses the diagram elements directly, or
 * `index.js` when it should carry every template.
 *
 * `RELEASE_ENTRIES` in `scripts/release.ts` is what publishes this file as
 * `templates/prototype.js`.
 */
import { defineCommentPanel } from '../components/comment-panel/index';
import { defineInlineEdit } from '../components/inline-edit';
import { FRAMEWORK_VERSION } from '../core/index';
import { announce } from '../lib/announce';
import { definePrototypeElement } from '../templates/prototype';

export * from '../core/index';
export { ArtifactCommentPanel } from '../components/comment-panel/index';
export type { CommentPanelCallbacks } from '../components/comment-panel/index';
export { ArtifactInlineEdit } from '../components/inline-edit';
export * as prototype from '../templates/prototype';

defineCommentPanel();
defineInlineEdit();
definePrototypeElement();
announce(FRAMEWORK_VERSION, ['prototype']);
