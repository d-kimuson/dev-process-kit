// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';

import type { DraftAction } from '../../core/types';
import type { DpkTemplateUsm } from './element';

import '../../index';
import { applyUsmAction } from './apply';
import { usmDefinitionFor } from './definition';
import { usmMessages } from './messages';
import { parseUsmBase, type UsmState } from './model';
import { presentStatusOverview } from './status-overview';
import { statusDistribution } from './status-view';

const m = usmMessages('en');
const definition = usmDefinitionFor('en');

const raw = {
  activities: [{ id: 'a1', name: 'A1', steps: [{ id: 's1', name: 'S1' }] }],
  milestones: [{ id: 'mvp', name: 'MVP' }],
  statuses: [
    { id: 'idea', name: 'Idea' },
    { id: 'ready', name: 'Ready', tone: 'amber' },
    { id: 'done', name: 'Done', tone: 'green' },
  ],
  stories: [
    { id: 'u1', name: 'U1', activityId: 'a1', stepId: 's1', milestoneId: 'mvp', statusId: 'done' },
    { id: 'u2', name: 'U2', activityId: 'a1', stepId: 's1', milestoneId: 'mvp', statusId: 'ready' },
    { id: 'u3', name: 'U3', activityId: 'a1', stepId: 's1', statusId: 'done' },
    { id: 'u4', name: 'U4', activityId: 'a1', stepId: 's1' },
  ],
};

const base = parseUsmBase(raw);

const act = (type: string, target: { type: string; id: string }, payload: unknown): DraftAction => {
  return { id: 'x', type, target, payload, createdAt: '2026-01-01T00:00:00Z' };
};

const apply = (state: UsmState, type: string, target: { type: string; id: string }, payload: unknown) => {
  return applyUsmAction(state, act(type, target, payload));
};

describe('usm statuses: model', () => {
  it('fills a missing tone from the palette by position and keeps an authored one', () => {
    expect(base.statuses.map((status) => [status.id, status.tone])).toEqual([
      ['idea', 'gray'],
      ['ready', 'amber'],
      ['done', 'green'],
    ]);
  });

  it('starts a story without a status at the first status, so no story stands nowhere', () => {
    expect(base.stories.find((story) => story.id === 'u4')?.statusId).toBe('idea');
  });

  it('defaults to no statuses, so an existing map parses unchanged', () => {
    expect(parseUsmBase({ ...raw, statuses: undefined, stories: [] }).statuses).toEqual([]);
  });

  it('rejects a story with an unknown status, an unknown tone and an id clash', () => {
    expect(() =>
      parseUsmBase({ ...raw, stories: [{ id: 'u9', name: 'U', activityId: 'a1', stepId: 's1', statusId: 'nope' }] }),
    ).toThrow(/unknown statusId/);
    expect(() => parseUsmBase({ ...raw, statuses: [{ id: 'x', name: 'X', tone: 'pink' }] })).toThrow();
    expect(() => parseUsmBase({ ...raw, statuses: [{ id: 'mvp', name: 'Clash' }] })).toThrow(/duplicate id/);
  });
});

