import { describe, expect, it } from 'vitest';

import { usmTabOf } from './board-tabs';
import { parseUsmBase } from './model';
import { resolveUsmNavigation } from './present';

const state = parseUsmBase({
  activities: [{ id: 'a1', name: 'A1', steps: [{ id: 's1', name: 'S1' }] }],
  milestones: [{ id: 'mvp', name: 'MVP' }],
});

describe('usm tabs', () => {
  it('reads the tab from navigation, defaulting to the map', () => {
    expect(usmTabOf({})).toBe('map');
    expect(usmTabOf({ tab: 'milestones' })).toBe('milestones');
    expect(usmTabOf({ tab: 'unknown' })).toBe('map');
  });

  it('keeps only the milestones tab in the navigation; the map is the default', () => {
    expect(resolveUsmNavigation(state, { tab: 'milestones' })).toMatchObject({ tab: 'milestones' });
    expect(resolveUsmNavigation(state, { tab: 'map' })).not.toHaveProperty('tab');
    expect(resolveUsmNavigation(state, { tab: 'unknown' })).not.toHaveProperty('tab');
  });
});
