// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';

import type { DpkTemplateUsm } from './element';

import '../../index';
import { criticalPathOf, highlightOf, remainingWorkOf } from './critical-path';
import { usmDefinitionFor } from './definition';
import { parseUsmBase } from './model';

const definition = usmDefinitionFor('en');

const story = (id: string, statusId: string, estimateId: string, blockedBy: readonly string[] = []) => ({
  id,
  name: id.toUpperCase(),
  activityId: 'a1',
  stepId: 's1',
  statusId,
  estimateId,
  ...(blockedBy.length === 0 ? {} : { blockedBy }),
});

const base = (stories: readonly object[], features: readonly string[] = ['estimates'], measure?: string) =>
  parseUsmBase({
    features,
    ...(measure === undefined ? {} : { measure }),
    activities: [{ id: 'a1', name: 'A1', steps: [{ id: 's1', name: 'S1' }] }],
    statuses: [
      { id: 'todo', name: 'Todo', weight: 2 },
      { id: 'doing', name: 'Doing' },
      { id: 'done', name: 'Done' },
    ],
    estimates: [
      { id: 'S', name: 'S', points: 1 },
      { id: 'L', name: 'L', points: 5 },
    ],
    stories,
  });

const ids = (state: ReturnType<typeof base>) => criticalPathOf(state).ids;

describe('usm critical path: remaining work', () => {
  const stories = [
    story('u-todo', 'todo', 'L'),
    story('u-doing', 'doing', 'L'),
    story('u-done', 'done', 'L'),
    { id: 'loose', name: 'Loose', activityId: 'a1', stepId: 's1' },
  ];
  const left = (state: ReturnType<typeof base>) => state.stories.map((each) => remainingWorkOf(state, each));
  /** Sums of fractions drift in the last bits; compare them to 9 places. */
  const rounded = (values: readonly number[]) => values.map((value) => Math.round(value * 1e9) / 1e9);

  it('counts the points of every story not finished yet', () => {
    expect(left(base(stories))).toEqual([5, 5, 0, 1]);
  });

  it('weighs a story by the share of its work the statuses it still has to pass hold', () => {
    // Todo 2 and Doing 1: two thirds of a story is done in Todo, one third in Doing.
    expect(rounded(left(base(stories, ['estimates'], 'weighted')))).toEqual(rounded([5, 5 / 3, 0, 1]));
  });

  it('counts each unfinished story as one while the stories are counted or estimates are off', () => {
    expect(left(base(stories, ['estimates'], 'stories'))).toEqual([1, 1, 0, 1]);
    expect(left(base(stories, []))).toEqual([1, 1, 0, 1]);
    // the weights go with the estimates, so they are left out too
    expect(left(base(stories, [], 'weighted'))).toEqual([1, 1, 0, 1]);
  });
});

describe('usm critical path: the longest chain', () => {
  it('follows the chain of waiting stories with the most work left', () => {
    // a → b → c is 1 + 1 + 1; a → d is 1 + 5; e stands alone with 5.
    const state = base([
      story('a', 'todo', 'S'),
      story('b', 'todo', 'S', ['a']),
      story('c', 'todo', 'S', ['b']),
      story('d', 'todo', 'L', ['a']),
      story('e', 'todo', 'L'),
    ]);
    expect(ids(state)).toEqual(new Set(['a', 'd']));
    expect(criticalPathOf(state).work).toBe(6);
  });

  it('keeps every chain that ties for the longest', () => {
    const state = base([story('a', 'todo', 'S'), story('b', 'todo', 'S', ['a']), story('c', 'todo', 'S', ['a'])]);
    expect(ids(state)).toEqual(new Set(['a', 'b', 'c']));
  });

  it('lets a finished story drop out of the chain it was part of', () => {
    const state = base([story('a', 'done', 'L'), story('b', 'todo', 'S', ['a']), story('c', 'todo', 'L')]);
    expect(ids(state)).toEqual(new Set(['c']));
  });

  it('is empty once everything is finished', () => {
    const state = base([story('a', 'done', 'L')]);
    expect(criticalPathOf(state)).toEqual({ ids: new Set(), work: 0 });
  });
});

