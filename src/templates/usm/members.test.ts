// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';

import type { DraftAction } from '../../core/types';
import type { DpkTemplateUsm } from './element';

import '../../index';
import { applyUsmAction } from './apply';
import { usmDefinitionFor } from './definition';
import { filterOptionIds, mapFilterOf, NO_VALUE, passesMapFilter } from './map-filter';
import { presentMemberOverview } from './member-overview';
import { usmMessages } from './messages';
import { assigneeOf, parseUsmBase, type UsmState } from './model';

const m = usmMessages('en');
const definition = usmDefinitionFor('en');

const raw = {
  features: ['assignees'],
  activities: [{ id: 'a1', name: 'A1', steps: [{ id: 's1', name: 'S1' }] }],
  members: [
    { id: 'kim', name: 'Kimura' },
    { id: 'sato', name: 'Sato', tone: 'green' },
  ],
  stories: [
    { id: 'u1', name: 'U1', activityId: 'a1', stepId: 's1', assigneeId: 'kim' },
    { id: 'u2', name: 'U2', activityId: 'a1', stepId: 's1', assigneeId: 'kim' },
    { id: 'u3', name: 'U3', activityId: 'a1', stepId: 's1' },
  ],
};

const base = parseUsmBase(raw);

const act = (type: string, target: { type: string; id: string }, payload: unknown): DraftAction => {
  return { id: 'x', type, target, payload, createdAt: '2026-01-01T00:00:00Z' };
};

const apply = (state: UsmState, type: string, target: { type: string; id: string }, payload: unknown) => {
  return applyUsmAction(state, act(type, target, payload));
};

const assigneeIdOf = (state: UsmState | null, storyId: string) =>
  state?.stories.find((story) => story.id === storyId)?.assigneeId;

describe('usm members: model', () => {
  it('fills a missing tone by position and defaults to no members', () => {
    expect(base.members.map((member) => [member.id, member.tone])).toEqual([
      ['kim', 'blue'],
      ['sato', 'green'],
    ]);
    expect(parseUsmBase({ ...raw, members: undefined, stories: [] }).members).toEqual([]);
  });

  it('finds the member a story is assigned to', () => {
    const [u1, , u3] = base.stories;
    expect(assigneeOf(base, u1!)?.name).toBe('Kimura');
    expect(assigneeOf(base, u3!)).toBeUndefined();
  });

  it('rejects an unknown assignee and an id clash', () => {
    const story = { id: 'u9', name: 'U', activityId: 'a1', stepId: 's1' };
    expect(() => parseUsmBase({ ...raw, stories: [{ ...story, assigneeId: 'nope' }] })).toThrow(/unknown assigneeId/);
    expect(() => parseUsmBase({ ...raw, members: [{ id: 'a1', name: 'Clash' }] })).toThrow(/duplicate id/);
  });
});

describe('usm members: actions', () => {
  it('adds, renames, recolors and reorders members', () => {
    let state = apply(base, 'ADD_MEMBER', { type: 'page', id: 'usm' }, { id: 'ito', name: 'Ito', tone: 'amber' });
    expect(state?.members.at(-1)).toEqual({ id: 'ito', name: 'Ito', tone: 'amber' });
    expect(apply(state!, 'ADD_MEMBER', { type: 'page', id: 'usm' }, { id: 'ito', name: 'Ito', tone: 'amber' })).toBe(
      state,
    );
    state = apply(state!, 'SET_MEMBER_NAME', { type: 'member', id: 'ito' }, { name: 'Itō' });
    state = apply(state!, 'SET_MEMBER_TONE', { type: 'member', id: 'ito' }, { tone: 'violet' });
    state = apply(state!, 'REORDER_MEMBER', { type: 'member', id: 'ito' }, { after: null });
    expect(state?.members.map((member) => [member.id, member.name, member.tone])).toEqual([
      ['ito', 'Itō', 'violet'],
      ['kim', 'Kimura', 'blue'],
      ['sato', 'Sato', 'green'],
    ]);
  });

  it('assigns a story to a member and unassigns it again', () => {
    const assigned = apply(base, 'SET_STORY_ASSIGNEE', { type: 'story', id: 'u3' }, { memberId: 'sato' });
    expect(assigneeIdOf(assigned, 'u3')).toBe('sato');
    const unassigned = apply(assigned!, 'SET_STORY_ASSIGNEE', { type: 'story', id: 'u3' }, { memberId: null });
    expect(unassigned?.stories.find((story) => story.id === 'u3')).not.toHaveProperty('assigneeId');
    expect(apply(base, 'SET_STORY_ASSIGNEE', { type: 'story', id: 'u3' }, { memberId: 'nope' })).toBeNull();
  });

  it('unassigns the stories of a deleted member', () => {
    const state = apply(base, 'DELETE_MEMBER', { type: 'member', id: 'kim' }, {});
    expect(state?.members.map((member) => member.id)).toEqual(['sato']);
    expect(state?.stories.some((story) => 'assigneeId' in story)).toBe(false);
    expect(apply(base, 'DELETE_MEMBER', { type: 'member', id: 'nope' }, {})).toBeNull();
  });

  it('describes member changes by the member names', () => {
    expect(
      definition.describe(act('SET_STORY_ASSIGNEE', { type: 'story', id: 'u3' }, { memberId: 'sato' }), base, base),
    ).toMatchObject({ title: m.setStoryAssignee, targetLabel: 'Story · U3', summary: '→ “Sato”' });
    expect(
      definition.describe(act('SET_STORY_ASSIGNEE', { type: 'story', id: 'u1' }, { memberId: null }), base, base),
    ).toMatchObject({ title: m.setStoryAssignee, tone: 'delete', summary: m.removed('Kimura') });
    expect(
      definition.describe(act('SET_MEMBER_NAME', { type: 'member', id: 'kim' }, { name: 'Kim' }), base, base),
    ).toMatchObject({ title: m.renameMember, targetLabel: 'Member · Kimura', summary: '“Kimura” → “Kim”' });
  });

  it('lists members as comment targets and keeps the members tab in navigation', () => {
    expect(definition.commentTargets(base, {}).filter((option) => option.group === m.memberGroup)).toHaveLength(2);
    expect(definition.resolveNavigation(base, { tab: 'members' })['tab']).toBe('members');
  });
});

