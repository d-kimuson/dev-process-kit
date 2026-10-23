export { DpkCommentThread } from './element';
export { commentThreadMessages } from './messages';
export type { CommentThreadMessages } from './messages';
export type { CommentThreadItem } from './model';

import { DpkCommentThread } from './element';

export const defineCommentThread = (): void => {
  if (!customElements.get('dpk-comment-thread')) customElements.define('dpk-comment-thread', DpkCommentThread);
};
