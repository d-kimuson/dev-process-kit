// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';

import type { DraftAction } from '../../core/types';
import type { DpkTemplateUsm } from './element';

import '../../index';
import { applyUsmAction } from './apply';
import { usmDefinitionFor } from './definition';
import { blockerOptions, dependencyOf } from './dependencies';
import { dependencyChoices } from './dependency-choices';
import { usmMessages } from './messages';
import { parseUsmBase, type UsmState } from './model';

const m = usmMessages('en');
const definition = usmDefinitionFor('en');

// spike blocks u1 and u2; u1 blocks u2. done is finished and blocks u3.
const raw = {
  activities: [
    {
      id: 'a1',
      name: 'A1',
      steps: [
        { id: 's1', name: 'S1' },
        { id: 's2', name: 'S2' },
      ],
    },
  ],
  statuses: [
    { id: 'idea', name: 'Idea' },
    { id: 'finished', name: 'Finished' },
  ],
  stories: [
    { id: 'spike', name: 'Spike', activityId: 'a1', stepId: 's1' },
    { id: 'u1', name: 'U1', activityId: 'a1', stepId: 's1', blockedBy: ['spike'] },
    { id: 'u2', name: 'U2', activityId: 'a1', stepId: 's2', blockedBy: ['spike', 'u1'] },
    { id: 'done', name: 'Done', activityId: 'a1', stepId: 's2', statusId: 'finished' },
    { id: 'u3', name: 'U3', activityId: 'a1', stepId: 's2', blockedBy: ['done'] },
  ],
};

const base = parseUsmBase(raw);

const act = (type: string, target: { type: string; id: string }, payload: unknown): DraftAction => {
  return { id: 'x', type, target, payload, createdAt: '2026-01-01T00:00:00Z' };
};

const apply = (state: UsmState, type: string, target: { type: string; id: string }, payload: unknown) => {
  return applyUsmAction(state, act(type, target, payload));
};

const blockedByOf = (state: UsmState | null, storyId: string) =>
  state?.stories.find((story) => story.id === storyId)?.blockedBy;

describe('usm dependencies: model', () => {
  it('rejects an unknown story, itself, the same story twice and a cycle', () => {
    const with_ = (id: string, blockedBy: string[]) => ({
      ...raw,
      stories: raw.stories.map((story) => (story.id === id ? { ...story, blockedBy } : story)),
    });
    expect(() => parseUsmBase(with_('u1', ['nope']))).toThrow(/unknown blocker/);
    expect(() => parseUsmBase(with_('u1', ['u1']))).toThrow(/itself/);
    expect(() => parseUsmBase(with_('u1', ['spike', 'spike']))).toThrow(/twice/);
    expect(() => parseUsmBase(with_('spike', ['u2']))).toThrow(/cycle/);
  });

  it('tells what a story waits on and what it holds up', () => {
    expect(dependencyOf(base, 'spike')).toEqual({ blockers: [], openBlockers: 0, dependents: ['u1', 'u2'] });
    expect(dependencyOf(base, 'u2')).toEqual({ blockers: ['spike', 'u1'], openBlockers: 2, dependents: [] });
    // A blocker in the last status is finished: it no longer holds the story up.
    expect(dependencyOf(base, 'u3')).toEqual({ blockers: ['done'], openBlockers: 0, dependents: [] });
  });

  it('offers as blockers only the stories that keep the graph acyclic', () => {
    // u1 already waits on spike, and u2 waits on u1: neither may block it again or in turn.
    expect(blockerOptions(base, 'u1').map((story) => story.id)).toEqual(['done', 'u3']);
    expect(blockerOptions(base, 'spike').map((story) => story.id)).toEqual(['done', 'u3']);
  });

  it('narrows the choices of either side by the story name or where it sits on the map', () => {
    const ids = (choices: ReturnType<typeof dependencyChoices>) => choices.map((choice) => choice.story.id);
    expect(ids(dependencyChoices(base, 'u3', 'blocker', ''))).toEqual(['spike', 'u1', 'u2']);
    expect(ids(dependencyChoices(base, 'u3', 'blocker', 'u'))).toEqual(['u1', 'u2']);
    // u2 sits under S2; so does done, which u3 already waits on.
    expect(ids(dependencyChoices(base, 'u3', 'blocker', 's2'))).toEqual(['u2']);
    expect(ids(dependencyChoices(base, 'spike', 'dependent', 'u'))).toEqual(['u3']);
    expect(dependencyChoices(base, 'u3', 'blocker', 'spike')).toEqual([
      { story: base.stories[0], place: ['A1', 'S1'] },
    ]);
  });
});

