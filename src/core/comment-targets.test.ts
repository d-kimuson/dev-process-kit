import { describe, expect, it } from 'vitest';

import { DraftController } from './controller';
import { tinyDefinition } from './testing/tiny-template';

// External components contribute targets, never template state or actions.
describe('component comment targets', () => {
  it('preserves template-owned element targets and labels when providers appear or disappear', () => {
    const native = { value: 'element:n1', label: 'Native note' };
    const definition = {
      ...tinyDefinition,
      hasTarget: (_state: unknown, target: { type: string; id: string }) =>
        target.type === 'element' && target.id === 'n1',
      commentTargets: () => [native],
      describe: () => ({ title: 'Comment', targetLabel: 'Native note', tone: 'comment' }) as const,
    };
    const controller = new DraftController({ definition, base: tinyDefinition.emptyBase(), storage: null });
    controller.dispatch({ type: 'comment', target: 'element:n1', payload: { body: 'Keep this note' } });
    controller.setComponentSnapshot({
      targets: [
        { value: 'element:schema/node/users', label: 'Users' },
        { value: 'element:n1', label: 'Impostor' },
      ],
      providers: [],
    });
    expect(controller.derivation.stale).toEqual([]);
    expect(
      controller.definition.commentTargets(controller.base, {}).filter((option) => option.value === native.value),
    ).toEqual([native]);
    const action = controller.actions[0];
    if (!action) throw new Error('missing comment');
    expect(controller.definition.describe(action, controller.base).targetLabel).toBe('Native note');
    controller.setComponentSnapshot({ targets: [], providers: [] });
    expect(controller.derivation.comments).toHaveLength(1);
  });
  it('shares validation, persistence and stale handling with template comments', () => {
    const controller = new DraftController({
      definition: tinyDefinition,
      base: tinyDefinition.emptyBase(),
      storage: null,
    });
    controller.setComponentSnapshot({
      targets: [{ value: 'element:schema/node/users', label: 'Users', group: 'Schema' }],
      providers: [],
    });
    expect(
      controller.dispatchBatch([
        { type: 'comment', target: 'element:schema/node/users', payload: { body: 'Review this' } },
      ]).ok,
    ).toBe(true);
    expect(controller.derivation.comments).toHaveLength(1);
    expect(controller.definition.commentTargets(controller.base, {})).toContainEqual({
      value: 'element:schema/node/users',
      label: 'Users',
      group: 'Schema',
    });
    const action = controller.actions[0];
    if (!action) throw new Error('missing comment');
    expect(controller.definition.describe(action, controller.base).targetLabel).toBe('Schema · Users');
    controller.setComponentSnapshot({ targets: [], providers: [] });
    expect(controller.derivation.stale[0]?.reason).toBe('target-missing');
    expect(controller.actions).toHaveLength(1);
    controller.setComponentSnapshot({
      targets: [{ value: 'element:schema/node/users', label: 'Users', group: 'Schema' }],
      providers: [],
    });
    expect(controller.derivation.comments).toHaveLength(1);
    expect(controller.derivation.stale).toEqual([]);
  });
});
