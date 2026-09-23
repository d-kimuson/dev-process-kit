import { describe, expect, it } from 'vitest';

import { ArtifactController } from '../../core/controller';
import { usmDefinition } from './definition';

const make = () =>
  new ArtifactController({
    definition: usmDefinition,
    storage: null,
    base: usmDefinition.parseBase({
      activities: [
        {
          id: 'a',
          name: 'A',
          steps: [
            { id: 's', name: 'S' },
            { id: 't', name: 'T' },
          ],
        },
      ],
    }),
  });
describe('USM target paths', () => {
  it.each(['ADD_ACTIVITY', 'ADD_STEP', 'ADD_STORY', 'ADD_MILESTONE'])('rejects invalid created ids for %s', (type) => {
    const c = make();
    const target = type === 'ADD_STEP' ? 'a' : type === 'ADD_STORY' ? 'a.s' : 'artifact:usm';
    expect(c.dispatch({ type, target, payload: { id: 'bad.id', name: 'Bad', activityId: 'a' } }).ok).toBe(false);
    expect(c.actions).toEqual([]);
  });
  it('renames, reorders and deletes a qualified step', () => {
    const c = make();
    c.dispatch({ type: 'SET_STEP_NAME', target: 'a.s', payload: { name: 'Renamed' } });
    expect(c.derivation.state.activities[0]?.steps[0]?.name).toBe('Renamed');
    c.dispatch({ type: 'REORDER_STEP', target: 'a.s', payload: { after: 'a.t' } });
    expect(c.derivation.state.activities[0]?.steps.map((s) => s.id)).toEqual(['t', 's']);
    c.dispatch({ type: 'DELETE_STEP', target: 'a.s', payload: {} });
    expect(c.derivation.state.activities[0]?.steps.map((s) => s.id)).toEqual(['t']);
  });
  it('stores canonical action targets but local ids in the meaning model', () => {
    const c = make();
    c.dispatch({ type: 'ADD_STORY', target: 'a.s', payload: { id: 'u', name: 'U', activityId: 'a' } });
    expect(c.derivation.state.stories[0]?.stepId).toBe('s');
    c.dispatch({
      type: 'MOVE_STORY',
      target: 'u',
      payload: { activityId: 'a', stepId: 'a.t', milestoneId: null, after: null },
    });
    expect(c.derivation.state.stories[0]?.stepId).toBe('t');
    c.dispatch({ type: 'SET_STEP_NAME', target: 's', payload: { name: 'Updated' } });
    expect(c.actions.at(-1)?.target.id).toBe('a.s');
  });
});