describe('usm dependencies: actions', () => {
  it('adds a blocker once and removes it again', () => {
    const target = { type: 'story', id: 'u3' };
    const added = apply(base, 'ADD_STORY_BLOCKER', target, { blockerId: 'spike' });
    expect(blockedByOf(added, 'u3')).toEqual(['done', 'spike']);
    expect(apply(added!, 'ADD_STORY_BLOCKER', target, { blockerId: 'spike' })).toBe(added);
    const removed = apply(added!, 'REMOVE_STORY_BLOCKER', target, { blockerId: 'spike' });
    expect(blockedByOf(removed, 'u3')).toEqual(['done']);
    const none = apply(removed!, 'REMOVE_STORY_BLOCKER', target, { blockerId: 'done' });
    expect(none?.stories.find((story) => story.id === 'u3')).not.toHaveProperty('blockedBy');
    expect(apply(base, 'REMOVE_STORY_BLOCKER', target, { blockerId: 'spike' })).toBeNull();
  });

  it('refuses an unknown story, the story itself and a cycle', () => {
    expect(apply(base, 'ADD_STORY_BLOCKER', { type: 'story', id: 'u1' }, { blockerId: 'nope' })).toBeNull();
    expect(apply(base, 'ADD_STORY_BLOCKER', { type: 'story', id: 'u1' }, { blockerId: 'u1' })).toBeNull();
    expect(apply(base, 'ADD_STORY_BLOCKER', { type: 'story', id: 'spike' }, { blockerId: 'u2' })).toBeNull();
  });

  it('drops a deleted story from what the others wait on', () => {
    expect(blockedByOf(apply(base, 'DELETE_STORY', { type: 'story', id: 'spike' }, {}), 'u2')).toEqual(['u1']);
    const noStep = apply(base, 'DELETE_STEP', { type: 'step', id: 'a1.s1' }, {});
    expect(noStep?.stories.find((story) => story.id === 'u2')).not.toHaveProperty('blockedBy');
  });

  it('describes a blocker by the story names', () => {
    expect(
      definition.describe(act('ADD_STORY_BLOCKER', { type: 'story', id: 'u3' }, { blockerId: 'spike' }), base, base),
    ).toMatchObject({ title: m.addStoryBlocker, targetLabel: 'Story · U3', summary: '+ “Spike”' });
  });
});

