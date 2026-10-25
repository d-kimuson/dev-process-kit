export { DpkCodeGroup } from './element';
export { emptyCodeGroupData, parseCodeGroupData } from './model';
export type { CodeGroupData, CodeGroupVariant } from './model';
export { codeGroupMessages } from './messages';
export type { CodeGroupMessages } from './messages';

import { DpkCodeGroup } from './element';

export const defineCodeGroup = (): void => {
  if (!customElements.get('dpk-code-group')) customElements.define('dpk-code-group', DpkCodeGroup);
};
