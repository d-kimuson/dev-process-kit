// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';

import type { DraftAction } from '../../core/types';
import type { DpkTemplateUsm } from './element';

import '../../index';
import { applyUsmAction } from './apply';
import { usmDefinitionFor } from './definition';
import { presentLabelOverview } from './label-overview';
import { usmMessages } from './messages';
import { labelsOfStory, parseUsmBase, type UsmState } from './model';

const m = usmMessages('en');
const definition = usmDefinitionFor('en');

const raw = {
  activities: [{ id: 'a1', name: 'A1', steps: [{ id: 's1', name: 'S1' }] }],
  labels: [
    { id: 'dev', name: 'Dev' },
    { id: 'pdm', name: 'PdM', tone: 'violet' },
  ],
  stories: [
    { id: 'u1', name: 'U1', activityId: 'a1', stepId: 's1', labelIds: ['pdm', 'dev'] },
    { id: 'u2', name: 'U2', activityId: 'a1', stepId: 's1', labelIds: ['dev'] },
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

const labelIdsOf = (state: UsmState | null, storyId: string) =>
  state?.stories.find((story) => story.id === storyId)?.labelIds;

describe('usm labels: model', () => {
  it('fills a missing tone by position and defaults to no labels', () => {
    expect(base.labels.map((label) => [label.id, label.tone])).toEqual([
      ['dev', 'blue'],
      ['pdm', 'violet'],
    ]);
    expect(parseUsmBase({ ...raw, labels: undefined, stories: [] }).labels).toEqual([]);
  });

  it('shows a story’s labels in the order of the labels, whatever order the story lists them in', () => {
    const story = base.stories.find((candidate) => candidate.id === 'u1')!;
    expect(labelsOfStory(base, story).map((label) => label.id)).toEqual(['dev', 'pdm']);
  });

  it('rejects an unknown label, the same label twice and an id clash', () => {
    const story = { id: 'u9', name: 'U', activityId: 'a1', stepId: 's1' };
    expect(() => parseUsmBase({ ...raw, stories: [{ ...story, labelIds: ['nope'] }] })).toThrow(/unknown labelId/);
    expect(() => parseUsmBase({ ...raw, stories: [{ ...story, labelIds: ['dev', 'dev'] }] })).toThrow(/twice/);
    expect(() => parseUsmBase({ ...raw, labels: [{ id: 'a1', name: 'Clash' }] })).toThrow(/duplicate id/);
    expect(() => parseUsmBase({ ...raw, labels: [{ id: 'x', name: 'X', tone: 'pink' }] })).toThrow();
  });
});

describe('usm labels: actions', () => {
  it('adds, renames, recolors and reorders labels', () => {
    let state = apply(base, 'ADD_LABEL', { type: 'page', id: 'usm' }, { id: 'qa', name: 'QA', tone: 'green' });
    expect(state?.labels.at(-1)).toEqual({ id: 'qa', name: 'QA', tone: 'green' });
    expect(apply(state!, 'ADD_LABEL', { type: 'page', id: 'usm' }, { id: 'qa', name: 'QA', tone: 'green' })).toBe(
      state,
    );
    state = apply(state!, 'SET_LABEL_NAME', { type: 'label', id: 'qa' }, { name: 'Quality' });
    state = apply(state!, 'SET_LABEL_TONE', { type: 'label', id: 'qa' }, { tone: 'amber' });
    state = apply(state!, 'REORDER_LABEL', { type: 'label', id: 'qa' }, { after: null });
    expect(state?.labels.map((label) => [label.id, label.name, label.tone])).toEqual([
      ['qa', 'Quality', 'amber'],
      ['dev', 'Dev', 'blue'],
      ['pdm', 'PdM', 'violet'],
    ]);
    expect(apply(base, 'SET_LABEL_NAME', { type: 'label', id: 'nope' }, { name: 'X' })).toBeNull();
    expect(apply(base, 'SET_LABEL_TONE', { type: 'label', id: 'dev' }, { tone: 'pink' })).toBeNull();
  });

  it('puts a label on a story once and takes it off again', () => {
    const target = { type: 'story', id: 'u3' };
    const added = apply(base, 'ADD_STORY_LABEL', target, { labelId: 'pdm' });
    expect(labelIdsOf(added, 'u3')).toEqual(['pdm']);
    expect(apply(added!, 'ADD_STORY_LABEL', target, { labelId: 'pdm' })).toBe(added);
    expect(apply(base, 'ADD_STORY_LABEL', target, { labelId: 'nope' })).toBeNull();
    const removed = apply(added!, 'REMOVE_STORY_LABEL', target, { labelId: 'pdm' });
    expect(removed?.stories.find((story) => story.id === 'u3')).not.toHaveProperty('labelIds');
    expect(apply(base, 'REMOVE_STORY_LABEL', target, { labelId: 'pdm' })).toBeNull();
  });

  it('takes a deleted label off every story', () => {
    const state = apply(base, 'DELETE_LABEL', { type: 'label', id: 'dev' }, {});
    expect(state?.labels.map((label) => label.id)).toEqual(['pdm']);
    expect(labelIdsOf(state, 'u1')).toEqual(['pdm']);
    expect(state?.stories.find((story) => story.id === 'u2')).not.toHaveProperty('labelIds');
    expect(apply(base, 'DELETE_LABEL', { type: 'label', id: 'nope' }, {})).toBeNull();
  });

  it('describes label changes by the label names', () => {
    expect(
      definition.describe(act('ADD_STORY_LABEL', { type: 'story', id: 'u3' }, { labelId: 'pdm' }), base, base),
    ).toMatchObject({ title: m.addStoryLabel, targetLabel: 'Story · U3', summary: '+ “PdM”' });
    expect(
      definition.describe(act('SET_LABEL_NAME', { type: 'label', id: 'dev' }, { name: 'Engineering' }), base, base),
    ).toMatchObject({ title: m.renameLabel, targetLabel: 'Label · Dev', summary: '“Dev” → “Engineering”' });
  });

  it('lists labels as comment targets and keeps the labels tab in navigation', () => {
    expect(definition.commentTargets(base, {}).filter((option) => option.group === m.labelGroup)).toHaveLength(2);
    expect(definition.resolveNavigation(base, { tab: 'labels' })['tab']).toBe('labels');
  });
});

describe('usm labels: overview', () => {
  it('counts the stories per label', () => {
    expect(presentLabelOverview(base).rows.map((row) => [row.id, row.storyCount, row.previousId, row.nextId])).toEqual([
      ['dev', 2, null, 'pdm'],
      ['pdm', 1, 'dev', null],
    ]);
  });
});

describe('usm labels: element', () => {
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

  it('edits the labels on their own tab', async () => {
    const el = await mount('#tab=labels');
    const root = el.shadowRoot!;
    expect(root.querySelector('[role="tab"][data-tab="labels"]')?.getAttribute('aria-selected')).toBe('true');
    const section = root.querySelector('[data-testid="usm-labels"]')!;
    expect([...section.querySelectorAll('[data-label]')].map((row) => row.getAttribute('data-label'))).toEqual([
      'dev',
      'pdm',
    ]);
    const pdm = section.querySelector('[data-label="pdm"]')!;
    (pdm.querySelector('[data-tone="green"]') as HTMLButtonElement).click();
    (pdm.querySelector(`[aria-label="${m.moveUpAria}"]`) as HTMLButtonElement).click();
    expect(el.api.state.labels.map((label) => [label.id, label.tone])).toEqual([
      ['pdm', 'green'],
      ['dev', 'blue'],
    ]);
    [...section.querySelectorAll('button')].find((button) => button.textContent?.trim() === m.newLabelButton)!.click();
    expect(el.api.state.labels.at(-1)?.name).toBe(m.newLabelName);
    await el.updateComplete;
    (section.querySelector('[data-label="dev"] [data-role="delete"]') as HTMLButtonElement).click();
    expect(el.api.state.stories.find((story) => story.id === 'u2')).not.toHaveProperty('labelIds');
  });

  it('shows labels on the cards and toggles them in the story panel', async () => {
    const el = await mount('#story=u3');
    const root = el.shadowRoot!;
    const card = (id: string) =>
      root.querySelector(`dpk-internal-usm-story-card[data-story="${id}"]`) as HTMLElement & {
        updateComplete: Promise<boolean>;
      };
    await card('u1').updateComplete;
    expect([...card('u1').shadowRoot!.querySelectorAll('.label-chip')].map((chip) => chip.textContent?.trim())).toEqual(
      ['Dev', 'PdM'],
    );
    const panel = root.querySelector('[data-testid="usm-story-panel"]')!;
    const toggles = () => [...panel.querySelectorAll('.sp-label')] as HTMLButtonElement[];
    expect(toggles().map((toggle) => [toggle.textContent?.trim(), toggle.getAttribute('aria-pressed')])).toEqual([
      ['Dev', 'false'],
      ['PdM', 'false'],
    ]);
    toggles()[1]!.click();
    await settle(el);
    expect(toggles()[1]!.getAttribute('aria-pressed')).toBe('true');
    await card('u3').updateComplete;
    expect(card('u3').shadowRoot!.querySelector('.label-chip')?.textContent?.trim()).toBe('PdM');
    toggles()[1]!.click();
    await settle(el);
    expect(toggles()[1]!.getAttribute('aria-pressed')).toBe('false');
    expect(el.api.state.stories.find((story) => story.id === 'u3')).not.toHaveProperty('labelIds');
  });
});