describe('usm statuses: actions', () => {
  it('sets a story status and never clears it', () => {
    const set = apply(base, 'SET_STORY_STATUS', { type: 'story', id: 'u4' }, { statusId: 'done' });
    expect(set?.stories.find((story) => story.id === 'u4')?.statusId).toBe('done');
    expect(apply(base, 'SET_STORY_STATUS', { type: 'story', id: 'u1' }, { statusId: null })).toBeNull();
    expect(apply(base, 'SET_STORY_STATUS', { type: 'story', id: 'u1' }, { statusId: 'nope' })).toBeNull();
  });

  it('gives every story a status once the map has one, and a new story the first status', () => {
    const plain = parseUsmBase({
      ...raw,
      statuses: [],
      stories: raw.stories.map(({ statusId: _s, ...story }) => story),
    });
    const first = apply(plain, 'ADD_STATUS', { type: 'page', id: 'usm' }, { id: 'todo', name: 'Todo', tone: 'gray' });
    expect(first?.stories.map((story) => story.statusId)).toEqual(['todo', 'todo', 'todo', 'todo']);
    const added = apply(base, 'ADD_STORY', { type: 'step', id: 's1' }, { id: 'u5', name: 'U5', activityId: 'a1' });
    expect(added?.stories.at(-1)?.statusId).toBe('idea');
  });

  it('adds, renames, recolors and reorders statuses', () => {
    let state = apply(base, 'ADD_STATUS', { type: 'page', id: 'usm' }, { id: 'doing', name: 'Doing', tone: 'blue' });
    expect(state?.statuses.at(-1)).toEqual({ id: 'doing', name: 'Doing', tone: 'blue', icon: 'progress' });
    state = apply(state!, 'SET_STATUS_ICON', { type: 'status', id: 'doing' }, { icon: 'play' });
    expect(state?.statuses.at(-1)?.icon).toBe('play');
    expect(apply(state!, 'SET_STATUS_ICON', { type: 'status', id: 'doing' }, { icon: 'rocket' })).toBeNull();
    state = apply(state!, 'SET_STATUS_NAME', { type: 'status', id: 'doing' }, { name: 'In progress' });
    state = apply(state!, 'SET_STATUS_TONE', { type: 'status', id: 'doing' }, { tone: 'violet' });
    state = apply(state!, 'REORDER_STATUS', { type: 'status', id: 'doing' }, { after: 'ready' });
    expect(state?.statuses.map((status) => [status.id, status.name, status.tone])).toEqual([
      ['idea', 'Idea', 'gray'],
      ['ready', 'Ready', 'amber'],
      ['doing', 'In progress', 'violet'],
      ['done', 'Done', 'green'],
    ]);
    expect(apply(base, 'SET_STATUS_TONE', { type: 'status', id: 'idea' }, { tone: 'pink' })).toBeNull();
  });

  it('moves the stories of a deleted status to the first status left, and drops statuses with the last one', () => {
    const state = apply(base, 'DELETE_STATUS', { type: 'status', id: 'done' }, {});
    expect(state?.statuses.map((status) => status.id)).toEqual(['idea', 'ready']);
    expect(state?.stories.map((story) => story.statusId)).toEqual(['idea', 'ready', 'idea', 'idea']);
    let only = apply(base, 'DELETE_STATUS', { type: 'status', id: 'ready' }, {});
    only = apply(only!, 'DELETE_STATUS', { type: 'status', id: 'done' }, {});
    only = apply(only!, 'DELETE_STATUS', { type: 'status', id: 'idea' }, {});
    expect(only?.stories.every((story) => story.statusId === undefined)).toBe(true);
  });

  it('describes a status change by the status names', () => {
    const description = definition.describe(
      act('SET_STORY_STATUS', { type: 'story', id: 'u4' }, { statusId: 'ready' }),
      base,
      base,
    );
    expect(description).toMatchObject({ title: m.changeStoryStatus, targetLabel: 'Story · U4', summary: '→ Ready' });
    expect(
      definition.describe(act('SET_STATUS_TONE', { type: 'status', id: 'ready' }, { tone: 'blue' }), base, base),
    ).toMatchObject({ targetLabel: 'Status · Ready', summary: '“Amber” → “Blue”' });
  });

  it('lists statuses as comment targets and keeps the statuses tab in navigation', () => {
    expect(definition.commentTargets(base, {}).filter((option) => option.group === m.statusGroup)).toHaveLength(3);
    expect(definition.resolveNavigation(base, { tab: 'statuses' })['tab']).toBe('statuses');
  });
});

describe('usm story links', () => {
  const story = { id: 'u9', name: 'U', activityId: 'a1', stepId: 's1' };

  it('accepts web links only, each URL once per story', () => {
    expect(() => parseUsmBase({ ...raw, stories: [{ ...story, links: [{ url: 'javascript:alert(1)' }] }] })).toThrow();
    const twice = [{ url: 'https://example.com/a' }, { url: 'https://example.com/a', label: 'A' }];
    expect(() => parseUsmBase({ ...raw, stories: [{ ...story, links: twice }] })).toThrow(/same URL twice/);
  });

  it('adds a link once and removes it again', () => {
    const target = { type: 'story', id: 'u1' };
    const url = 'https://acme.atlassian.net/browse/SHOP-1';
    const added = apply(base, 'ADD_STORY_LINK', target, { url, label: 'Spec' });
    expect(added?.stories.find((s) => s.id === 'u1')?.links).toEqual([{ url, label: 'Spec' }]);
    expect(apply(added!, 'ADD_STORY_LINK', target, { url })).toBe(added);
    expect(apply(base, 'ADD_STORY_LINK', target, { url: 'file:///etc/passwd' })).toBeNull();
    const removed = apply(added!, 'REMOVE_STORY_LINK', target, { url });
    expect(removed?.stories.find((s) => s.id === 'u1')).not.toHaveProperty('links');
    expect(apply(base, 'REMOVE_STORY_LINK', target, { url })).toBeNull();
    expect(definition.describe(act('ADD_STORY_LINK', target, { url }), base, base)).toMatchObject({
      title: m.addStoryLink,
      summary: '+ “acme.atlassian.net SHOP-1”',
    });
  });
});

