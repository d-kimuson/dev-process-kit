import type { DiagramMessages } from './messages';

/**
 * Shared chrome view models: the stats line. Components
 * build these from their own domain data, so the shared view stays domain-free.
 */

export const presentStats = (
  nodes: number,
  edges: number,
  labels: { readonly node: string; readonly edge: string },
): string => `${nodes} ${labels.node} · ${edges} ${labels.edge}`;

/** `“A” → “B”` style summaries, used by the ERD and the state diagram. */
export const changeSummary = (m: DiagramMessages, before: string, after: string): string => m.change(before, after);
