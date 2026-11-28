import { describe, expect, it } from 'vitest';

import type { DraftAction } from './types';

import {
  canRedo,
  canUndo,
  clearRedo,
  EMPTY_UNDO_REDO,
  recordBatch,
  redoStep,
  undoStep,
  type UndoRedoState,
} from './undo-redo';

const action = (id: string): DraftAction => ({
  id,
  type: 'SET_NAME',
  target: { type: 'item', id: 'a' },
  payload: { name: id },
  createdAt: 'now',
});

describe('undo-redo', () => {
  it('undoStep pops the last action onto the redo stack', () => {
    const actions = [action('1'), action('2')];
    const outcome = undoStep(actions, EMPTY_UNDO_REDO);
    expect(outcome).toEqual({
      actions: [action('1')],
      state: { redoStack: [[action('2')]], batches: [] },
    });
  });

  it('undoStep takes a batch back in one step, and redoStep replays it', () => {
    const actions = [action('1'), action('2'), action('3')];
    const state = recordBatch(EMPTY_UNDO_REDO, ['2', '3']);
    const undone = undoStep(actions, state);
    expect(undone).toEqual({ actions: [action('1')], state: { redoStack: [[action('2'), action('3')]], batches: [] } });
    if (undone === null) throw new Error('expected an outcome');
    expect(redoStep(undone.actions, undone.state)).toEqual({ actions, state });
  });

  it('recordBatch keeps a batch of one as an ordinary entry', () => {
    expect(recordBatch(EMPTY_UNDO_REDO, ['1'])).toBe(EMPTY_UNDO_REDO);
  });

  it('undoStep is null when there is nothing to undo', () => {
    expect(undoStep([], EMPTY_UNDO_REDO)).toBeNull();
  });

  it('redoStep replays the most recently undone action', () => {
    const state: UndoRedoState = { redoStack: [[action('2')], [action('3')]], batches: [] };
    const outcome = redoStep([action('1')], state);
    expect(outcome).toEqual({
      actions: [action('1'), action('3')],
      state: { redoStack: [[action('2')]], batches: [] },
    });
  });

  it('redoStep is null when there is nothing to redo', () => {
    expect(redoStep([action('1')], EMPTY_UNDO_REDO)).toBeNull();
  });

  it('round-trips an action through undo then redo', () => {
    const actions = [action('1'), action('2')];
    const undone = undoStep(actions, EMPTY_UNDO_REDO);
    if (undone === null) throw new Error('expected an outcome');
    const redone = redoStep(undone.actions, undone.state);
    expect(redone).toEqual({ actions, state: EMPTY_UNDO_REDO });
  });

  it('clearRedo discards any pending redo history and keeps the batches', () => {
    const batches = [['1', '2']];
    expect(clearRedo({ redoStack: [[action('3')]], batches })).toEqual({ redoStack: [], batches });
  });

  it('canUndo/canRedo reflect the log and the redo stack', () => {
    expect(canUndo([])).toBe(false);
    expect(canUndo([action('1')])).toBe(true);
    expect(canRedo(EMPTY_UNDO_REDO)).toBe(false);
    expect(canRedo({ redoStack: [[action('1')]], batches: [] })).toBe(true);
  });
});
