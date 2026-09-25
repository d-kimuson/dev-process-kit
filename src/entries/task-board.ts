/**
 * `templates/task-board.js` — the task board template on its own.
 *
 * The board is data only and needs no diagram elements. The entry carries the
 * core API, the components the template renders (the review rail and inline
 * editing) and nothing else; `index.js` carries every template.
 *
 * `ENTRIES` in `vite.config.ts` is what publishes this file as
 * `templates/task-board.js`.
 */
import { defineCommentPanel } from '../components/comment-panel/index';
import { defineInlineEdit } from '../components/inline-edit';
import { FRAMEWORK_VERSION } from '../core/index';
import { announce } from '../lib/announce';
import { defineTaskBoardElement } from '../templates/task-board';

export * from '../core/index';
export { DpkComponentCommentPanel } from '../components/comment-panel/index';
export type { CommentPanelCallbacks } from '../components/comment-panel/index';
export { DpkComponentInlineEdit } from '../components/inline-edit';
export * as taskBoard from '../templates/task-board';

defineCommentPanel();
defineInlineEdit();
defineTaskBoardElement();
announce(FRAMEWORK_VERSION, ['task-board']);
