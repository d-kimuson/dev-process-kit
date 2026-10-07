/**
 * The in-place text editor's one decision: what a finished edit commits.
 * Pure, so the textarea in `render/board.ts` stays a dumb field.
 */
import { itemText, type WbItem } from './model';

/** The text to commit for `raw`, or `undefined` when nothing should change. */
export const editedText = (item: WbItem, raw: string): string | undefined => {
  // A frame title is one line, and a frame always has one.
  const next = (item.kind === 'frame' ? raw.replace(/\r?\n/g, ' ') : raw).trim();
  if (item.kind === 'frame' && next === '') return undefined;
  return next === itemText(item) ? undefined : next;
};
