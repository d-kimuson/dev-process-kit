import type { DraftAction } from './types';

/**
 * Undo/redo over the draft log.
 *
 * The draft is a plain log of what the reader did (see the ADR superseding
 * interpretive drafts): undo removes its last entry, redo replays the most
 * recently undone one. This is a stack of removed entries, most recent last;
 * everything else (re-deriving state, persisting, notifying) is the
 * controller's job, not this module's.
 */
export type UndoRedoState = {
  readonly redoStack: readonly DraftAction[];
};

export const EMPTY_UNDO_REDO: UndoRedoState = { redoStack: [] };

export type UndoOutcome = {
  readonly actions: readonly DraftAction[];
  readonly state: UndoRedoState;
};

/** Pops the last entry off `actions` onto the redo stack. `null` when there is nothing to undo. */
export const undoStep = (actions: readonly DraftAction[], state: UndoRedoState): UndoOutcome | null => {
  const removed = actions.at(-1);
  if (removed === undefined) return null;
  return { actions: actions.slice(0, -1), state: { redoStack: [...state.redoStack, removed] } };
};

export type RedoOutcome = {
  readonly actions: readonly DraftAction[];
  readonly state: UndoRedoState;
};

/** Replays the most recently undone entry back onto `actions`. `null` when there is nothing to redo. */
export const redoStep = (actions: readonly DraftAction[], state: UndoRedoState): RedoOutcome | null => {
  const restored = state.redoStack.at(-1);
  if (restored === undefined) return null;
  return { actions: [...actions, restored], state: { redoStack: state.redoStack.slice(0, -1) } };
};

/** Anything other than undo/redo itself (a new action, clearing the draft, …) discards redo history. */
export const clearRedo = (): UndoRedoState => EMPTY_UNDO_REDO;

export const canUndo = (actions: readonly DraftAction[]): boolean => actions.length > 0;
export const canRedo = (state: UndoRedoState): boolean => state.redoStack.length > 0;
