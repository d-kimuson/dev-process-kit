export { DpkCommentPopover } from './element';
export { commentPopoverMessages } from './messages';
export type { CommentPopoverMessages } from './messages';

import { DpkCommentPopover } from './element';

export const defineCommentPopover = (): void => {
  if (!customElements.get('dpk-comment-popover')) customElements.define('dpk-comment-popover', DpkCommentPopover);
};
