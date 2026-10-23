/**
 * Layout/position state: where a reader dragged a diagram node to, as an
 * absolute override on top of the computed layout. This is its own layer-1
 * concept, separate from the draft (what the reader asked the agent to
 * change) and from navigation state (what the reader is looking at): it never
 * leaves the reader's browser, and it is never part of the hand-off.
 *
 * Only moved nodes are stored, keyed by page/board/diagram/node id, so an
 * unmoved node always follows the layout the agent's data produces. A stored
 * node that no longer exists in a diagram's current data (the agent removed
 * or renamed it) is pruned rather than kept around or resurrected.
 */
import type { LayoutPoint } from '../lib/layout/layered';

export type PositionRef = {
  readonly board: string;
  readonly diagram: string;
  readonly node: string;
};

export type PositionOverride = PositionRef & { readonly position: LayoutPoint };

export type PositionState = {
  readonly v: 1;
  readonly overrides: readonly PositionOverride[];
};

export const EMPTY_POSITION_STATE: PositionState = { v: 1, overrides: [] };

/** Dispatched on `window` after a reader moves a node, so other instances can react. */
export const LAYOUT_CHANGE_EVENT = 'dpk-layout-change';

const sameRef = (a: PositionRef, b: PositionRef): boolean =>
  a.board === b.board && a.diagram === b.diagram && a.node === b.node;

/** Sets (or replaces) the absolute position a reader dragged one node to. */
export const setPosition = (state: PositionState, ref: PositionRef, position: LayoutPoint): PositionState => ({
  ...state,
  overrides: [...state.overrides.filter((entry) => !sameRef(entry, ref)), { ...ref, position }],
});

export const positionOf = (state: PositionState, ref: PositionRef): LayoutPoint | null =>
  state.overrides.find((entry) => sameRef(entry, ref))?.position ?? null;

/** Sets several absolute positions at once (e.g. dragging an aggregate group moves every member together). */
export const setPositions = (state: PositionState, entries: readonly PositionOverride[]): PositionState =>
  entries.reduce((acc, entry) => setPosition(acc, entry, entry.position), state);

/** The overrides that apply to one board's diagram, keyed by node id, for a layout merge. */
export const positionsFor = (state: PositionState, board: string, diagram: string): ReadonlyMap<string, LayoutPoint> =>
  new Map(
    state.overrides
      .filter((entry) => entry.board === board && entry.diagram === diagram)
      .map((entry) => [entry.node, entry.position]),
  );

export const hasOverridesFor = (state: PositionState, board: string, diagram: string): boolean =>
  state.overrides.some((entry) => entry.board === board && entry.diagram === diagram);

/**
 * Drops every override for one board's diagram (its "reset positions" context-menu item).
 * Returns the same reference when nothing changed, so callers can skip a write.
 */
export const resetDiagram = (state: PositionState, board: string, diagram: string): PositionState => {
  const next = state.overrides.filter((entry) => !(entry.board === board && entry.diagram === diagram));
  return next.length === state.overrides.length ? state : { ...state, overrides: next };
};

/**
 * Drops overrides for nodes that no longer exist in a diagram's current data.
 * Other boards/diagrams are left untouched even if they happen to share a node id.
 * Returns the same reference when nothing changed, so callers can skip a write.
 */
export const pruneMissingNodes = (
  state: PositionState,
  board: string,
  diagram: string,
  existingNodeIds: ReadonlySet<string>,
): PositionState => {
  const next = state.overrides.filter(
    (entry) => !(entry.board === board && entry.diagram === diagram) || existingNodeIds.has(entry.node),
  );
  return next.length === state.overrides.length ? state : { ...state, overrides: next };
};