describe('usm dependencies: element', () => {
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

  const card = (el: DpkTemplateUsm, id: string) =>
    el.shadowRoot!.querySelector(`dpk-internal-usm-story-card[data-story="${id}"]`) as HTMLElement & {
      updateComplete: Promise<boolean>;
    };

  beforeEach(() => {
    window.location.hash = '';
    document.body.innerHTML = '';
  });

  it('marks on the cards what holds others up and what waits', async () => {
    const el = await mount('');
    await card(el, 'spike').updateComplete;
    await card(el, 'u2').updateComplete;
    await card(el, 'u3').updateComplete;
    const chips = (id: string) =>
      [...card(el, id).shadowRoot!.querySelectorAll('.dep-chip')].map((chip) => [
        chip.getAttribute('data-kind'),
        chip.textContent?.trim(),
      ]);
    expect(chips('spike')).toEqual([['blocks', m.blocksChip(2)]]);
    expect(chips('u2')).toEqual([['waits', m.waitsChip(2)]]);
    // Waiting only on finished work, the story is free to start.
    expect(chips('u3')).toEqual([]);
  });

  it('points out the selected story’s blockers and dependents on the map', async () => {
    const el = await mount('#story=u1');
    expect(card(el, 'spike').getAttribute('data-relation')).toBe('blocker');
    expect(card(el, 'u2').getAttribute('data-relation')).toBe('dependent');
    expect(card(el, 'u3').hasAttribute('data-relation')).toBe(false);
  });

  const panelOf = (el: DpkTemplateUsm) => el.shadowRoot!.querySelector('[data-testid="usm-story-panel"]')!;
  const pickerOf = (el: DpkTemplateUsm, role: 'add-blocker' | 'add-dependent') =>
    panelOf(el).querySelector(`input[data-role="${role}"]`) as HTMLInputElement;
  const type = async (el: DpkTemplateUsm, input: HTMLInputElement, query: string): Promise<void> => {
    input.focus();
    input.value = query;
    input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    await settle(el);
  };
  const press = async (el: DpkTemplateUsm, input: HTMLInputElement, key: string): Promise<void> => {
    input.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, composed: true, cancelable: true }));
    await settle(el);
  };
  const choicesOf = (el: DpkTemplateUsm) =>
    [...panelOf(el).querySelectorAll('[role="listbox"] [role="option"]')].map((option) =>
      option.getAttribute('data-story'),
    );

  it('edits the dependencies in the story panel, picking from the stories the query finds', async () => {
    const el = await mount('#story=u3');
    const input = pickerOf(el, 'add-blocker');
    await type(el, input, 'spi');
    expect(choicesOf(el)).toEqual(['spike']);
    (panelOf(el).querySelector('[role="option"][data-story="spike"]') as HTMLElement).click();
    await settle(el);
    expect(el.api.state.stories.find((story) => story.id === 'u3')?.blockedBy).toEqual(['done', 'spike']);
    expect(panelOf(el).querySelector('[role="listbox"]')).toBeNull();
    expect(pickerOf(el, 'add-blocker').value).toBe('');
    const remove = panelOf(el).querySelector('[data-blocker="done"] [data-role="remove"]') as HTMLButtonElement;
    remove.click();
    await settle(el);
    expect(el.api.state.stories.find((story) => story.id === 'u3')?.blockedBy).toEqual(['spike']);
  });

  it('lets a story take on dependents from its panel, by keyboard', async () => {
    const el = await mount('#story=done');
    expect(
      [...panelOf(el).querySelectorAll('[data-dependent]')].map((row) => row.getAttribute('data-dependent')),
    ).toEqual(['u3']);
    const input = pickerOf(el, 'add-dependent');
    await type(el, input, 'u');
    expect(choicesOf(el)).toEqual(['u1', 'u2']);
    await press(el, input, 'ArrowDown');
    const active = input.getAttribute('aria-activedescendant');
    expect(panelOf(el).querySelector(`#${active}`)?.getAttribute('data-story')).toBe('u2');
    await press(el, input, 'Enter');
    expect(el.api.state.stories.find((story) => story.id === 'u2')?.blockedBy).toEqual(['spike', 'u1', 'done']);
  });

  it('is a combobox whose list opens on focus and closes on Escape before the panel does', async () => {
    const el = await mount('#story=u3');
    const input = pickerOf(el, 'add-blocker');
    expect(input.getAttribute('role')).toBe('combobox');
    expect(input.getAttribute('aria-expanded')).toBe('false');
    input.focus();
    await settle(el);
    expect(input.getAttribute('aria-expanded')).toBe('true');
    expect(
      panelOf(el)
        .querySelector(`#${input.getAttribute('aria-controls')}`)
        ?.getAttribute('role'),
    ).toBe('listbox');
    expect(choicesOf(el)).toEqual(['spike', 'u1', 'u2']);
    await press(el, input, 'Escape');
    expect(input.getAttribute('aria-expanded')).toBe('false');
    expect(el.shadowRoot!.querySelector('[data-testid="usm-story-panel"]')).not.toBeNull();
    await press(el, input, 'Escape');
    expect(el.shadowRoot!.querySelector('[data-testid="usm-story-panel"]')).toBeNull();
  });

  it('says so when the query finds no story', async () => {
    const el = await mount('#story=u3');
    await type(el, pickerOf(el, 'add-blocker'), 'nothing like it');
    expect(panelOf(el).querySelector('[role="listbox"]')).toBeNull();
    expect(panelOf(el).querySelector('.sp-dep-none')?.textContent?.trim()).toBe(m.noDependencyMatch);
  });
});
