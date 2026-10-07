import { describe, expect, it } from 'vitest';

import { presentMilestoneOverview } from './milestone-overview';
import { parseUsmBase } from './model';

const state = parseUsmBase({
  activities: [
    {
      id: 'find',
      name: 'Find',
      steps: [
        { id: 'search', name: 'Search' },
        { id: 'compare', name: 'Compare' },
      ],
    },
    { id: 'buy', name: 'Buy', steps: [{ id: 'pay', name: 'Pay' }] },
  ],
  milestones: [
    { id: 'mvp', name: 'MVP', timeframe: ' 2026-10 ', description: 'Minimum feature set' },
    { id: 'v1', name: 'v1' },
  ],
  stories: [
    { id: 'u1', name: 'Keyword', activityId: 'find', stepId: 'search', milestoneId: 'mvp' },
    { id: 'u2', name: 'Card pay', activityId: 'buy', stepId: 'pay', milestoneId: 'mvp' },
    { id: 'u3', name: 'Filters', activityId: 'find', stepId: 'search', milestoneId: 'mvp' },
    { id: 'u4', name: 'Reviews', activityId: 'find', stepId: 'compare' },
  ],
});

describe('milestone overview', () => {
  it('defines every milestone in map order: what it is, when it is due and how big it is', () => {
    const cards = presentMilestoneOverview(state);
    expect(cards.map((card) => [card.id, card.ordinal, card.name, card.storyCount, card.share])).toEqual([
      ['mvp', 1, 'MVP', 3, 0.75],
      ['v1', 2, 'v1', 0, 0],
    ]);
    expect(cards[0]).toMatchObject({ timeframe: '2026-10', description: 'Minimum feature set' });
    expect(cards[1]).toMatchObject({ timeframe: '', description: '' });
  });

  it('counts how many backbone steps a milestone walks through', () => {
    const [mvp, v1] = presentMilestoneOverview(state);
    expect(mvp?.coverage).toEqual({ covered: 2, total: 3 });
    expect(v1?.coverage).toEqual({ covered: 0, total: 3 });
  });

  it('breaks a milestone down by activity, in backbone order, leaving out the activities it skips', () => {
    const [mvp, v1] = presentMilestoneOverview(state);
    expect(mvp?.breakdown).toEqual([
      { activityId: 'find', name: 'Find', count: 2 },
      { activityId: 'buy', name: 'Buy', count: 1 },
    ]);
    expect(v1?.breakdown).toEqual([]);
  });

  it('has no share to report on an empty map', () => {
    const empty = parseUsmBase({ milestones: [{ id: 'mvp', name: 'MVP' }] });
    expect(presentMilestoneOverview(empty)).toMatchObject([{ id: 'mvp', storyCount: 0, share: 0 }]);
  });
});