describe('usm statuses: distribution', () => {
  it('spreads stories over the statuses in workflow order, leaving out the empty ones', () => {
    expect(statusDistribution(base, base.stories).map((part) => [part.id, part.progress, part.count])).toEqual([
      ['idea', 0, 1],
      ['ready', 0.5, 1],
      ['done', 1, 2],
    ]);
    expect(statusDistribution(base, base.stories.slice(0, 2)).map((part) => part.id)).toEqual(['ready', 'done']);
    expect(statusDistribution({ ...base, statuses: [] }, base.stories)).toEqual([]);
  });
});

describe('usm statuses: overview', () => {
  it('counts the stories per status', () => {
    const overview = presentStatusOverview(base);
    expect(overview.rows.map((row) => [row.id, row.storyCount, row.previousId, row.nextId])).toEqual([
      ['idea', 1, null, 'ready'],
      ['ready', 1, 'idea', 'done'],
      ['done', 2, 'ready', null],
    ]);
    expect(overview.rows[2]?.share).toBe(0.5);
  });
});

describe('usm statuses: element', () => {
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
    await el.updateComplete;
    await Promise.resolve();
    await el.updateComplete;
    return el;
  };

  beforeEach(() => {
    window.location.hash = '';
    document.body.innerHTML = '';
  });

  it('colors cards by status and edits a story in the panel a click opens', async () => {
    const el = await mount('');
    const root = el.shadowRoot!;
    const card = root.querySelector('dpk-internal-usm-story-card[data-story="u4"]') as HTMLElement & {
      updateComplete: Promise<boolean>;
    };
    expect(root.querySelector('dpk-internal-usm-story-card[data-story="u1"]')?.getAttribute('style')).toContain(
      '--dpk-green',
    );
    expect(card.getAttribute('style')).toContain('--dpk-ink-faint');
    // no status name on the card: the icon carries it, the filter is the legend
    expect(card.shadowRoot!.textContent).not.toContain('Idea');
    expect(card.shadowRoot!.querySelector('.card-status')?.getAttribute('aria-label')).toBe(m.storyStatusAria('Idea'));
    expect(root.querySelector('[data-testid="usm-story-panel"]')).toBeNull();
    card.click();
    await settle(el);
    const panel = () => root.querySelector('[data-testid="usm-story-panel"]')!;
    expect(panel().getAttribute('data-story')).toBe('u4');
    expect(el.api.navigation['story']).toBe('u4');
    const options = [...panel().querySelectorAll('.sp-status')];
    // a story always stands somewhere: there is no "no status" choice
    expect(options.map((option) => option.textContent?.trim())).toEqual(['Idea', 'Ready', 'Done']);
    expect(options[0]?.getAttribute('aria-checked')).toBe('true');
    (options[1] as HTMLButtonElement).click();
    await settle(el);
    expect(card.getAttribute('style')).toContain('--dpk-amber');
    expect(panel().querySelector('.sp-status[aria-checked="true"]')?.getAttribute('data-status')).toBe('ready');
    // a link: an invalid URL stays in the field, a valid one is added
    const form = panel().querySelector('form.sp-add-link') as HTMLFormElement;
    const input = form.querySelector('input')!;
    input.value = 'javascript:alert(1)';
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    expect(input.getAttribute('aria-invalid')).toBe('true');
    input.value = 'https://github.com/acme/web/issues/86';
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    await settle(el);
    expect(input.value).toBe('');
    expect(el.api.actions.map((action) => [action.type, action.payload])).toEqual([
      ['SET_STORY_STATUS', { statusId: 'ready' }],
      ['ADD_STORY_LINK', { url: 'https://github.com/acme/web/issues/86' }],
    ]);
    await card.updateComplete;
    expect(card.shadowRoot!.querySelector('.link-chip')?.textContent?.trim()).toBe('#86');
    expect(panel().querySelector('.sp-link-text')?.textContent?.trim()).toBe('#86');
    // closing clears the story from the navigation
    (panel().querySelector('[data-role="close"]') as HTMLButtonElement).click();
    await settle(el);
    expect(root.querySelector('[data-testid="usm-story-panel"]')).toBeNull();
    expect(el.api.navigation['story']).toBeUndefined();
  });

  it('filters the grid by status, and the filter doubles as the legend', async () => {
    const el = await mount('#status=done');
    const root = el.shadowRoot!;
    const filter = root.querySelector('[data-testid="usm-status-filter"]')!;
    expect(
      [...filter.querySelectorAll('.filter-chip')].map((chip) => [
        chip.getAttribute('data-status'),
        chip.getAttribute('aria-checked'),
        chip.querySelector('.filter-count')?.textContent,
      ]),
    ).toEqual([
      ['idea', 'false', '1'],
      ['ready', 'false', '1'],
      ['done', 'true', '2'],
    ]);
    const shown = () =>
      [...root.querySelectorAll('dpk-internal-usm-story-card')].map((c) => c.getAttribute('data-story'));
    expect(shown()).toEqual(expect.arrayContaining(['u1', 'u3']));
    expect(shown()).toHaveLength(2);
    // turning another one on keeps the canonical order
    expect(filter.querySelector('[data-status="idea"]')?.getAttribute('href')).toContain('status=idea%2Cdone');
    window.location.hash = '#status=idea,nope';
    await new Promise((resolve) => setTimeout(resolve, 0));
    await el.updateComplete;
    expect(el.api.navigation['status']).toBe('idea');
    expect(shown()).toEqual(['u4']);
  });

  it('shows whose experience an activity is and how far its stories have come', async () => {
    const el = await mount('');
    const head = el.shadowRoot!.querySelector('.act-head[data-activity="a1"]')!;
    expect(
      [...head.querySelectorAll('.status-bar-part')].map((part) => [
        part.getAttribute('data-status'),
        (part as HTMLElement).style.flexGrow,
      ]),
    ).toEqual([
      ['idea', '1'],
      ['ready', '1'],
      ['done', '2'],
    ]);
    expect(head.querySelector('.act-actor')?.getAttribute('data-empty')).toBe('true');
    el.api.dispatch({ type: 'SET_ACTIVITY_ACTOR', target: 'activity:a1', payload: { actor: ' Admin ' } });
    await el.updateComplete;
    expect(el.api.state.activities[0]?.actor).toBe('Admin');
    expect(head.querySelector('.act-actor')?.getAttribute('data-empty')).toBe('false');
    el.api.dispatch({ type: 'SET_ACTIVITY_ACTOR', target: 'activity:a1', payload: { actor: '' } });
    expect(el.api.state.activities[0]).not.toHaveProperty('actor');
  });

  it('edits the statuses on their own tab', async () => {
    const el = await mount('#tab=statuses');
    const section = el.shadowRoot!.querySelector('[data-testid="usm-statuses"]')!;
    expect([...section.querySelectorAll('[data-status]')].map((row) => row.getAttribute('data-status'))).toEqual([
      'idea',
      'ready',
      'done',
    ]);
    const done = section.querySelector('[data-status="done"]')!;
    (done.querySelector('[data-tone="blue"]') as HTMLButtonElement).click();
    (done.querySelector(`[aria-label="${m.moveUpAria}"]`) as HTMLButtonElement).click();
    expect(el.api.state.statuses.map((status) => [status.id, status.tone])).toEqual([
      ['idea', 'gray'],
      ['done', 'blue'],
      ['ready', 'amber'],
    ]);
    [...section.querySelectorAll('button')].find((button) => button.textContent?.trim() === m.newStatusButton)!.click();
    expect(el.api.state.statuses).toHaveLength(4);
    // the icon is picked from a menu its own icon opens
    expect(section.querySelector('#icon-menu')).toBeNull();
    (section.querySelector('[data-icon-trigger="ready"]') as HTMLButtonElement).click();
    await el.updateComplete;
    const menu = el.shadowRoot!.querySelector('#icon-menu')!;
    expect([...menu.querySelectorAll('[role="menuitemradio"]')]).toHaveLength(10);
    expect(menu.querySelector('[aria-checked="true"]')?.getAttribute('data-icon')).toBe('progress');
    (menu.querySelector('[data-icon="play"]') as HTMLButtonElement).click();
    await el.updateComplete;
    expect(el.api.state.statuses.find((status) => status.id === 'ready')?.icon).toBe('play');
    expect(el.shadowRoot!.querySelector('#icon-menu')).toBeNull();
  });
});