describe('usm critical path: navigation', () => {
  it('reads the highlight from the navigation and keeps only one it knows', () => {
    const state = base([story('a', 'todo', 'S')]);
    expect(highlightOf({ highlight: 'critical-path' })).toBe('critical-path');
    expect(highlightOf({ highlight: 'nope' })).toBeNull();
    expect(definition.resolveNavigation(state, { highlight: 'critical-path' })['highlight']).toBe('critical-path');
    expect(definition.resolveNavigation(state, { highlight: 'nope' })).not.toHaveProperty('highlight');
  });

  it('drops the highlight when it brings a story on screen, so the story is not dimmed', () => {
    const state = base([story('a', 'todo', 'S')]);
    expect(definition.navigationFor?.(state, { type: 'story', id: 'a' })).toMatchObject({ highlight: null });
  });
});

describe('usm critical path: on the map', () => {
  // a → d is the longest chain; b and e wait on nothing and nobody waits on them.
  const raw = {
    features: ['estimates'],
    activities: [{ id: 'a1', name: 'A1', steps: [{ id: 's1', name: 'S1' }] }],
    statuses: [
      { id: 'todo', name: 'Todo', weight: 2 },
      { id: 'doing', name: 'Doing' },
      { id: 'done', name: 'Done' },
    ],
    estimates: [
      { id: 'S', name: 'S', points: 1 },
      { id: 'L', name: 'L', points: 5 },
    ],
    stories: [
      story('a', 'todo', 'S'),
      story('b', 'todo', 'S'),
      story('d', 'todo', 'L', ['a']),
      story('e', 'done', 'L'),
    ],
  };

  const settle = async (el: DpkTemplateUsm): Promise<void> => {
    await el.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 0));
    await el.updateComplete;
  };

  const mount = async (hash: string): Promise<DpkTemplateUsm> => {
    window.location.hash = hash;
    document.body.innerHTML = `
      <dpk-template-usm storage="memory">
        <script type="application/json">${JSON.stringify(raw)}</script>
      </dpk-template-usm>`;
    const el = document.querySelector('dpk-template-usm') as DpkTemplateUsm;
    await el.api.ready;
    await settle(el);
    return el;
  };

  const highlights = (el: DpkTemplateUsm): Record<string, string | null> =>
    Object.fromEntries(
      [...el.shadowRoot!.querySelectorAll('dpk-internal-usm-story-card')].map((card): [string, string | null] => [
        card.getAttribute('data-story') ?? '',
        card.getAttribute('data-highlight'),
      ]),
    );

  beforeEach(() => {
    window.location.hash = '';
    document.body.innerHTML = '';
  });

  it('highlights the critical path and dims the other cards while the toggle is on', async () => {
    const el = await mount('#done=show');
    expect(highlights(el)).toEqual({ a: null, b: null, d: null, e: null });
    // the toggle sits in the map's toolbar, beside the filters
    const toggle = () =>
      el.shadowRoot!.querySelector(
        '[data-testid="usm-map-toolbar"] [data-highlight-toggle="critical-path"]',
      ) as HTMLButtonElement;
    expect(toggle().getAttribute('aria-pressed')).toBe('false');

    toggle().click();
    await settle(el);
    expect(el.api.navigation['highlight']).toBe('critical-path');
    expect(toggle().getAttribute('aria-pressed')).toBe('true');
    expect(toggle().querySelector('.highlight-count')?.textContent).toBe('2 stories');
    expect(highlights(el)).toEqual({ a: 'on', b: 'dimmed', d: 'on', e: 'dimmed' });

    toggle().click();
    await settle(el);
    expect(el.api.navigation).not.toHaveProperty('highlight');
    expect(highlights(el)).toEqual({ a: null, b: null, d: null, e: null });
  });
});
