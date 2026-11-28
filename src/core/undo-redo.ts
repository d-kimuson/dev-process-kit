import type { DraftAction } from './types';

/**
 * Undo/redo over the draft log.
 *
 * The draft is a plain log of what the reader did (see the ADR superseding
 * interpretive drafts): undo removes its last step, redo replays the most
 * recently undone one. A step is one entry, or every entry one batch
 * dispatched together (a bulk move, say), since the reader did that in one
 * act. Both stacks are in memory only; everything else (re-deriving state,
 * persisting, notifying) is the controller's job, not this module's.
 */
export type UndoRedoState = {
  /** The steps undo took back, most recent last. */
  readonly redoStack: readonly (readonly DraftAction[])[];
  /** The ids of each batch's entries: undo takes a batch back in one step. */
  readonly batches: readonly (readonly string[])[];
};

export const EMPTY_UNDO_REDO: UndoRedoState = { redoStack: [], batches: [] };

export type UndoOutcome = {
  readonly actions: readonly DraftAction[];
  readonly state: UndoRedoState;
};

/** The ids undo takes back together with the entry `id`: its batch's, or itself alone. */
export const stepOf = (state: UndoRedoState, id: string): readonly string[] =>
  state.batches.find((batch) => batch.includes(id)) ?? [id];

/** Remembers that `ids` were dispatched together. A batch of one is an ordinary entry. */
export const recordBatch = (state: UndoRedoState, ids: readonly string[]): UndoRedoState =>
  ids.length < 2 ? state : { ...state, batches: [...state.batches, ids] };

/** Takes the step of `entry` out of `actions`: the entries removed and the state without that batch. */
export const takeStep = (
  actions: readonly DraftAction[],
  state: UndoRedoState,
  entry: DraftAction,
): { readonly removed: readonly DraftAction[]; readonly state: UndoRedoState } => {
  const ids = new Set(stepOf(state, entry.id));
  return {
    removed: actions.filter((action) => ids.has(action.id)),
    state: { ...state, batches: state.batches.filter((batch) => !batch.includes(entry.id)) },
  };
};

/** Pops the last step off `actions` onto the redo stack. `null` when there is nothing to undo. */
export const undoStep = (actions: readonly DraftAction[], state: UndoRedoState): UndoOutcome | null => {
  const last = actions.at(-1);
  if (last === undefined) return null;
  const taken = takeStep(actions, state, last);
  return {
    actions: actions.filter((action) => !taken.removed.includes(action)),
    state: { ...taken.state, redoStack: [...state.redoStack, taken.removed] },
  };
};

export type RedoOutcome = {
  readonly actions: readonly DraftAction[];
  readonly state: UndoRedoState;
};

/** Replays the most recently undone step back onto `actions`. `null` when there is nothing to redo. */
export const redoStep = (actions: readonly DraftAction[], state: UndoRedoState): RedoOutcome | null => {
  const restored = state.redoStack.at(-1);
  if (restored === undefined) return null;
  const next = recordBatch(
    { ...state, redoStack: state.redoStack.slice(0, -1) },
    restored.map((action) => action.id),
  );
  return { actions: [...actions, ...restored], state: next };
};

/** Anything other than undo/redo itself (a new action, clearing the draft, …) discards redo history. */
export const clearRedo = (state: UndoRedoState): UndoRedoState => ({ ...state, redoStack: [] });

export const canUndo = (actions: readonly DraftAction[]): boolean => actions.length > 0;
export const canRedo = (state: UndoRedoState): boolean => state.redoStack.length > 0;
