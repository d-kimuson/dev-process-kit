import { describe, expect, it } from 'vitest';

import type { DraftAction } from './types';

import { DraftController } from './controller';
import { elementActionsFor, providerOf } from './element-actions';
import { buildAgentBrief } from './export';
import { tinyBase, tinyDefinition } from './testing/tiny-template';

const TOPIC = 'element:map/node/root';
const targets = [{ value: TOPIC, label: 'Root', group: 'Map' }];

const makeController = (initialActions?: readonly DraftAction[]) =>
  new DraftController({
    definition: tinyDefinition,
    base: tinyBase([{ id: 'a', name: 'Alpha' }]),
    storage: null,
    ...(initialActions ? { initialActions } : {}),
  });

const addTopic = (id = 'new') => ({ type: 'ADD_TOPIC', target: TOPIC, payload: { id, label: 'New' } });

// Components own their data: the core stores, orders and lists their actions,
// and the component reports how each one applied.
describe('component element actions', () => {
  it('stores an action on a component element even though the template does not know its type', () => {
    const controller = makeController();
    const outcome = controller.dispatch(addTopic());
    expect(outcome.ok).toBe(true);
    expect(controller.actions[0]).toMatchObject({
      type: 'ADD_TOPIC',
      target: { type: 'element', id: 'map/node/root' },
      payload: { id: 'new', label: 'New' },
    });
    // Nothing reported yet: the owning component is not there.
    expect(controller.derivation.stale.map((entry) => entry.reason)).toEqual(['target-missing']);
    expect(controller.derivation.state).toEqual(controller.base);
  });

  it('rejects malformed component actions', () => {
    const controller = makeController();
    expect(controller.dispatch({ type: 'add-topic', target: TOPIC, payload: {} }).ok).toBe(false);
    expect(controller.dispatch({ type: 'ADD_TOPIC', target: TOPIC, payload: 'x' }).ok).toBe(false);
    expect(controller.actions).toEqual([]);
  });

  it('keeps template vocabulary for template-owned element targets', () => {
    const controller = makeController();
    // `element:a` has no provider segment: it is the template's own target.
    expect(controller.dispatch({ type: 'ADD_TOPIC', target: 'element:a', payload: {} }).ok).toBe(false);
  });

  it('never dedupes: every component action is a step of its own', () => {
    const controller = makeController();
    controller.dispatch(addTopic());
    controller.dispatch(addTopic());
    expect(controller.actions).toHaveLength(2);
  });

  it('uses the results a component reports for applicability and the review list', () => {
    const controller = makeController();
    controller.dispatch(addTopic());
    controller.dispatch(addTopic('other'));
    const [first, second] = controller.actions;
    if (!first || !second) throw new Error('missing actions');
    controller.setComponentSnapshot({
      targets,
      providers: [
        {
          id: 'map',
          results: [
            { id: first.id, title: 'トピックを追加', summary: 'New', tone: 'create' },
            { id: second.id, title: 'トピックを追加', stale: 'constraint-violated' },
          ],
        },
      ],
    });
    expect(controller.derivation.applied.map((action) => action.id)).toEqual([first.id]);
    expect(controller.derivation.stale).toEqual([{ action: second, reason: 'constraint-violated' }]);
    expect(controller.definition.describe(first, controller.derivation.state)).toEqual({
      title: 'トピックを追加',
      summary: 'New',
      tone: 'create',
      targetLabel: 'Map · Root',
    });
    expect(controller.definition.serialize(first)).toBe('ADD_TOPIC element:map/node/root {"id":"new","label":"New"}');
  });

  it('ignores results reported by a component that does not own the action', () => {
    const controller = makeController();
    controller.dispatch(addTopic());
    const [action] = controller.actions;
    if (!action) throw new Error('missing action');
    controller.setComponentSnapshot({
      targets,
      providers: [{ id: 'other', results: [{ id: action.id, title: 'Hijack' }] }],
    });
    expect(controller.derivation.stale[0]?.reason).toBe('target-missing');
  });

  it('restores stored component actions and applies them in batches without changing template state', () => {
    const first = makeController();
    first.dispatch(addTopic());
    const restored = makeController(first.actions);
    expect(restored.actions).toEqual(first.actions);
    restored.setComponentSnapshot({ targets, providers: [] });
    expect(restored.dispatchBatch([addTopic('batched')]).ok).toBe(true);
    expect(restored.dispatchBatch([{ ...addTopic('orphan'), target: 'element:map/node/gone' }]).ok).toBe(false);
    expect(restored.actions).toHaveLength(2);
  });

  it('routes actions to the component that owns the reference', () => {
    const controller = makeController();
    controller.dispatch(addTopic());
    controller.dispatch({ type: 'comment', target: TOPIC, payload: { body: 'note' } });
    controller.dispatch({ ...addTopic(), target: 'element:other%2Fmap/node/root' });
    expect(elementActionsFor(controller.actions, 'map').map((action) => action.type)).toEqual(['ADD_TOPIC']);
    expect(elementActionsFor(controller.actions, 'other/map')).toHaveLength(1);
    expect(providerOf({ type: 'element', id: 'map/node/root' })).toBe('map');
    expect(providerOf({ type: 'element', id: 'root' })).toBeNull();
    expect(providerOf({ type: 'item', id: 'map/x' })).toBeNull();
  });

  it('tells the agent which component JSON a component action changes', () => {
    const controller = makeController();
    controller.dispatch(addTopic());
    const brief = buildAgentBrief(
      {
        base: controller.base,
        state: controller.derivation.state,
        actions: controller.actions,
        comments: controller.derivation.comments,
        stale: controller.derivation.stale,
        issues: [],
        navigation: {},
      },
      controller.definition,
      'test',
    );
    expect(brief).toContain('`element:<id>/…`');
  });
});
