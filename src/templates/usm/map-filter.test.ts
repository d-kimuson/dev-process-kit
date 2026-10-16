import { describe, expect, it } from 'vitest';

import {
  filterOptionIds,
  isFiltered,
  mapFilterOf,
  mapFilterParam,
  NO_VALUE,
  passesMapFilter,
  toggleFilterValue,
} from './map-filter';
import { parseUsmBase } from './model';

const story = (id: string, extra: Record<string, unknown>) => ({
  id,
  name: id,
  activityId: 'a1',
  stepId: 's1',
  ...extra,
});

const state = parseUsmBase({
  activities: [{ id: 'a1', name: 'A1', steps: [{ id: 's1', name: 'S1' }] }],
  statuses: [
    { id: 'idea', name: 'Idea' },
    { id: 'done', name: 'Done' },
  ],
  labels: [
    { id: 'dev', name: 'Dev' },
    { id: 'pdm', name: 'PdM' },
  ],
  estimates: [
    { id: 's', name: 'S', points: 1 },
    { id: 'm', name: 'M', points: 3 },
  ],
  stories: [
    story('a', { statusId: 'idea', labelIds: ['dev'], estimateId: 's' }),
    story('b', { statusId: 'done', labelIds: ['dev', 'pdm'], estimateId: 'm' }),
    story('c', { statusId: 'idea' }),
  ],
});

const shown = (nav: Record<string, string>): readonly string[] => {
  const filter = mapFilterOf(state, nav);
  return state.stories.filter((each) => passesMapFilter(filter, each)).map((each) => each.id);
};

describe('usm map filter', () => {
  it('offers every status, and the labels and estimates with a "none" choice last', () => {
    expect(filterOptionIds(state, 'status')).toEqual(['idea', 'done']);
    expect(filterOptionIds(state, 'label')).toEqual(['dev', 'pdm', NO_VALUE]);
    expect(filterOptionIds(state, 'estimate')).toEqual(['s', 'm', NO_VALUE]);
    const bare = parseUsmBase({ activities: [], stories: [] });
    expect(filterOptionIds(bare, 'label')).toEqual([]);
    expect(filterOptionIds(bare, 'estimate')).toEqual([]);
  });

  it('shows every story until a filter is on', () => {
    expect(isFiltered(mapFilterOf(state, {}))).toBe(false);
    expect(shown({})).toEqual(['a', 'b', 'c']);
  });

  it('ORs the choices of one filter and ANDs the filters', () => {
    expect(shown({ status: 'idea' })).toEqual(['a', 'c']);
    expect(shown({ label: 'pdm' })).toEqual(['b']);
    expect(shown({ label: `pdm,${NO_VALUE}` })).toEqual(['b', 'c']);
    expect(shown({ estimate: NO_VALUE })).toEqual(['c']);
    expect(shown({ status: 'idea', label: 'dev' })).toEqual(['a']);
    expect(isFiltered(mapFilterOf(state, { estimate: 's' }))).toBe(true);
  });

  it('drops unknown ids and keeps the choices in map order', () => {
    const filter = mapFilterOf(state, { status: 'done,nope,idea', label: 'nope' });
    expect(mapFilterParam(state, 'status', filter.status)).toBe('idea,done');
    expect(mapFilterParam(state, 'label', filter.label)).toBeNull();
    expect(mapFilterParam(state, 'estimate', toggleFilterValue(filter.estimate, NO_VALUE))).toBe(NO_VALUE);
    expect([...toggleFilterValue(new Set(['s']), 's')]).toEqual([]);
  });
});
