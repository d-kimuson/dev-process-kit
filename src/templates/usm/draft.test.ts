import { describe, expect, it } from 'vitest';

import { DraftController } from '../../core/controller';
import { usmAction } from './actions';
import { usmDefinitionFor } from './definition';
import { resolveCellDrop } from './drop';
import { parseUsmBase } from './model';

// Stories of different cells interleave, as they do in a hand-written base.
const base = parseUsmBase({
  title: 'Map',
  activities: [
    {
      id: 'a1',
      name: 'A1',
      steps: [
        { id: 's1', name: 'S1' },
        { id: 's2', name: 'S2' },
      ],
    },
  ],
  milestones: [{ id: 'mvp', name: 'MVP' }],
  stories: [
    { id: 'u1', name: 'U1', activityId: 'a1', stepId: 's1', milestoneId: 'mvp' },
    { id: 'u2', name: 'U2', activityId: 'a1', stepId: 's2', milestoneId: 'mvp' },
    { id: 'u3', name: 'U3', activityId: 'a1', stepId: 's1', milestoneId: 'mvp' },
  ],
});

const controller = () => new DraftController({ definition: usmDefinitionFor('en'), base, storage: null });

describe('usm draft', () => {
  it('cancels a story moved to another cell and back', () => {
    const c = controller();
    const cell = (stepId: string) => ({ activityId: 'a1', stepId, milestoneId: 'mvp' });
    expect(c.dispatch(resolveCellDrop(c.derivation.state, cell('s2'), 'u1', 'u2', 'after')).ok).toBe(true);
    expect(c.actions).toHaveLength(1);
    expect(c.dispatch(resolveCellDrop(c.derivation.state, cell('s1'), 'u1', 'u3', 'before')).ok).toBe(true);
    expect(c.actions).toEqual([]);
  });

  it('swaps neighbouring stories in a cell from either half of the hovered card', () => {
    const c = controller();
    const cell = { activityId: 'a1', stepId: 's1', milestoneId: 'mvp' };
    const input = resolveCellDrop(c.derivation.state, cell, 'u1', 'u3', 'before');
    expect(input.payload.after).toBe('u3');
    expect(c.dispatch(input).ok).toBe(true);
    expect(c.derivation.state.stories.filter((s) => s.stepId === 's1').map((s) => s.id)).toEqual(['u3', 'u1']);
  });

  it('keeps a story moved away and back to a different position', () => {
    const c = controller();
    const cell = (stepId: string) => ({ activityId: 'a1', stepId, milestoneId: 'mvp' });
    c.dispatch(resolveCellDrop(c.derivation.state, cell('s2'), 'u1', 'u2', 'after'));
    c.dispatch(resolveCellDrop(c.derivation.state, cell('s1'), 'u1', 'u3', 'after'));
    expect(c.actions).toHaveLength(1);
  });

  it('cancels a story added and deleted again, with its edits', () => {
    const c = controller();
    c.dispatch({
      type: 'ADD_STORY',
      target: { type: 'step', id: 's1' },
      payload: { id: 'new-story', name: 'New', activityId: 'a1', milestoneId: 'mvp' },
    });
    c.dispatch({ type: 'SET_STORY_NAME', target: { type: 'story', id: 'new-story' }, payload: { name: 'Renamed' } });
    c.dispatch({ type: 'DELETE_STORY', target: { type: 'story', id: 'new-story' }, payload: {} });
    expect(c.actions).toEqual([]);
  });

  it('cancels an activity added with its step and stories, then deleted', () => {
    const c = controller();
    c.dispatch({ type: 'ADD_ACTIVITY', target: { type: 'page', id: 'usm' }, payload: { id: 'a2', name: 'A2' } });
    c.dispatch({ type: 'ADD_STEP', target: { type: 'activity', id: 'a2' }, payload: { id: 's3', name: 'S3' } });
    c.dispatch({
      type: 'ADD_STORY',
      target: { type: 'step', id: 's3' },
      payload: { id: 'u4', name: 'U4', activityId: 'a2' },
    });
    c.dispatch(usmAction.setActivityName('a2', 'Renamed'));
    c.dispatch({ type: 'DELETE_ACTIVITY', target: { type: 'activity', id: 'a2' }, payload: {} });
    expect(c.actions).toEqual([]);
  });

  it('keeps the deletion of a base story, dropping the edits it hides', () => {
    const c = controller();
    c.dispatch({ type: 'SET_STORY_NAME', target: { type: 'story', id: 'u1' }, payload: { name: 'Renamed' } });
    c.dispatch({ type: 'DELETE_STORY', target: { type: 'story', id: 'u1' }, payload: {} });
    expect(c.actions.map((action) => action.type)).toEqual(['DELETE_STORY']);
  });
});