describe('usm members: overview and filter', () => {
  it('counts the stories per member', () => {
    expect(presentMemberOverview(base).rows.map((row) => [row.id, row.storyCount, row.previousId, row.nextId])).toEqual(
      [
        ['kim', 2, null, 'sato'],
        ['sato', 0, 'kim', null],
      ],
    );
  });

  it('filters the map by assignee, with "nobody" for the stories no one has', () => {
    expect(filterOptionIds(base, 'assignee')).toEqual(['kim', 'sato', NO_VALUE]);
    const filter = mapFilterOf(base, { assignee: `sato,${NO_VALUE}` });
    expect(base.stories.filter((story) => passesMapFilter(filter, story)).map((story) => story.id)).toEqual(['u3']);
  });
});

describe('usm members: element', () => {
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

  beforeEach(() => {
    window.location.hash = '';
    document.body.innerHTML = '';
  });

  it('edits the members on their own tab', async () => {
    const el = await mount('#tab=members');
    const root = el.shadowRoot!;
    expect(root.querySelector('[role="tab"][data-tab="members"]')?.getAttribute('aria-selected')).toBe('true');
    const section = root.querySelector('[data-testid="usm-members"]')!;
    expect([...section.querySelectorAll('[data-member]')].map((row) => row.getAttribute('data-member'))).toEqual([
      'kim',
      'sato',
    ]);
    const sato = section.querySelector('[data-member="sato"]')!;
    (sato.querySelector('[data-tone="amber"]') as HTMLButtonElement).click();
    (sato.querySelector(`[aria-label="${m.moveUpAria}"]`) as HTMLButtonElement).click();
    expect(el.api.state.members.map((member) => [member.id, member.tone])).toEqual([
      ['sato', 'amber'],
      ['kim', 'blue'],
    ]);
    [...section.querySelectorAll('button')].find((button) => button.textContent?.trim() === m.newMemberButton)!.click();
    expect(el.api.state.members.at(-1)?.name).toBe(m.newMemberName);
    await el.updateComplete;
    (section.querySelector('[data-member="kim"] [data-role="delete"]') as HTMLButtonElement).click();
    expect(el.api.state.stories.some((story) => 'assigneeId' in story)).toBe(false);
  });

  it('shows the assignee on the card and picks one in the story panel', async () => {
    const el = await mount('#story=u3');
    const root = el.shadowRoot!;
    const card = (id: string) =>
      root.querySelector(`dpk-internal-usm-story-card[data-story="${id}"]`) as HTMLElement & {
        updateComplete: Promise<boolean>;
      };
    await card('u1').updateComplete;
    const avatar = card('u1').shadowRoot!.querySelector('.assignee-avatar')!;
    expect(avatar.textContent?.trim()).toBe('K');
    expect(avatar.getAttribute('title')).toBe(m.assigneeChipTitle('Kimura'));
    const panel = root.querySelector('[data-testid="usm-story-panel"]')!;
    const options = () => [...panel.querySelectorAll('[data-assignee]')] as HTMLButtonElement[];
    expect(
      options().map((option) => [option.getAttribute('data-assignee'), option.getAttribute('aria-checked')]),
    ).toEqual([
      ['', 'true'],
      ['kim', 'false'],
      ['sato', 'false'],
    ]);
    options()[2]!.click();
    await settle(el);
    expect(el.api.state.stories.find((story) => story.id === 'u3')?.assigneeId).toBe('sato');
    expect(options()[2]!.getAttribute('aria-checked')).toBe('true');
    options()[0]!.click();
    await settle(el);
    expect(el.api.state.stories.find((story) => story.id === 'u3')).not.toHaveProperty('assigneeId');
  });

  it('filters the map by assignee from the filter bar', async () => {
    const el = await mount('');
    const root = el.shadowRoot!;
    (root.querySelector('[data-filter-trigger="assignee"]') as HTMLButtonElement).click();
    await settle(el);
    const options = [...root.querySelectorAll('#filter-menu [data-option]')].map((option) => [
      option.getAttribute('data-option'),
      option.querySelector('.filter-count')?.textContent?.trim() ?? null,
    ]);
    expect(options).toEqual([
      ['', null],
      ['kim', '2'],
      ['sato', '0'],
      [NO_VALUE, '1'],
    ]);
    window.location.hash = `#assignee=${NO_VALUE}`;
    await settle(el);
    const shown = [...root.querySelectorAll('dpk-internal-usm-story-card')].map((card) =>
      card.getAttribute('data-story'),
    );
    expect(shown).toEqual(['u3']);
  });
});
