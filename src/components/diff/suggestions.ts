import * as v from 'valibot';

import type { ElementActionResult } from '../../core/element-actions';
import type { DraftAction } from '../../core/types';
import type { DiffMessages } from './messages';

import { elementRefSegments } from '../../core/board-model';
import { lineIdOf, type DiffData, type DiffLine } from './model';

/**
 * A reader's suggested change to one line, the way GitHub's ```suggestion
 * blocks work: the text that should stand in place of a line of the new
 * file. It is a `SUGGEST_CHANGE` element action in the enclosing view's
 * draft, so it travels with the hand-off and the diff shows it under its line.
 */
export const SUGGEST_CHANGE = 'SUGGEST_CHANGE';

const suggestionPayload = v.strictObject({ text: v.string() });

export type Suggestion = {
  readonly action: string;
  /** What should replace the line: any number of lines, none to delete it. */
  readonly text: string;
};

/** The key of one line within the diff, as `suggestionsByLine` uses it. */
export const lineKey = (path: string, line: string): string => `${path}\n${line}`;

/**
 * Replays the suggestions over the diff: each lands on its line when that
 * line is still in the diff on the new side, and is stale otherwise. Pure.
 */
export const replaySuggestions = (
  m: DiffMessages,
  data: DiffData,
  actions: readonly DraftAction[],
): {
  readonly byLine: ReadonlyMap<string, readonly Suggestion[]>;
  readonly results: readonly ElementActionResult[];
} => {
  const lines = new Map<string, DiffLine>(
    data.files.flatMap((file) =>
      file.hunks.flatMap((hunk) => hunk.lines.map((line) => [lineKey(file.path, lineIdOf(line)), line] as const)),
    ),
  );
  const byLine = new Map<string, Suggestion[]>();
  const results = actions.map((action): ElementActionResult => {
    if (action.type !== SUGGEST_CHANGE) return { id: action.id, title: action.type, stale: 'unsupported-action-type' };
    const segments = elementRefSegments(action.target.id);
    const [, kind, path, line] = segments ?? [];
    const title = m.suggestTitle(path ?? action.target.id, line?.startsWith('R') ? line.slice(1) : (line ?? ''));
    const payload = v.safeParse(suggestionPayload, action.payload);
    if (kind !== 'line' || path === undefined || line === undefined || !line.startsWith('R')) {
      return { id: action.id, title, stale: 'target-missing' };
    }
    if (!payload.success) return { id: action.id, title, stale: 'constraint-violated' };
    const key = lineKey(path, line);
    if (!lines.has(key)) return { id: action.id, title, stale: 'target-missing' };
    byLine.set(key, [...(byLine.get(key) ?? []), { action: action.id, text: payload.output.text }]);
    return { id: action.id, title, summary: payload.output.text, tone: 'update' };
  });
  return { byLine, results };
};
