export { DpkCommentable } from './element';
export { commentableMessages } from './messages';
export type { CommentableMessages } from './messages';
export { itemLabel, itemTargetValue, parseItemRef } from './model';
export type { CommentableItem } from './model';

import { DpkCommentable } from './element';

export const defineCommentable = (): void => {
  if (!customElements.get('dpk-commentable')) customElements.define('dpk-commentable', DpkCommentable);
};
