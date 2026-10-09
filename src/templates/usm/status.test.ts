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
  it('sets and clears a story status, and goes stale on an unknown one', () => {
    const set = apply(base, 'SET_STORY_STATUS', { type: 'story', id: 'u4' }, { statusId: 'idea' });
    expect(set?.stories.find((story) => story.id === 'u4')?.statusId).toBe('idea');
    const cleared = apply(base, 'SET_STORY_STATUS', { type: 'story', id: 'u1' }, { statusId: null });
    expect(cleared?.stories.find((story) => story.id === 'u1')).not.toHaveProperty('statusId');
    expect(apply(base, 'SET_STORY_STATUS', { type: 'story', id: 'u1' }, { statusId: 'nope' })).toBeNull();
  });

  it('adds, renames, recolors and reorders statuses', () => {
    let state = apply(base, 'ADD_STATUS', { type: 'page', id: 'usm' }, { id: 'doing', name: 'Doing', tone: 'blue' });
    expect(state?.statuses.at(-1)).toEqual({ id: 'doing', name: 'Doing', tone: 'blue' });
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

  it('deleting a status leaves its stories without one instead of deleting them', () => {
    const state = apply(base, 'DELETE_STATUS', { type: 'status', id: 'done' }, {});
    expect(state?.statuses.map((status) => status.id)).toEqual(['idea', 'ready']);
    expect(state?.stories).toHaveLength(4);
    expect(state?.stories.filter((story) => story.statusId !== undefined).map((story) => story.id)).toEqual(['u2']);
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

describe('usm statuses: distribution', () => {
  it('spreads stories over the statuses in workflow order, then the ones without a status', () => {
    expect(statusDistribution(base, base.stories, 'None').map((part) => [part.id, part.progress, part.count])).toEqual([
      ['ready', 0.5, 1],
      ['done', 1, 2],
      [null, undefined, 1],
    ]);
    expect(statusDistribution({ ...base, statuses: [] }, base.stories, 'None')).toEqual([]);
  });
});

describe('usm statuses: overview', () => {
  it('counts the stories per status and those without one', () => {
    const overview = presentStatusOverview(base);
    expect(overview.rows.map((row) => [row.id, row.storyCount, row.previousId, row.nextId])).toEqual([
      ['idea', 0, null, 'ready'],
      ['ready', 1, 'idea', 'done'],
      ['done', 2, 'ready', null],
    ]);
    expect(overview.rows[2]?.share).toBe(0.5);
    expect(overview.unsetCount).toBe(1);
  });
});

describe('usm statuses: element', () => {
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

  it('colors cards by status and sets a status from the card menu', async () => {
    const el = await mount('');
    const root = el.shadowRoot!;
    const cardOf = (id: string) =>
      root.querySelector(`dpk-internal-usm-story-card[data-story="${id}"]`) as HTMLElement & {
        updateComplete: Promise<boolean>;
      };
    const card = cardOf('u4');
    expect(cardOf('u1').getAttribute('style')).toContain('--dpk-green');
    expect(card.getAttribute('style')).toContain('--dpk-ink-faint');
    // no status name on the card: the icon carries it, the filter is the legend
    expect(card.shadowRoot!.textContent).not.toContain('Idea');
    const button = card.shadowRoot!.querySelector('[data-role="status"]') as HTMLButtonElement;
    expect(button.getAttribute('aria-label')).toBe(m.storyStatusAria(m.statusUnset));
    button.click();
    await el.updateComplete;
    await card.updateComplete;
    const options = [...card.shadowRoot!.querySelectorAll('.status-pop [role="menuitemradio"]')];
    expect(options.map((option) => option.textContent?.trim())).toEqual(['Idea', 'Ready', 'Done', m.statusUnset]);
    expect(options[3]?.getAttribute('aria-checked')).toBe('true');
    (options[1] as HTMLButtonElement).click();
    await el.updateComplete;
    await card.updateComplete;
    expect(el.api.actions.map((action) => [action.type, action.payload])).toEqual([
      ['SET_STORY_STATUS', { statusId: 'ready' }],
    ]);
    expect(card.getAttribute('style')).toContain('--dpk-amber');
    // picking closes the menu
    expect(card.shadowRoot!.querySelector('.status-pop')).toBeNull();
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
      ['idea', 'false', '0'],
      ['ready', 'false', '1'],
      ['done', 'true', '2'],
      ['~', 'false', '1'],
    ]);
    const shown = () =>
      [...root.querySelectorAll('dpk-internal-usm-story-card')].map((c) => c.getAttribute('data-story'));
    expect(shown()).toEqual(expect.arrayContaining(['u1', 'u3']));
    expect(shown()).toHaveLength(2);
    // turning another one on keeps the canonical order
    expect(filter.querySelector('[data-status="~"]')?.getAttribute('href')).toContain('status=done%2C%7E');
    window.location.hash = '#status=~,nope';
    await new Promise((resolve) => setTimeout(resolve, 0));
    await el.updateComplete;
    expect(el.api.navigation['status']).toBe('~');
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
      ['ready', '1'],
      ['done', '2'],
      ['', '1'],
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
  });
});
