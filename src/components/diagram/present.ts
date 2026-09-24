import type { DiagramMessages } from './messages';

import { tagCounts, type TagState } from './model';

/**
 * Shared chrome view models: the tag filter row and the stats line. Components
 * build these from their own domain data, so the shared view stays domain-free.
 */

export type TagViewModel = {
  readonly tag: string;
  readonly count: number;
  readonly selected: boolean;
};

export const presentTagBar = (items: readonly (readonly string[])[], state: TagState): readonly TagViewModel[] =>
  tagCounts(items).map((entry) => ({
    tag: entry.tag,
    count: entry.count,
    selected: state.active.includes(entry.tag),
  }));

export const presentStats = (
  nodes: number,
  edges: number,
  labels: { readonly node: string; readonly edge: string },
): string => `${nodes} ${labels.node} · ${edges} ${labels.edge}`;

/** `“A” → “B”` style summaries, used by the ERD and the state diagram. */
export const changeSummary = (m: DiagramMessages, before: string, after: string): string => m.change(before, after);
