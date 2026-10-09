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
    const cards = presentMilestoneOverview(state, 'None');
    expect(cards.map((card) => [card.id, card.ordinal, card.name, card.storyCount, card.share])).toEqual([
      ['mvp', 1, 'MVP', 3, 0.75],
      ['v1', 2, 'v1', 0, 0],
    ]);
    expect(cards[0]).toMatchObject({ timeframe: '2026-10', description: 'Minimum feature set' });
    expect(cards[1]).toMatchObject({ timeframe: '', description: '' });
  });

  it('counts how many backbone steps a milestone walks through', () => {
    const [mvp, v1] = presentMilestoneOverview(state, 'None');
    expect(mvp?.coverage).toEqual({ covered: 2, total: 3 });
    expect(v1?.coverage).toEqual({ covered: 0, total: 3 });
  });

  it('reports no progress while the map has no statuses', () => {
    const [mvp] = presentMilestoneOverview(state, 'None');
    expect(mvp?.progress).toEqual([]);
  });

  it('spreads a milestone over the statuses, in workflow order, then the stories without one', () => {
    const withStatuses = parseUsmBase({
      activities: [{ id: 'find', name: 'Find', steps: [{ id: 'search', name: 'Search' }] }],
      milestones: [{ id: 'mvp', name: 'MVP' }],
      statuses: [
        { id: 'idea', name: 'Idea' },
        { id: 'done', name: 'Done', tone: 'green' },
      ],
      stories: [
        { id: 'u1', name: 'A', activityId: 'find', stepId: 'search', milestoneId: 'mvp', statusId: 'done' },
        { id: 'u2', name: 'B', activityId: 'find', stepId: 'search', milestoneId: 'mvp' },
        { id: 'u3', name: 'C', activityId: 'find', stepId: 'search', milestoneId: 'mvp', statusId: 'done' },
      ],
    });
    const [mvp] = presentMilestoneOverview(withStatuses, 'None');
    expect(mvp?.progress.map((part) => [part.id, part.tone, part.progress, part.count])).toEqual([
      ['done', 'green', 1, 2],
      [null, null, undefined, 1],
    ]);
  });

  it('has no share to report on an empty map', () => {
    const empty = parseUsmBase({ milestones: [{ id: 'mvp', name: 'MVP' }] });
    expect(presentMilestoneOverview(empty, 'None')).toMatchObject([{ id: 'mvp', storyCount: 0, share: 0 }]);
  });
});
