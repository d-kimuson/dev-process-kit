import { describe, expect, it } from 'vitest';

import { usmMessages } from './messages';
import {
  canonicalMilestoneTab,
  milestoneFilterOf,
  presentMilestoneTabs,
  rowVisible,
  UNASSIGNED_TAB,
} from './milestone-tabs';
import { parseUsmBase } from './model';
import { resolveUsmNavigation } from './present';

const m = usmMessages('en');

const state = parseUsmBase({
  activities: [{ id: 'a1', name: 'A1', steps: [{ id: 's1', name: 'S1' }] }],
  milestones: [
    { id: 'mvp', name: 'MVP' },
    { id: 'v1', name: 'v1' },
  ],
  stories: [
    { id: 'u1', name: 'U1', activityId: 'a1', stepId: 's1', milestoneId: 'mvp' },
    { id: 'u2', name: 'U2', activityId: 'a1', stepId: 's1', milestoneId: 'mvp' },
    { id: 'u3', name: 'U3', activityId: 'a1', stepId: 's1' },
  ],
});

describe('milestone tabs', () => {
  it('reads the selected slice from navigation, defaulting to every milestone', () => {
    expect(milestoneFilterOf(state, {})).toEqual({ kind: 'all' });
    expect(milestoneFilterOf(state, { milestone: 'v1' })).toEqual({ kind: 'milestone', id: 'v1' });
    expect(milestoneFilterOf(state, { milestone: UNASSIGNED_TAB })).toEqual({ kind: 'unassigned' });
    // a milestone that no longer exists (deleted by the draft) falls back to all
    expect(milestoneFilterOf(state, { milestone: 'gone' })).toEqual({ kind: 'all' });
  });

  it('offers All, one tab per milestone in map order, and Unassigned, with story counts', () => {
    const tabs = presentMilestoneTabs(m, state, { milestone: 'mvp' });
    expect(tabs.map(({ label, count, selected, value }) => ({ label, count, selected, value }))).toEqual([
      { label: m.allMilestonesTab, count: 3, selected: false, value: null },
      { label: 'MVP', count: 2, selected: true, value: 'mvp' },
      { label: 'v1', count: 0, selected: false, value: 'v1' },
      { label: m.unassigned, count: 1, selected: false, value: UNASSIGNED_TAB },
    ]);
    expect(presentMilestoneTabs(m, state, {})[0]?.selected).toBe(true);
  });

  it('shows every row under All and only the chosen slice otherwise', () => {
    expect(rowVisible({ kind: 'all' }, 'mvp')).toBe(true);
    expect(rowVisible({ kind: 'all' }, undefined)).toBe(true);
    expect(rowVisible({ kind: 'milestone', id: 'mvp' }, 'mvp')).toBe(true);
    expect(rowVisible({ kind: 'milestone', id: 'mvp' }, 'v1')).toBe(false);
    expect(rowVisible({ kind: 'milestone', id: 'mvp' }, undefined)).toBe(false);
    expect(rowVisible({ kind: 'unassigned' }, undefined)).toBe(true);
    expect(rowVisible({ kind: 'unassigned' }, 'mvp')).toBe(false);
  });

  it('canonicalizes the milestone key of the navigation', () => {
    expect(canonicalMilestoneTab(state, 'v1')).toBe('v1');
    expect(canonicalMilestoneTab(state, UNASSIGNED_TAB)).toBe(UNASSIGNED_TAB);
    expect(canonicalMilestoneTab(state, 'gone')).toBeUndefined();
    expect(canonicalMilestoneTab(state, undefined)).toBeUndefined();
    expect(resolveUsmNavigation(state, { milestone: 'gone' })).not.toHaveProperty('milestone');
    expect(resolveUsmNavigation(state, { milestone: 'v1' })).toMatchObject({ milestone: 'v1' });
  });
});
