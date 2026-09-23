import { describe, expect, it, vi } from 'vitest';

import type { DraftAction } from './types';

import { ArtifactController } from './controller';
import { MemoryDraftStorage } from './persistence';
import { tinyBase, tinyDefinition } from './testing/tiny-template';

const makeController = (actions: readonly DraftAction[] = []) => {
  const storage = new MemoryDraftStorage();
  const controller = new ArtifactController({
    definition: tinyDefinition,
    base: tinyBase([
      { id: 'a', name: 'Alpha' },
      { id: 'b', name: 'Beta' },
    ]),
    storage,
    storageKey: 'test',
    initialActions: actions,
  });
  return { controller, storage };
};

describe('ArtifactController', () => {
  it.each([null, {}, 0, 'invalid'])('rejects a malformed batch envelope: %s', (input) => {
    const { controller } = makeController();
    expect(controller.dispatchBatch(input).ok).toBe(false);
    expect(controller.actions).toEqual([]);
  });
  it('validates before persisting: invalid actions never reach storage', () => {
    const { controller, storage } = makeController();
    const outcome = controller.dispatch({
      type: 'SET_NAME',
      target: 'a',
      payload: {},
    });
    expect(outcome.ok).toBe(false);
    expect(controller.actions).toHaveLength(0);
    expect(storage.load('test', 'tiny')).toHaveLength(0);
  });

  it('rejects unknown action types', () => {
    const { controller } = makeController();
    const outcome = controller.dispatch({
      type: 'NOPE',
      target: 'a',
      payload: {},
    });
    expect(outcome).toEqual({
      ok: false,
      issues: [{ path: 'type', message: 'unknown action type "NOPE"' }],
    });
  });

  it('normalizes a string target with the action target type', () => {
    const { controller } = makeController();
    controller.dispatch({
      type: 'SET_NAME',
      target: 'a',
      payload: { name: 'Renamed' },
    });
    expect(controller.actions[0]?.target).toEqual({ type: 'item', id: 'a' });
    expect(controller.derivation.state.items[0]?.name).toBe('Renamed');
  });

  it('dedupes patch actions per target so the last requested value wins', () => {
    const { controller } = makeController();
    controller.dispatch({
      type: 'SET_NAME',
      target: 'a',
      payload: { name: 'One' },
    });
    controller.dispatch({
      type: 'SET_NAME',
      target: 'a',
      payload: { name: 'Two' },
    });
    controller.dispatch({
      type: 'SET_NAME',
      target: 'b',
      payload: { name: 'Bee' },
    });
    expect(controller.actions).toHaveLength(2);
    expect(controller.actions.map((action) => action.type)).toEqual(['SET_NAME', 'SET_NAME']);
    expect(controller.derivation.state.items.map((item) => item.name)).toEqual(['Two', 'Bee']);
  });

  it('drops patches the base already reflects and reports the count', () => {
    const { controller } = makeController();
    controller.dispatch({
      type: 'SET_NAME',
      target: 'a',
      payload: { name: 'Alpha' },
    });
    expect(controller.actions).toHaveLength(0);
    expect(controller.prunedCount).toBe(1);
  });

  it('keeps inapplicable actions but marks them stale instead of applying them', () => {
    const { controller } = makeController();
    controller.dispatch({
      type: 'SET_NAME',
      target: 'ghost',
      payload: { name: 'Boo' },
    });
    expect(controller.actions).toHaveLength(1);
    expect(controller.derivation.stale).toHaveLength(1);
    expect(controller.derivation.stale[0]?.reason).toBe('target-missing');
    expect(controller.derivation.state.items).toHaveLength(2);
  });

  it('treats comments as draft actions that need a live target', () => {
    const { controller } = makeController();
    controller.dispatch({
      type: 'comment',
      target: 'item:a',
      payload: { body: 'rename me' },
    });
    controller.dispatch({
      type: 'comment',
      target: 'item:ghost',
      payload: { body: 'gone' },
    });
    expect(controller.derivation.comments).toHaveLength(1);
    expect(controller.derivation.stale[0]?.reason).toBe('target-missing');
    expect(controller.derivation.commentsByTarget.get('item:a')).toHaveLength(1);
  });

  it('notifies subscribers on every draft mutation', () => {
    const { controller } = makeController();
    const listener = vi.fn();
    controller.subscribe(listener);
    controller.dispatch({
      type: 'SET_NAME',
      target: 'a',
      payload: { name: 'X' },
    });
    expect(listener).toHaveBeenCalledTimes(1);
    const id = controller.actions[0]?.id ?? '';
    controller.removeAction(id);
    expect(listener).toHaveBeenCalledTimes(2);
    controller.clearActions();
    expect(listener).toHaveBeenCalledTimes(2); // already empty
  });

  it('round-trips drafts through storage', () => {
    const { controller, storage } = makeController();
    controller.dispatch({
      type: 'SET_NAME',
      target: 'a',
      payload: { name: 'Persisted' },
    });

    const restored = new ArtifactController({
      definition: tinyDefinition,
      base: tinyBase([{ id: 'a', name: 'Alpha' }]),
      storage,
      storageKey: 'test',
    });
    expect(restored.actions).toHaveLength(1);
    expect(restored.derivation.state.items[0]?.name).toBe('Persisted');
  });

  it('ignores stored drafts written by another template', () => {
    const storage = new MemoryDraftStorage();
    storage.save('test', 'other-template', [
      {
        id: 'x',
        type: 'SET_NAME',
        target: { type: 'item', id: 'a' },
        payload: { name: 'nope' },
        createdAt: 'now',
      },
    ]);
    const controller = new ArtifactController({
      definition: tinyDefinition,
      base: tinyBase([{ id: 'a', name: 'Alpha' }]),
      storage,
      storageKey: 'test',
    });
    expect(controller.actions).toHaveLength(0);
  });

  it('drops malformed restored actions', () => {
    const { controller } = makeController([
      {
        id: 'ok',
        type: 'SET_NAME',
        target: { type: 'item', id: 'a' },
        payload: { name: 'Fine' },
        createdAt: 'now',
      },
      {
        id: 'bad',
        type: 'SET_NAME',
        target: { type: 'item', id: 'a' },
        payload: {},
        createdAt: 'now',
      },
      {
        id: 'unknown',
        type: 'WHAT',
        target: { type: 'item', id: 'a' },
        payload: {},
        createdAt: 'now',
      },
    ]);
    expect(controller.actions.map((action) => action.id)).toEqual(['ok']);
  });

  it('rejects a prototype-inherited action name instead of crashing', () => {
    const { controller } = makeController();
    // `actions['toString']` must not reach Object.prototype and return a function.
    const outcome = controller.dispatch({ type: 'toString', target: 'a', payload: {} });
    expect(outcome.ok).toBe(false);
    expect(controller.actions).toHaveLength(0);
  });

  it('rejects a malformed target instead of throwing', () => {
    const { controller } = makeController();
    const outcome = controller.dispatch({
      type: 'SET_NAME',
      target: null as never,
      payload: { name: 'X' },
    });
    expect(outcome.ok).toBe(false);
    expect(outcome.ok ? [] : outcome.issues.map((issue) => issue.path)).toEqual(['target']);
    expect(controller.actions).toHaveLength(0);
  });

  it('drops a restored draft whose action name is inherited from Object', () => {
    const { controller } = makeController([
      {
        id: 'proto',
        type: 'toString',
        target: { type: 'item', id: 'a' },
        payload: {},
        createdAt: 'now',
      },
    ]);
    expect(controller.actions).toHaveLength(0);
    expect(controller.derivation.stale).toHaveLength(0);
  });

  it('preserves the order of interdependent reorders', () => {
    const controller = new ArtifactController({
      definition: tinyDefinition,
      base: tinyBase(['a', 'b', 'c'].map((id) => ({ id, name: id }))),
      storage: null,
    });
    controller.dispatch({ type: 'REORDER', target: 'c', payload: { after: null } });
    controller.dispatch({ type: 'REORDER', target: 'a', payload: { after: 'b' } });
    controller.dispatch({ type: 'REORDER', target: 'c', payload: { after: 'a' } });
    expect(controller.derivation.state.items.map((item) => item.id)).toEqual(['b', 'a', 'c']);
  });

  it('checks comments against the final state and reactivates them after undo', () => {
    const { controller } = makeController();
    controller.dispatch({ type: 'comment', target: 'item:a', payload: { body: 'note' } });
    const deletion = controller.dispatch({ type: 'DELETE_ITEM', target: 'a', payload: {} });
    expect(controller.derivation.comments).toHaveLength(0);
    expect(controller.derivation.stale).toHaveLength(1);
    if (deletion.ok) controller.removeAction(deletion.id);
    expect(controller.derivation.comments).toHaveLength(1);
  });

  it('validates completely untrusted dispatch and import values', () => {
    const { controller } = makeController();
    expect(controller.dispatch(null).ok).toBe(false);
    expect(() => controller.replaceActions([null, 1, {}])).not.toThrow();
    expect(controller.actions).toEqual([]);
  });

  it('commits a batch once and rejects partially applicable batches atomically', () => {
    const { controller, storage } = makeController();
    const listener = vi.fn();
    const save = vi.spyOn(storage, 'save');
    controller.subscribe(listener);
    expect(
      controller.dispatchBatch([
        { type: 'SET_NAME', target: 'a', payload: { name: 'A2' } },
        { type: 'SET_NAME', target: 'b', payload: { name: 'B2' } },
      ]).ok,
    ).toBe(true);
    expect(save).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledTimes(1);
    const before = controller.actions;
    expect(
      controller.dispatchBatch([
        { type: 'SET_NAME', target: 'a', payload: { name: 'A3' } },
        { type: 'SET_NAME', target: 'missing', payload: { name: 'Ghost' } },
      ]).ok,
    ).toBe(false);
    expect(controller.actions).toBe(before);
    expect(save).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('can disable persistence entirely', () => {
    const controller = new ArtifactController({
      definition: tinyDefinition,
      base: tinyBase([{ id: 'a', name: 'Alpha' }]),
      storage: null,
      storageKey: 'test',
    });
    controller.dispatch({
      type: 'SET_NAME',
      target: 'a',
      payload: { name: 'Volatile' },
    });
    expect(controller.actions).toHaveLength(1);
    expect(controller.exportDraft('0.0.0').actions).toHaveLength(1);
  });
});
