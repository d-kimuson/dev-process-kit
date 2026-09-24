import { describe, expect, it, vi } from 'vitest';

import { DraftController } from '../../core/controller';
import { prototypeDefinitionFor } from './definition';
import { findStep, findStory, parsePrototypeBase } from './model';
import { resolvePrototypeNavigation } from './present';

const base = () =>
  parsePrototypeBase({
    activities: ['one', 'two'].map((id) => ({
      id,
      name: id,
      stories: [
        {
          id: 's',
          name: 'S',
          steps: [
            { id: 'x', name: id },
            { id: 'y', name: 'Y' },
          ],
        },
      ],
    })),
  });
const controller = () => new DraftController({ definition: prototypeDefinitionFor('en'), base: base(), storage: null });

describe('qualified prototype references', () => {
  it('rejects ambiguous bare ids and keeps navigation stable across resolution', () => {
    expect(findStory(base(), 's')).toBeUndefined();
    expect(findStep(base(), 'x')).toBeUndefined();
    const nav = resolvePrototypeNavigation(base(), { step: 'two.s.x' });
    expect(nav['step']).toBe('two.s.x');
    expect(resolvePrototypeNavigation(base(), nav)).toEqual(nav);
  });
  it('reorders only the addressed parent, including qualified anchors', () => {
    const c = controller();
    c.dispatch({ type: 'REORDER_STEP', target: 'two.s.y', payload: { after: null } });
    expect(c.derivation.state.activities.map((a) => a.stories[0]?.steps.map((s) => s.id))).toEqual([
      ['x', 'y'],
      ['y', 'x'],
    ]);
  });
  it('moves a step between qualified parents without modifying other same-named stories', () => {
    const c = controller();
    c.dispatch({ type: 'DELETE_STEP', target: 'one.s.x', payload: {} });
    c.dispatch({ type: 'MOVE_STEP', target: 'two.s.x', payload: { toStory: 'one.s', after: null } });
    expect(findStep(c.derivation.state, 'one.s.x')?.step.name).toBe('two');
    expect(findStep(c.derivation.state, 'two.s.x')).toBeUndefined();
    expect(c.derivation.state.activities[1]?.stories[0]?.steps.map((s) => s.id)).toEqual(['y']);
  });
  it('persists normalized preview defaults on dispatch and import', () => {
    const c = controller();
    c.dispatch({ type: 'ADD_PREVIEW', target: 'one.s.x', payload: { id: 'p' } });
    expect(c.actions[0]?.payload).toEqual({ id: 'p', kind: 'browser', viewport: 'fluid' });
    c.replaceActions([
      {
        id: 'imported',
        type: 'ADD_PREVIEW',
        target: { type: 'step', id: 'one.s.x' },
        payload: { id: 'p' },
        createdAt: 'now',
      },
    ]);
    expect(c.actions[0]?.payload).toEqual({ id: 'p', kind: 'browser', viewport: 'fluid' });
  });
  it('validates a batch against the compacted candidate, without partial commit', () => {
    const save = vi.fn();
    const c = new DraftController({
      definition: prototypeDefinitionFor('en'),
      base: parsePrototypeBase({ activities: [{ id: 'a', name: 'A', stories: [{ id: 's', name: 'S' }] }] }),
      storage: { load: () => [], save, clear: vi.fn() },
    });
    const notify = vi.fn();
    c.subscribe(notify);
    const outcome = c.dispatchBatch([
      { type: 'ADD_STEP', target: 'a.s', payload: { id: 'x', name: 'X', previews: [{ id: 'p1' }] } },
      { type: 'ADD_STEP', target: 'a.s', payload: { id: 'x', name: 'X', previews: [{ id: 'p2' }] } },
      { type: 'SET_PREVIEW_LABEL', target: 'p1', payload: { label: 'Updated' } },
    ]);
    expect(outcome.ok).toBe(false);
    expect(c.actions).toEqual([]);
    expect(save).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
  });
  it.each(['b.other.x', 'missing.other.x'])('rejects foreign or nonexistent move/reorder anchors: %s', (after) => {
    const base = parsePrototypeBase({
      activities: [
        {
          id: 'a',
          name: 'A',
          stories: [
            { id: 'source', name: 'Source', steps: [{ id: 'm', name: 'M' }] },
            {
              id: 'dest',
              name: 'Dest',
              steps: [
                { id: 'x', name: 'X' },
                { id: 'y', name: 'Y' },
              ],
            },
          ],
        },
        { id: 'b', name: 'B', stories: [{ id: 'other', name: 'Other', steps: [{ id: 'x', name: 'X' }] }] },
      ],
    });
    const c = new DraftController({ definition: prototypeDefinitionFor('en'), base, storage: null });
    c.dispatch({ type: 'MOVE_STEP', target: 'a.source.m', payload: { toStory: 'a.dest', after } });
    c.dispatch({ type: 'REORDER_STEP', target: 'a.dest.y', payload: { after } });
    expect(c.derivation.state).toEqual(base);
    expect(c.derivation.stale).toHaveLength(2);
    c.clearActions();
    c.dispatch({ type: 'MOVE_STEP', target: 'a.source.m', payload: { toStory: 'a.dest', after: 'a.dest.x' } });
    expect(findStory(c.derivation.state, 'a.dest')?.story.steps.map((s) => s.id)).toEqual(['x', 'm', 'y']);
  });
  it.each(['c.x', 'missing.x'])('rejects story move/reorder anchors from another activity: %s', (after) => {
    const base = parsePrototypeBase({
      activities: [
        { id: 'a', name: 'A', stories: [{ id: 'm', name: 'M' }] },
        {
          id: 'b',
          name: 'B',
          stories: [
            { id: 'x', name: 'X' },
            { id: 'y', name: 'Y' },
          ],
        },
        { id: 'c', name: 'C', stories: [{ id: 'x', name: 'X' }] },
      ],
    });
    const c = new DraftController({ definition: prototypeDefinitionFor('en'), base, storage: null });
    c.dispatch({ type: 'MOVE_STORY', target: 'a.m', payload: { toActivity: 'b', after } });
    c.dispatch({ type: 'REORDER_STORY', target: 'b.y', payload: { after } });
    expect(c.derivation.state).toEqual(base);
    expect(c.derivation.stale).toHaveLength(2);
    c.clearActions();
    c.dispatch({ type: 'MOVE_STORY', target: 'a.m', payload: { toActivity: 'b', after: 'b.x' } });
    expect(c.derivation.state.activities[1]?.stories.map((s) => s.id)).toEqual(['x', 'm', 'y']);
  });
  it('rejects duplicate root ids', () => {
    expect(() =>
      parsePrototypeBase({
        activities: [
          { id: 'a', name: 'A' },
          { id: 'a', name: 'A' },
        ],
      }),
    ).toThrow();
  });
});
