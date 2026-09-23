import { describe, expect, it } from 'vitest';

import { IDLE_MODE, cardModeOf, modeConcerns, reduceCardIntent, type UsmUiMode } from './ui-mode';

describe('usm ui mode', () => {
  const editing: UsmUiMode = { kind: 'editing', storyId: 'u1' };
  const commenting: UsmUiMode = { kind: 'commenting', storyId: 'u1' };

  it('toggles editing per card and keeps only one card active', () => {
    expect(reduceCardIntent(IDLE_MODE, 'u1', { kind: 'toggle-edit' })).toEqual(editing);
    expect(reduceCardIntent(editing, 'u1', { kind: 'toggle-edit' })).toEqual(IDLE_MODE);
    expect(reduceCardIntent(editing, 'u2', { kind: 'toggle-edit' })).toEqual({ kind: 'editing', storyId: 'u2' });
    expect(reduceCardIntent(commenting, 'u1', { kind: 'toggle-edit' })).toEqual(editing);
  });

  it('toggles the composer the same way', () => {
    expect(reduceCardIntent(IDLE_MODE, 'u1', { kind: 'toggle-comment' })).toEqual(commenting);
    expect(reduceCardIntent(commenting, 'u1', { kind: 'toggle-comment' })).toEqual(IDLE_MODE);
    expect(reduceCardIntent(editing, 'u1', { kind: 'toggle-comment' })).toEqual(commenting);
  });

  it('returns to idle once the card commits, comments, dismisses or is deleted', () => {
    expect(reduceCardIntent(editing, 'u1', { kind: 'rename', name: 'X' })).toEqual(IDLE_MODE);
    expect(reduceCardIntent(commenting, 'u1', { kind: 'comment', body: 'hi' })).toEqual(IDLE_MODE);
    expect(reduceCardIntent(commenting, 'u1', { kind: 'dismiss' })).toEqual(IDLE_MODE);
    expect(reduceCardIntent(editing, 'u1', { kind: 'delete' })).toEqual(IDLE_MODE);
  });

  it('leaves the mode alone for another card or a plain select', () => {
    expect(reduceCardIntent(editing, 'u2', { kind: 'dismiss' })).toBe(editing);
    expect(reduceCardIntent(editing, 'u2', { kind: 'delete' })).toBe(editing);
    expect(reduceCardIntent(editing, 'u1', { kind: 'select' })).toBe(editing);
  });

  it('projects the mode onto a single card', () => {
    expect(cardModeOf(editing, 'u1')).toBe('editing');
    expect(cardModeOf(editing, 'u2')).toBe('view');
    expect(cardModeOf(commenting, 'u1')).toBe('commenting');
    expect(cardModeOf(IDLE_MODE, 'u1')).toBe('view');
    const picking: UsmUiMode = {
      kind: 'picking-step',
      storyId: 'u1',
      activityId: 'a2',
      milestoneId: undefined,
      point: { x: 0, y: 0 },
    };
    expect(cardModeOf(picking, 'u1')).toBe('view');
    expect(modeConcerns(picking, 'u1')).toBe(true);
  });
});
