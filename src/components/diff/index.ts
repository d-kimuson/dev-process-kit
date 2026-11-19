export { DpkDiff } from './element';
export type { DiffView } from './element';
export { diffMessages } from './messages';
export type { DiffMessages } from './messages';
export { emptyDiffData, parseUnifiedDiff } from './model';
export type { DiffData, DiffFile, DiffFileStatus, DiffHunk, DiffLine, DiffLineKind } from './model';
export { SUGGEST_CHANGE } from './suggestions';

import { DpkDiff } from './element';

export const defineDiff = (): void => {
  if (!customElements.get('dpk-diff')) customElements.define('dpk-diff', DpkDiff);
};
