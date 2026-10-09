import { describe, expect, it } from 'vitest';

import { IDLE_MODE, cardModeOf, modeConcerns, reduceCardIntent, type UsmUiMode } from './ui-mode';

describe('usm ui mode', () => {
  const commenting: UsmUiMode = { kind: 'commenting', storyId: 'u1' };

  it('toggles the composer per card and keeps only one card active', () => {
    expect(reduceCardIntent(IDLE_MODE, 'u1', { kind: 'toggle-comment' })).toEqual(commenting);
    expect(reduceCardIntent(commenting, 'u1', { kind: 'toggle-comment' })).toEqual(IDLE_MODE);
    expect(reduceCardIntent(commenting, 'u2', { kind: 'toggle-comment' })).toEqual({
      kind: 'commenting',
      storyId: 'u2',
    });
  });

  it('returns to idle once the card comments, dismisses or is deleted', () => {
    expect(reduceCardIntent(commenting, 'u1', { kind: 'comment', body: 'hi' })).toEqual(IDLE_MODE);
    expect(reduceCardIntent(commenting, 'u1', { kind: 'dismiss' })).toEqual(IDLE_MODE);
    expect(reduceCardIntent(commenting, 'u1', { kind: 'delete' })).toEqual(IDLE_MODE);
  });

  it('leaves the mode alone for another card or a plain select', () => {
    expect(reduceCardIntent(commenting, 'u2', { kind: 'dismiss' })).toBe(commenting);
    expect(reduceCardIntent(commenting, 'u2', { kind: 'delete' })).toBe(commenting);
    expect(reduceCardIntent(commenting, 'u1', { kind: 'select' })).toBe(commenting);
  });

  it('projects the mode onto a single card', () => {
    expect(cardModeOf(commenting, 'u1')).toBe('commenting');
    expect(cardModeOf(commenting, 'u2')).toBe('view');
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
