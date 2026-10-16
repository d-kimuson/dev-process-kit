// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';

import type { DpkTemplateUsm } from './element';

import '../../index';
import { usmDefinitionFor } from './definition';
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
  features: ['estimates'],
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

  it('shows every story until a filter is on, the finished ones once the reader shows them', () => {
    expect(isFiltered(mapFilterOf(state, { done: 'show' }))).toBe(false);
    expect(shown({ done: 'show' })).toEqual(['a', 'b', 'c']);
  });

  it('leaves the finished stories out until the reader shows them', () => {
    expect(isFiltered(mapFilterOf(state, {}))).toBe(false);
    expect(shown({})).toEqual(['a', 'c']);
    expect(shown({ done: 'yes' })).toEqual(['a', 'c']);
    // While they are out, the last status cannot be chosen either.
    expect([...mapFilterOf(state, { status: 'done' }).status]).toEqual([]);
    expect(shown({ status: 'done', done: 'show' })).toEqual(['b']);
    // A map with a single status has no stories to leave out.
    const single = parseUsmBase({
      activities: [{ id: 'a1', name: 'A1', steps: [{ id: 's1', name: 'S1' }] }],
      statuses: [{ id: 'only', name: 'Only' }],
      stories: [story('x', {})],
    });
    const filter = mapFilterOf(single, {});
    expect(single.stories.filter((each) => passesMapFilter(filter, each)).map((each) => each.id)).toEqual(['x']);
  });

  it('ORs the choices of one filter and ANDs the filters', () => {
    expect(shown({ status: 'idea' })).toEqual(['a', 'c']);
    expect(shown({ label: 'pdm', done: 'show' })).toEqual(['b']);
    expect(shown({ label: `pdm,${NO_VALUE}`, done: 'show' })).toEqual(['b', 'c']);
    expect(shown({ estimate: NO_VALUE })).toEqual(['c']);
    expect(shown({ status: 'idea', label: 'dev' })).toEqual(['a']);
    expect(isFiltered(mapFilterOf(state, { estimate: 's' }))).toBe(true);
  });

  it('drops unknown ids and keeps the choices in map order', () => {
    const filter = mapFilterOf(state, { status: 'done,nope,idea', label: 'nope', done: 'show' });
    expect(mapFilterParam(state, 'status', filter.status)).toBe('idea,done');
    expect(mapFilterParam(state, 'label', filter.label)).toBeNull();
    expect(mapFilterParam(state, 'estimate', toggleFilterValue(filter.estimate, NO_VALUE))).toBe(NO_VALUE);
    expect([...toggleFilterValue(new Set(['s']), 's')]).toEqual([]);
  });
});

describe('usm map filter: the finished stories', () => {
  const definition = usmDefinitionFor('en');

  const settle = async (el: DpkTemplateUsm): Promise<void> => {
    await el.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 0));
    await el.updateComplete;
  };

  const mount = async (hash: string): Promise<DpkTemplateUsm> => {
    window.location.hash = hash;
    document.body.innerHTML = `
      <dpk-template-usm storage="memory" lang="en">
        <script type="application/json">${JSON.stringify({
          activities: [{ id: 'a1', name: 'A1', steps: [{ id: 's1', name: 'S1' }] }],
          statuses: [
            { id: 'idea', name: 'Idea' },
            { id: 'done', name: 'Done' },
          ],
          stories: [story('a', { statusId: 'idea' }), story('b', { statusId: 'done' })],
        })}</script>
      </dpk-template-usm>`;
    const el = document.querySelector('dpk-template-usm') as DpkTemplateUsm;
    await el.api.ready;
    await settle(el);
    return el;
  };

  const cards = (el: DpkTemplateUsm): readonly (string | null)[] =>
    [...el.shadowRoot!.querySelectorAll('dpk-internal-usm-story-card')].map((card) => card.getAttribute('data-story'));

  beforeEach(() => {
    window.location.hash = '';
    document.body.innerHTML = '';
  });

  it('keeps the finished stories off the map until the toolbar’s checkbox shows them', async () => {
    const el = await mount('');
    expect(cards(el)).toEqual(['a']);
    const checkbox = () =>
      el.shadowRoot!.querySelector(
        '[data-testid="usm-map-toolbar"] input[type="checkbox"][data-show-finished]',
      ) as HTMLInputElement;
    expect(checkbox().checked).toBe(false);
    expect(checkbox().closest('label')?.textContent?.replace(/\s+/g, ' ').trim()).toBe('Show Done 1');
    // the status filter does not offer what is out of sight
    (el.shadowRoot!.querySelector('[data-filter-trigger="status"]') as HTMLButtonElement).click();
    await settle(el);
    expect(
      [...el.shadowRoot!.querySelectorAll('#filter-menu [data-option]')].map((option) =>
        option.getAttribute('data-option'),
      ),
    ).toEqual(['', 'idea']);

    checkbox().click();
    await settle(el);
    expect(el.api.navigation['done']).toBe('show');
    expect(checkbox().checked).toBe(true);
    expect(cards(el)).toEqual(['a', 'b']);

    checkbox().click();
    await settle(el);
    expect(el.api.navigation).not.toHaveProperty('done');
    expect(cards(el)).toEqual(['a']);
  });

  it('keeps only a valid "show" in the navigation, and shows them when a change brings a finished story on screen', () => {
    expect(definition.resolveNavigation(state, { done: 'show' })['done']).toBe('show');
    expect(definition.resolveNavigation(state, { done: 'yes' })).not.toHaveProperty('done');
    expect(definition.navigationFor?.(state, { type: 'story', id: 'b' })).toMatchObject({ done: 'show' });
    expect(definition.navigationFor?.(state, { type: 'story', id: 'a' })).not.toHaveProperty('done');
  });
});
