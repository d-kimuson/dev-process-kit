import { describe, expect, it } from 'vitest';

import { DraftController } from './controller';
import { diagramBoardDefinition } from './diagram-board';

describe('diagramBoardDefinition', () => {
  it('names and labels the board, and never derives state from its own actions', () => {
    const definition = diagramBoardDefinition({ name: 'erd', label: 'ER Diagram' });
    expect(definition.name).toBe('erd');
    expect(definition.label).toBe('ER Diagram');
    expect(definition.title(definition.emptyBase())).toBe('ER Diagram');
    expect(definition.addable).toBe(false);
    const applied = definition.apply(definition.emptyBase(), {
      id: 'a1',
      type: 'RENAME_COLUMN',
      target: { type: 'element', id: 'erd/column/users.id' },
      payload: {},
      createdAt: new Date().toISOString(),
    });
    expect(applied).toBeNull();
  });

  it('recognizes its own element action targets through the given live snapshot', () => {
    const target = { value: 'element:erd/node/users', label: 'users' };
    const result = { id: 'a1', title: 'Renamed column', tone: 'update' as const };
    const definition = diagramBoardDefinition({
      name: 'erd',
      label: 'ER Diagram',
      commentTargets: () => [target],
      elementActionResults: () => [result],
    });
    expect(definition.hasTarget(definition.emptyBase(), { type: 'element', id: 'erd/node/users' })).toBe(true);
    expect(definition.commentTargets(definition.emptyBase(), {})).toEqual([target]);
    const action = {
      id: 'a1',
      type: 'RENAME_COLUMN',
      target: { type: 'element', id: 'erd/node/users' },
      payload: {},
      createdAt: new Date().toISOString(),
    };
    expect(definition.describe(action, definition.emptyBase()).title).toBe('Renamed column');
  });

  it('drives a DraftController exactly like any other template definition', () => {
    const definition = diagramBoardDefinition({ name: 'erd', label: 'ER Diagram' });
    const controller = new DraftController({ definition, base: definition.emptyBase(), storage: null });
    controller.setComponentSnapshot({
      targets: [{ value: 'element:erd/node/users', label: 'users' }],
      providers: [],
    });
    const outcome = controller.dispatch({
      type: 'RENAME_COLUMN',
      target: 'element:erd/node/users',
      payload: { to: 'id' },
    });
    expect(outcome.ok).toBe(true);
    // Without a provider reporting what this element action did to its own
    // data, the core treats it as stale — the element replaying it is gone.
    expect(controller.derivation.stale).toEqual([{ action: controller.actions[0], reason: 'target-missing' }]);
    controller.setComponentSnapshot({
      targets: [{ value: 'element:erd/node/users', label: 'users' }],
      providers: [{ id: 'erd', results: [{ id: outcome.ok ? outcome.id : '', title: 'Renamed column' }] }],
    });
    expect(controller.derivation.stale).toEqual([]);
    expect(controller.derivation.applied).toHaveLength(1);
  });
});
