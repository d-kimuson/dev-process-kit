// @vitest-environment node
import { describe, expect, it } from 'vitest';

import type { DraftAction } from '../../core/types';

import { applyUsmAction } from './apply';
import { usmDefinitionFor } from './definition';
import { usmMessages } from './messages';
import { allUsmIds, parseUsmBase, type UsmState } from './model';

const m = usmMessages('en');
const definition = usmDefinitionFor('en');

const raw = {
  activities: [{ id: 'a1', name: 'A1', steps: [{ id: 's1', name: 'S1' }] }],
  stories: [
    {
      id: 'u1',
      name: 'U1',
      activityId: 'a1',
      stepId: 's1',
      comments: [{ id: 'c1', body: 'Agreed with legal', createdAt: '2026-10-01T09:00:00Z' }],
    },
    { id: 'u2', name: 'U2', activityId: 'a1', stepId: 's1' },
  ],
};

const base = parseUsmBase(raw);
const target = { type: 'story', id: 'u2' };

const act = (type: string, actionTarget: { type: string; id: string }, payload: unknown): DraftAction => {
  return { id: 'x', type, target: actionTarget, payload, createdAt: '2026-01-01T00:00:00Z' };
};

const apply = (state: UsmState, type: string, actionTarget: { type: string; id: string }, payload: unknown) => {
  return applyUsmAction(state, act(type, actionTarget, payload));
};

const commentsOf = (state: UsmState | null, id: string) => state?.stories.find((story) => story.id === id)?.comments;

describe('usm story comments: model', () => {
  it('keeps the comments a story carries as part of the map', () => {
    expect(commentsOf(base, 'u1')).toEqual([
      { id: 'c1', body: 'Agreed with legal', createdAt: '2026-10-01T09:00:00Z' },
    ]);
    expect(base.stories.find((story) => story.id === 'u2')).not.toHaveProperty('comments');
  });

  it('rejects a blank comment and a comment id used twice, even on another story', () => {
    const story = raw.stories[1]!;
    expect(() =>
      parseUsmBase({ ...raw, stories: [raw.stories[0], { ...story, comments: [{ id: 'c2', body: '' }] }] }),
    ).toThrow();
    expect(() =>
      parseUsmBase({ ...raw, stories: [raw.stories[0], { ...story, comments: [{ id: 'c1', body: 'again' }] }] }),
    ).toThrow(/duplicate id "c1"/);
  });

  it('counts comment ids among the ids a new entity must not take', () => {
    expect(allUsmIds(base)).toContain('c1');
  });
});

describe('usm story comments: actions', () => {
  it('adds a comment once at the end of the story and deletes it again', () => {
    const payload = { id: 'c2', body: 'Ship behind a flag', createdAt: '2026-10-02T10:00:00.000Z' };
    const added = apply(base, 'ADD_STORY_COMMENT', target, payload);
    expect(commentsOf(added, 'u2')).toEqual([payload]);
    expect(apply(added!, 'ADD_STORY_COMMENT', target, payload)).toBe(added);
    const second = apply(added!, 'ADD_STORY_COMMENT', target, { id: 'c3', body: 'and log it' });
    expect(commentsOf(second, 'u2')?.map((comment) => comment.id)).toEqual(['c2', 'c3']);

    const removed = apply(added!, 'DELETE_STORY_COMMENT', target, { commentId: 'c2' });
    expect(removed?.stories.find((story) => story.id === 'u2')).not.toHaveProperty('comments');
    expect(apply(base, 'DELETE_STORY_COMMENT', target, { commentId: 'c2' })).toBeNull();
  });

  it('refuses a blank comment, an unknown story and an id the map already uses', () => {
    expect(apply(base, 'ADD_STORY_COMMENT', target, { id: 'c2', body: '  ' })).toBeNull();
    expect(apply(base, 'ADD_STORY_COMMENT', { type: 'story', id: 'ghost' }, { id: 'c2', body: 'hi' })).toBeNull();
    expect(apply(base, 'ADD_STORY_COMMENT', target, { id: 'c1', body: 'hi' })).toBeNull();
  });

  it('describes the comment it adds or deletes by its text', () => {
    expect(
      definition.describe(act('ADD_STORY_COMMENT', target, { id: 'c2', body: 'Ship behind a flag' }), base, base),
    ).toMatchObject({ title: m.addStoryComment, summary: '+ “Ship behind a flag”' });
    expect(
      definition.describe(act('DELETE_STORY_COMMENT', { type: 'story', id: 'u1' }, { commentId: 'c1' }), base, base),
    ).toMatchObject({ title: m.deleteStoryComment, summary: '− “Agreed with legal”' });
  });
});
