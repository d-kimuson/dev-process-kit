import { describe, expect, it } from 'vitest';

import { DraftController } from '../../core/controller';
import { exampleMappingDefinition } from './definition';
import { parseExampleMappingBase } from './model';

// Rules of different stories interleave, as they do in a hand-written base.
const base = parseExampleMappingBase({
  title: 'Orders',
  stories: [
    { id: 's1', name: 'Order' },
    { id: 's2', name: 'Pay' },
  ],
  rules: [
    { id: 'r1', storyId: 's1', name: 'In stock only' },
    { id: 'r2', storyId: 's2', name: 'Card only' },
    { id: 'r3', storyId: 's1', name: 'Business hours only' },
  ],
  examples: [{ id: 'e1', ruleId: 'r1', name: 'In stock -> accepted' }],
  questions: [],
});

const controller = () => new DraftController({ definition: exampleMappingDefinition, base, storage: null });

const moveRule = (id: string, storyId: string, after: string | null) => ({
  type: 'MOVE_RULE',
  target: { type: 'rule', id },
  payload: { storyId, after },
});

describe('example mapping draft', () => {
  it('cancels a rule moved to another story and back', () => {
    const c = controller();
    expect(c.dispatch(moveRule('r1', 's2', 'r2')).ok).toBe(true);
    expect(c.actions).toHaveLength(1);
    expect(c.dispatch(moveRule('r1', 's1', null)).ok).toBe(true);
    expect(c.actions).toEqual([]);
  });

  it('cancels a rule added with an example, then deleted', () => {
    const c = controller();
    c.dispatch({ type: 'ADD_RULE', target: { type: 'story', id: 's2' }, payload: { id: 'r4', name: 'New rule' } });
    c.dispatch({ type: 'ADD_EXAMPLE', target: { type: 'rule', id: 'r4' }, payload: { id: 'e2', name: 'New example' } });
    c.dispatch({ type: 'DELETE_RULE', target: { type: 'rule', id: 'r4' }, payload: {} });
    expect(c.actions).toEqual([]);
  });
});
