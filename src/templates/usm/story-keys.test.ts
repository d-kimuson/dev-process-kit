import { describe, expect, it } from 'vitest';

import { DraftController } from '../../core/controller';
import { usmDefinitionFor } from './definition';
import { dependencyChoices } from './dependency-choices';
import { parseUsmBase } from './model';
import { resolveUsmNavigation } from './present';
import { findStoryByRef, storyKey } from './story-key';

const usmDefinition = usmDefinitionFor('en');

const activities = [{ id: 'a', name: 'A', steps: [{ id: 's', name: 'S' }] }];
const story = (id: string, number?: number) => ({
  id,
  name: id.toUpperCase(),
  activityId: 'a',
  stepId: 's',
  ...(number === undefined ? {} : { number }),
});

describe('USM story keys', () => {
  it('keeps the number the base gives a story and shows it as STORY-n', () => {
    const state = parseUsmBase({ activities, stories: [story('u', 7)] });
    expect(state.stories[0]?.number).toBe(7);
    expect(storyKey(state.stories[0]!)).toBe('STORY-7');
  });

  it('numbers the stories the base leaves unnumbered after the highest number, in base order', () => {
    const state = parseUsmBase({ activities, stories: [story('u'), story('v', 4), story('w')] });
    expect(state.stories.map((s) => s.number)).toEqual([5, 4, 6]);
  });

  it('rejects a number two stories share, and a number that is not a positive integer', () => {
    expect(() => parseUsmBase({ activities, stories: [story('u', 1), story('v', 1)] })).toThrow(/number 1/);
    expect(() => parseUsmBase({ activities, stories: [story('u', 0)] })).toThrow();
    expect(() => parseUsmBase({ activities, stories: [story('u', 1.5)] })).toThrow();
  });

  it('finds a story by its id or by its key, the id first', () => {
    const state = parseUsmBase({ activities, stories: [story('u', 2), story('STORY-9', 3)] });
    expect(findStoryByRef(state, 'u')?.id).toBe('u');
    expect(findStoryByRef(state, 'STORY-2')?.id).toBe('u');
    expect(findStoryByRef(state, 'story-2')?.id).toBe('u');
    expect(findStoryByRef(state, 'STORY-9')?.id).toBe('STORY-9');
    expect(findStoryByRef(state, 'STORY-4')).toBeUndefined();
    expect(findStoryByRef(state, undefined)).toBeUndefined();
  });

  it('opens the story a navigation names by its key, canonicalized to its id', () => {
    const state = parseUsmBase({ activities, stories: [story('u', 2)] });
    expect(resolveUsmNavigation(state, { story: 'STORY-2' })['story']).toBe('u');
  });

  it('offers a story in the dependency picker by its key', () => {
    const state = parseUsmBase({ activities, stories: [story('u', 1), story('v', 12)] });
    expect(dependencyChoices(state, 'u', 'blocker', 'story-12').map((c) => c.story.id)).toEqual(['v']);
    expect(dependencyChoices(state, 'u', 'blocker', 'STORY-3')).toEqual([]);
  });

  it('gives an added story the number its action carries, or the next free one', () => {
    const c = new DraftController({
      definition: usmDefinition,
      storage: null,
      base: parseUsmBase({ activities, stories: [story('u', 3)] }),
    });
    c.dispatch({ type: 'ADD_STORY', target: 'a.s', payload: { id: 'v', name: 'V', activityId: 'a', number: 8 } });
    c.dispatch({ type: 'ADD_STORY', target: 'a.s', payload: { id: 'w', name: 'W', activityId: 'a', number: 3 } });
    c.dispatch({ type: 'ADD_STORY', target: 'a.s', payload: { id: 'x', name: 'X', activityId: 'a' } });
    expect(c.derivation.state.stories.map((s) => [s.id, s.number])).toEqual([
      ['u', 3],
      ['v', 8],
      ['w', 9],
      ['x', 10],
    ]);
  });
});
