import { describe, expect, it } from 'vitest';

import type { DraftAction } from './types';

import { ArtifactController } from './controller';
import { tinyBase, tinyDefinition } from './testing/tiny-template';

const makeController = (actions: readonly DraftAction[] = []) =>
  new ArtifactController({
    definition: tinyDefinition,
    base: tinyBase([
      { id: 'a', name: 'Alpha' },
      { id: 'b', name: 'Beta' },
      { id: 'c', name: 'Gamma' },
    ]),
    storage: null,
    initialActions: actions,
  });

const add = (id: string, name = 'New') => ({
  type: 'ADD_ITEM',
  target: { type: 'artifact', id: 'tiny' },
  payload: { id, name },
});
const rename = (id: string, name: string) => ({ type: 'SET_NAME', target: id, payload: { name } });
const reorder = (id: string, after: string | null) => ({ type: 'REORDER', target: id, payload: { after } });
const remove = (id: string) => ({ type: 'DELETE_ITEM', target: id, payload: {} });

const typesOf = (controller: ArtifactController<unknown>) => controller.actions.map((action) => action.type);

describe('interpretive draft', () => {
  it('cancels an addition that is deleted again', () => {
    const controller = makeController();
    controller.dispatch(add('x'));
    controller.dispatch(remove('x'));
    expect(controller.actions).toEqual([]);
  });

  it('cancels every edit of an entity whose addition is undone', () => {
    const controller = makeController();
    controller.dispatch(add('x'));
    controller.dispatch(rename('x', 'Renamed'));
    controller.dispatch(reorder('x', null));
    controller.dispatch(rename('b', 'Bee'));
    controller.dispatch(remove('x'));
    expect(typesOf(controller)).toEqual(['SET_NAME']);
    expect(controller.actions[0]?.target.id).toBe('b');
  });

  it('cancels a move that is moved back', () => {
    const controller = makeController();
    controller.dispatch(reorder('a', 'c'));
    controller.dispatch(reorder('a', null));
    expect(controller.actions).toEqual([]);
  });

  it('cancels a round trip spread over several moves', () => {
    const controller = makeController();
    controller.dispatch(reorder('a', 'b'));
    controller.dispatch(reorder('a', 'c'));
    controller.dispatch(reorder('a', null));
    expect(controller.actions).toEqual([]);
  });

  it('cancels a move back across unrelated actions and keeps those', () => {
    const controller = makeController();
    controller.dispatch(reorder('a', 'c'));
    controller.dispatch(rename('b', 'Bee'));
    controller.dispatch(reorder('a', null));
    expect(typesOf(controller)).toEqual(['SET_NAME']);
  });

  it('cancels a rename that is renamed back across other actions', () => {
    const controller = makeController();
    controller.dispatch(rename('a', 'A2'));
    controller.dispatch(rename('b', 'Bee'));
    controller.dispatch(rename('a', 'Alpha'));
    expect(controller.actions.map((action) => action.target.id)).toEqual(['b']);
  });

  it('keeps the edits of an entity that are still visible', () => {
    const controller = makeController();
    controller.dispatch(reorder('a', 'c'));
    controller.dispatch(rename('a', 'A2'));
    controller.dispatch(reorder('a', null));
    expect(typesOf(controller)).toEqual(['SET_NAME']);
    expect(controller.derivation.state.items.map((item) => item.name)).toEqual(['A2', 'Beta', 'Gamma']);
  });

  it('drops edits a later deletion makes invisible, but keeps the deletion', () => {
    const controller = makeController();
    controller.dispatch(rename('a', 'A2'));
    controller.dispatch(remove('a'));
    expect(typesOf(controller)).toEqual(['DELETE_ITEM']);
  });

  it('keeps actions that still change the artifact', () => {
    const controller = makeController();
    controller.dispatch(add('x'));
    controller.dispatch(remove('b'));
    expect(typesOf(controller)).toEqual(['ADD_ITEM', 'DELETE_ITEM']);
  });

  it('cancels a batch that a later batch undoes', () => {
    const controller = makeController();
    controller.dispatchBatch([reorder('a', 'c'), reorder('b', 'a')]);
    expect(controller.derivation.state.items.map((item) => item.id)).toEqual(['c', 'a', 'b']);
    controller.dispatchBatch([reorder('a', null), reorder('b', 'a')]);
    expect(controller.actions).toEqual([]);
  });

  it('keeps comments, even on an entity whose addition was cancelled', () => {
    const controller = makeController();
    controller.dispatch(add('x'));
    controller.dispatch({ type: 'comment', target: { type: 'item', id: 'x' }, payload: { body: 'why?' } });
    controller.dispatch(remove('x'));
    expect(typesOf(controller)).toEqual(['comment']);
    expect(controller.derivation.stale.map((entry) => entry.reason)).toEqual(['target-missing']);
  });

  it('never cancels a stale action', () => {
    const controller = makeController();
    controller.dispatch(rename('ghost', 'Boo'));
    controller.dispatch(add('x'));
    controller.dispatch(remove('x'));
    expect(typesOf(controller)).toEqual(['SET_NAME']);
    expect(controller.derivation.stale).toHaveLength(1);
  });

  it('compacts a restored draft', () => {
    const at = '2026-01-01T00:00:00Z';
    const controller = makeController([
      { id: '1', type: 'REORDER', target: { type: 'item', id: 'a' }, payload: { after: 'c' }, createdAt: at },
      { id: '2', type: 'SET_NAME', target: { type: 'item', id: 'b' }, payload: { name: 'Bee' }, createdAt: at },
      { id: '3', type: 'REORDER', target: { type: 'item', id: 'a' }, payload: { after: null }, createdAt: at },
    ]);
    expect(controller.actions.map((action) => action.id)).toEqual(['2']);
  });
});
