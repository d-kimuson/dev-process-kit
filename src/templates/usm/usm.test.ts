import { type LitElement } from 'lit';
// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';

import type { DraftAction } from '../../core/types';
import type { DpkTemplateUsm } from './element';

import { DpkInlineEdit } from '../../components/inline-edit';
import { DpkTable } from '../../components/table';
import { changeLogScript, showChange } from '../../core/testing/change-notices';
import { applyUsmAction } from './apply';
import '../../index';
import { usmDefinitionFor } from './definition';
import { dropAfter, resolveGroupDrop } from './drop';
import { usmMessages } from './messages';
import { parseUsmBase } from './model';

const usmDefinition = usmDefinitionFor('en');
const m = usmMessages('en');

const base = {
  title: 'Map',
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
  milestones: [{ id: 'mvp', name: 'MVP' }],
  stories: [
    { id: 'u1', name: 'U1', activityId: 'a1', stepId: 's1', milestoneId: 'mvp' },
    { id: 'u2', name: 'U2', activityId: 'a1', stepId: 's1', milestoneId: 'mvp' },
  ],
};

const action = (type: string, target: { type: string; id: string }, payload: unknown): DraftAction => {
  return { id: 'a', type, target, payload, createdAt: '2026-01-01T00:00:00Z' };
};

const mount = (hash = '', lang = ''): DpkTemplateUsm => {
  window.location.hash = hash;
  document.body.innerHTML = `
    <dpk-template-usm storage="memory"${lang === '' ? '' : ` lang="${lang}"`}>
      <script type="application/json">${JSON.stringify(base)}</script>
    </dpk-template-usm>`;
  return document.querySelector('dpk-template-usm') as DpkTemplateUsm;
};

const settle = async (el: DpkTemplateUsm): Promise<void> => {
  await el.api.ready;
  await el.updateComplete;
  await Promise.resolve();
  await el.updateComplete;
};

describe('usm template', () => {
  beforeEach(() => {
    window.location.hash = '';
    document.body.innerHTML = '';
  });

  it('keeps a step editor attached to its entity across reordering', async () => {
    const el = mount();
    await settle(el);
    const editor = el.shadowRoot?.querySelector('.col-head dpk-inline-edit');
    if (!(editor instanceof DpkInlineEdit)) throw new Error('missing editor');
    editor.startEditing();
    await editor.updateComplete;
    const input = editor.shadowRoot?.querySelector('textarea');
    if (!input) throw new Error('missing input');
    input.value = 'Draft S1';
    input.dispatchEvent(new Event('input'));
    el.api.dispatch({ type: 'REORDER_STEP', target: 'step:a1.s2', payload: { after: null } });
    await settle(el);
    expect([...el.shadowRoot!.querySelectorAll('.col-head dpk-inline-edit')][1]).toBe(editor);
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    await settle(el);
    expect(el.api.state.activities[0]?.steps.find((step) => step.id === 's1')?.name).toBe('Draft S1');
    expect(el.api.state.activities[0]?.steps.find((step) => step.id === 's2')?.name).toBe('S2');
  });

  it('rejects unknown keys (strict base parsing)', () => {
    expect(() => parseUsmBase({ ...base, stories: [{ ...base.stories[0], oops: true }] })).toThrow();
    expect(() =>
      parseUsmBase({ ...base, stories: [{ id: 'x', name: 'X', activityId: 'a1', stepId: 'nope' }] }),
    ).toThrow();
    expect(() =>
      parseUsmBase({
        ...base,
        stories: [{ id: 'x', name: 'X', activityId: 'a1', stepId: 's1', milestoneId: 'nope' }],
      }),
    ).toThrow();
  });

  it('rejects duplicate ids', () => {
    expect(() =>
      parseUsmBase({
        ...base,
        stories: [
          { id: 'u1', name: 'U1', activityId: 'a1', stepId: 's1' },
          { id: 'u1', name: 'U1b', activityId: 'a1', stepId: 's1' },
        ],
      }),
    ).toThrow();
  });

  it('apply is pure (input untouched)', () => {
    const state = parseUsmBase(base);
    const frozen = JSON.stringify(state);
    const next = applyUsmAction(state, action('SET_STORY_NAME', { type: 'story', id: 'u1' }, { name: 'New' }));
    expect(JSON.stringify(state)).toBe(frozen);
    expect(next?.stories.find((story) => story.id === 'u1')?.name).toBe('New');
  });

  it('apply is idempotent', () => {
    const state = parseUsmBase(base);
    const move = action(
      'MOVE_STORY',
      { type: 'story', id: 'u1' },
      { activityId: 'a1', stepId: 's2', milestoneId: null, after: null },
    );
    const once = applyUsmAction(state, move);
    const twice = once ? applyUsmAction(once, move) : null;
    expect(JSON.stringify(once)).toBe(JSON.stringify(twice));
    const add = action('ADD_MILESTONE', { type: 'page', id: 'usm' }, { id: 'v1', name: 'V1' });
    const added = applyUsmAction(state, add);
    expect(applyUsmAction(added!, add)).toEqual(added);
  });

  it('returns null when inapplicable', () => {
    const state = parseUsmBase(base);
    expect(applyUsmAction(state, action('SET_STORY_NAME', { type: 'story', id: 'missing' }, { name: 'X' }))).toBeNull();
    expect(applyUsmAction(state, action('REORDER_STORY', { type: 'story', id: 'u1' }, { after: 'nope' }))).toBeNull();
    expect(applyUsmAction(state, action('NOPE', { type: 'story', id: 'u1' }, {}))).toBeNull();
  });

  it('MOVE_STORY moves into another cell and inside one cell', () => {
    const state = parseUsmBase(base);
    const moved = applyUsmAction(
      state,
      action(
        'MOVE_STORY',
        { type: 'story', id: 'u1' },
        { activityId: 'a1', stepId: 's2', milestoneId: 'mvp', after: null },
      ),
    );
    expect(moved?.stories.find((s) => s.id === 'u1')?.stepId).toBe('s2');
    const reordered = applyUsmAction(
      state,
      action(
        'MOVE_STORY',
        { type: 'story', id: 'u1' },
        { activityId: 'a1', stepId: 's1', milestoneId: 'mvp', after: 'u2' },
      ),
    );
    expect(reordered?.stories.filter((s) => s.stepId === 's1').map((s) => s.id)).toEqual(['u2', 'u1']);
  });

  it('dropAfter computes the after anchor', () => {
    expect(dropAfter(['a', 'b', 'c'], 'b', 'before')).toBe('a');
    expect(dropAfter(['a', 'b', 'c'], 'a', 'before')).toBeNull();
    expect(dropAfter(['a', 'b', 'c'], 'b', 'after')).toBe('b');
    expect(dropAfter(['a', 'b'], null, 'end')).toBe('b');
    expect(dropAfter([], null, 'end')).toBeNull();
  });

  it('describe/serialize never throw, even for stale targets', () => {
    const state = parseUsmBase(base);
    const stale = action('SET_STORY_NAME', { type: 'story', id: 'gone' }, { name: 'X' });
    const described = usmDefinition.describe(stale, state);
    expect(described.title.length).toBeGreaterThan(0);
    expect(usmDefinition.serialize(stale)).toContain('SET_STORY_NAME');
    expect(usmDefinition.hasTarget(state, { type: 'story', id: 'u1' })).toBe(true);
    expect(usmDefinition.hasTarget(state, { type: 'story', id: 'gone' })).toBe(false);
    expect(usmDefinition.hasTarget(state, { type: 'milestone', id: 'mvp' })).toBe(true);
  });

  it('resolves navigation defaults', () => {
    const state = parseUsmBase(base);
    expect(usmDefinition.resolveNavigation(state, {})).toMatchObject({ activity: 'a1', step: 's1' });
    expect(usmDefinition.resolveNavigation(state, { step: 's2' })).toMatchObject({ activity: 'a1', step: 's2' });
  });

  it('keeps a view key for the table grouping', () => {
    const state = parseUsmBase(base);
    expect(usmDefinition.resolveNavigation(state, {})).toMatchObject({ view: 'activity' });
    expect(usmDefinition.resolveNavigation(state, { view: 'group' })).toMatchObject({ view: 'group' });
    expect(usmDefinition.resolveNavigation(state, { view: 'nope' })).toMatchObject({ view: 'activity' });
  });

  it('renders the group view as one column per activity group', async () => {
    const el = mount('#view=group');
    await settle(el);
    const root = el.shadowRoot!;
    expect(root.querySelector('[data-testid="usm-map-group"]')).not.toBeNull();
    expect(root.querySelector('[data-testid="usm-map"]')).toBeNull();
    // one tab bar, activity tab current
    const tabs = [...root.querySelectorAll('.view-tabs [role="tab"]')].map((t) => t.textContent?.trim());
    expect(tabs).toEqual([m.activityGroup, m.groupViewTab]);
    expect(root.querySelector('.view-tabs [role="tab"][aria-selected="true"]')?.textContent?.trim()).toBe(
      m.groupViewTab,
    );
    // one header per activity, no step columns
    expect(root.querySelectorAll('.act-head[data-activity]').length).toBe(1);
    // the head lists the steps the column holds
    expect([...root.querySelectorAll('.act-steps li')].map((li) => li.textContent?.trim())).toEqual(['S1', 'S2']);
    expect(root.querySelectorAll('.col-head').length).toBe(0);
    // u1/u2 share the activity column and the unassigned + mvp rows resolve
    const cell = root.querySelector('[data-testid="group-cell-a1-mvp"]');
    expect(cell).not.toBeNull();
    expect(cell!.querySelectorAll('dpk-internal-usm-story-card').length).toBe(2);
    // without step columns, each card names its step; it wears its activity's tone
    const groupCard = cell!.querySelector('dpk-internal-usm-story-card') as LitElement;
    await groupCard.updateComplete;
    expect(groupCard.shadowRoot!.querySelector('[data-kind="step"]')?.textContent?.trim()).toBe('S1');
    // without statuses a card is neutral: color only ever means status
    expect(groupCard.style.getPropertyValue('--usm-tone').trim()).toBe('var(--dpk-ink-faint)');
    // dropping inside the activity view keeps the dragged story's own step.
    // jsdom has no DataTransfer/DragEvent, and it swallows a synthetic dragstart
    // outright — so the pointer wiring is verified in a real browser, and here the
    // extracted drop logic is exercised directly.
    const dropInput = resolveGroupDrop(parseUsmBase(base), 'a1', 'mvp', 'u2', 'u1', 'before');
    expect(dropInput?.payload).toMatchObject({ activityId: 'a1', stepId: 's1', milestoneId: 'mvp', after: null });
    // within its own column the dragged story takes the hovered slot, whichever half is hovered
    expect(resolveGroupDrop(parseUsmBase(base), 'a1', 'mvp', 'u2', 'u1', 'after')).toMatchObject({
      payload: { after: null },
    });
    expect(resolveGroupDrop(parseUsmBase(base), 'a1', 'mvp', 'u1', 'u2', 'before')).toMatchObject({
      payload: { after: 'u2' },
    });
    expect(resolveGroupDrop(parseUsmBase(base), 'a1', 'mvp', 'u2', null, 'end')).toMatchObject({
      payload: { after: 'u1' },
    });
    expect(resolveGroupDrop(parseUsmBase(base), 'other', 'mvp', 'u2', null, 'end')).toBeNull();
    // dispatching the resolved input moves the story and keeps its step
    el.api.dispatch(dropInput!);
    await settle(el);
    expect(el.api.state.stories.find((s) => s.id === 'u2')).toMatchObject({ stepId: 's1', milestoneId: 'mvp' });
    expect(el.api.state.stories.filter((s) => s.stepId === 's1').map((s) => s.id)).toEqual(['u2', 'u1']);
    document.body.innerHTML = '';
  });

  it('reorders a milestone row when <dpk-matrix> reports a row reorder', async () => {
    const el = mount();
    await settle(el);
    el.api.dispatch({ type: 'ADD_MILESTONE', target: 'page:usm', payload: { id: 'v1', name: 'V1' } });
    await settle(el);
    const matrix = el.shadowRoot!.querySelector('dpk-matrix')!;
    matrix.dispatchEvent(new CustomEvent('dpk-matrix-reorder-row', { detail: { rowId: 'v1', after: null } }));
    await settle(el);
    expect(el.api.state.milestones.map((milestone) => milestone.id)).toEqual(['v1', 'mvp']);
    document.body.innerHTML = '';
  });

  it('splits the page into the map, milestones and statuses tabs', async () => {
    const el = mount();
    await settle(el);
    const root = el.shadowRoot!;
    // no per-milestone filter any more: every slice is always on the map
    expect(root.querySelector('.milestone-tabs')).toBeNull();
    const tabs = [...root.querySelectorAll('.page-tabs [role="tab"]')];
    expect(tabs.map((t) => t.getAttribute('data-tab'))).toEqual(['map', 'table', 'milestones', 'statuses', 'labels']);
    expect(root.querySelector('.page-tabs [aria-selected="true"]')?.getAttribute('data-tab')).toBe('map');
    expect(root.querySelector('[data-testid="usm-map"]')).not.toBeNull();
    expect(root.querySelector('[data-testid="usm-milestones"]')).toBeNull();

    expect((tabs[2] as HTMLAnchorElement).hash).toContain('tab=milestones');
    el.api.navigate({ tab: 'milestones' });
    await settle(el);
    expect(el.api.navigation).toMatchObject({ tab: 'milestones' });
    expect(root.querySelector('[data-testid="usm-map"]')).toBeNull();
    expect(root.querySelector('.view-tabs')).toBeNull();
    expect(root.querySelector('[data-testid="usm-milestones"]')).not.toBeNull();
    // switching tabs is navigation, not a draft action
    expect(el.api.actions).toHaveLength(0);
    document.body.innerHTML = '';
  });

  it('lists every story in a flat table, and opens the story panel when a row is picked', async () => {
    const el = mount('#tab=table');
    await settle(el);
    const root = el.shadowRoot!;
    const section = root.querySelector('[data-testid="usm-table"]');
    const table = section?.querySelector('dpk-table');
    if (!(table instanceof DpkTable)) throw new Error('missing dpk-table');
    await table.updateComplete;
    const rows = [...table.shadowRoot!.querySelectorAll<HTMLElement>('[data-row]')].map((row) => row.dataset['row']);
    expect(rows).toEqual(['u1', 'u2']);
    expect(root.querySelector('[data-testid="usm-story-panel"]')).toBeNull();

    table.shadowRoot!.querySelector<HTMLElement>('[data-row="u2"]')?.click();
    await settle(el);
    expect(el.api.navigation).toMatchObject({ tab: 'table', step: 's1', story: 'u2' });
    expect(root.querySelector('[data-testid="usm-story-panel"]')).not.toBeNull();
    // the table only ever navigates: a row pick is never recorded as a draft action
    expect(el.api.actions).toHaveLength(0);
    document.body.innerHTML = '';
  });

  it('makes milestone rows draggable and button-free', async () => {
    const el = mount();
    await settle(el);
    const root = el.shadowRoot!;
    const matrix = root.querySelector('dpk-matrix')!.shadowRoot!;
    const rowIdOf = (lead: Element): string => lead.getAttribute('slot')!.replace('row-head:', '');
    const rowHandle = (lead: Element) =>
      matrix.querySelector(`.matrix-row[data-row="${rowIdOf(lead)}"] .matrix-row-head`);
    const leads = [...root.querySelectorAll('.row-lead')].filter((lead) => lead.querySelector('dpk-inline-edit'));
    expect(leads.length).toBeGreaterThan(0);
    for (const lead of leads) {
      expect(rowHandle(lead)?.getAttribute('draggable')).toBe('true');
      expect(lead.querySelectorAll('button').length).toBe(0);
    }
    // the unassigned row is neither draggable nor a drop target
    const unassignedLead = root.querySelector('.row-head[data-unassigned="true"]')!.closest('.row-lead')!;
    expect(unassignedLead.textContent ?? '').toContain(m.unassigned);
    expect(rowHandle(unassignedLead)?.getAttribute('draggable')).toBe('false');
    document.body.innerHTML = '';
  });

  it('mounts the table, cards, composer, and navigation', async () => {
    const el = mount();
    await settle(el);
    const root = el.shadowRoot!;
    expect(root.querySelector('[data-testid="usm-map"]')).not.toBeNull();
    const corner = root.querySelector('.corner')?.textContent ?? '';
    expect(corner).toContain(m.groupAxisHeader);
    // Empty cell has no placeholder text.
    const cells = Array.from(root.querySelectorAll('.cell'));
    const emptyCell = cells.find(
      (c) => c.querySelectorAll('dpk-internal-usm-story-card').length === 0 && c.textContent?.includes(m.addCellButton),
    );
    expect(emptyCell?.textContent).not.toContain('空マス');
    // A card has no tools of its own: a click opens the story panel, where it is edited and commented on.
    // (Moving across activities goes through the drop-triggered dialog.)
    const cards = root.querySelectorAll('dpk-internal-usm-story-card');
    expect(cards.length).toBe(2);
    await Promise.all([...cards].map((card) => (card as LitElement).updateComplete));
    expect(cards[0]!.shadowRoot!.querySelectorAll('button')).toHaveLength(0);
    // the step column already names the step
    expect(cards[0]!.shadowRoot!.querySelector('[data-kind="step"]')).toBeNull();
    expect((cards[0] as HTMLElement).style.getPropertyValue('--usm-tone').trim()).toBe('var(--dpk-ink-faint)');
    (cards[0] as HTMLElement).click();
    await settle(el);
    const panel = root.querySelector('[data-testid="usm-story-panel"]')!;
    expect(panel.getAttribute('data-story')).toBe('u1');
    const thread = panel.querySelector('dpk-comment-thread') as LitElement;
    await thread.updateComplete;
    const form = thread.shadowRoot!.querySelector('form') as HTMLFormElement;
    const textarea = form.querySelector('textarea')!;
    // an empty comment is not added
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    expect(el.api.actions.filter((a) => a.type === 'ADD_STORY_COMMENT')).toHaveLength(0);
    textarea.value = 'hello';
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    await settle(el);
    await thread.updateComplete;
    // A story comment is part of the map, not a review comment for the agent.
    expect(el.api.comments).toHaveLength(0);
    const added = el.api.actions.find((a) => a.type === 'ADD_STORY_COMMENT');
    expect(added?.target.id).toBe('u1');
    expect(added?.payload).toMatchObject({ body: 'hello' });
    expect(textarea.value).toBe('');
    const commentBodies = () => thread.shadowRoot!.querySelectorAll('.thread-item-body');
    expect([...commentBodies()].map((body) => body.textContent)).toEqual(['hello']);
    // the card counts the comments kept on it
    await (cards[0] as LitElement).updateComplete;
    expect(cards[0]!.shadowRoot!.querySelector('[data-kind="comments"]')?.textContent?.trim()).toBe('1');
    expect(cards[0]!.shadowRoot!.querySelector('[data-kind="review"]')).toBeNull();
    // a review comment on the story is written in the review rail, and the card shows it apart
    (panel.querySelector('[data-role="review-story"]') as HTMLButtonElement).click();
    await settle(el);
    expect(el.notesOpen).toBe(true);
    el.api.comment('story:u1', 'split this story');
    await settle(el);
    await (cards[0] as LitElement).updateComplete;
    expect(cards[0]!.shadowRoot!.querySelector('[data-kind="review"]')?.textContent?.trim()).toBe('1');
    expect(cards[0]!.shadowRoot!.querySelector('[data-kind="comments"]')?.textContent?.trim()).toBe('1');
    // a kept comment is deleted from the panel
    (thread.shadowRoot!.querySelector('[data-role="delete-comment"]') as HTMLButtonElement).click();
    await settle(el);
    await thread.updateComplete;
    expect(commentBodies()).toHaveLength(0);
    // Navigation follows.
    el.api.navigate({ step: 's2', story: 'u2' });
    await settle(el);
    expect(location.hash).toContain('step=s2');
    expect(location.hash).toContain('story=u2');
  });

  it('renders its own text in the page language, and in English without one', async () => {
    const english = mount();
    await settle(english);
    const englishCorner = english.shadowRoot?.querySelector('.corner')?.textContent ?? '';
    expect(englishCorner).toContain(m.groupAxisHeader);

    document.documentElement.lang = 'ja-JP';
    try {
      const japanese = mount();
      await settle(japanese);
      const ja = usmMessages('ja');
      expect(japanese.locale).toBe('ja');
      const japaneseCorner = japanese.shadowRoot?.querySelector('.corner')?.textContent ?? '';
      expect(japaneseCorner).toContain(ja.groupAxisHeader);
    } finally {
      document.documentElement.removeAttribute('lang');
    }

    // The template element's own `lang` wins over the page's.
    const own = mount('', 'ja');
    await settle(own);
    expect(own.locale).toBe('ja');
  });

  it('defines each milestone on the milestones tab without repeating its stories', async () => {
    window.location.hash = '#tab=milestones';
    const withDetails = {
      ...base,
      milestones: [
        { id: 'mvp', name: 'MVP', timeframe: '2026-10', description: 'Minimum feature set' },
        { id: 'v1', name: 'v1' },
      ],
    };
    document.body.innerHTML = `
    <dpk-template-usm storage="memory">
      <script type="application/json">${JSON.stringify(withDetails)}</script>
    </dpk-template-usm>`;
    const el = document.querySelector('dpk-template-usm') as DpkTemplateUsm;
    await settle(el);
    el.api.dispatch({ type: 'SET_MILESTONE_NAME', target: 'milestone:mvp', payload: { name: 'MVP+' } });
    await settle(el);
    const section = el.shadowRoot!.querySelector('[data-testid="usm-milestones"]')!;
    const cards = [...section.querySelectorAll('[data-milestone-card]')];
    expect(cards.map((card) => card.getAttribute('data-milestone-card'))).toEqual(['mvp', 'v1']);
    const mvp = cards[0]!;
    expect((mvp.querySelector('dpk-inline-edit') as unknown as { value: string }).value).toBe('MVP+');
    expect(mvp.querySelector('.ms-timeframe')?.textContent).toContain('2026-10');
    expect(mvp.querySelector('.ms-description')?.textContent?.trim()).toBe('Minimum feature set');
    // the tab defines the slices; the stories themselves stay on the map
    expect(section.querySelector('dpk-internal-usm-story-card, a[href*="story="]')).toBeNull();
    // a milestone without a description says so
    expect(cards[1]!.querySelector('.ms-description[data-empty="true"]')?.textContent?.trim()).toBe(
      m.milestoneNoDescription,
    );
    // read as a timeline: one node per milestone on a single rail, in map order
    const timeline = section.querySelector('ol.ms-timeline')!;
    expect([...timeline.querySelectorAll('[data-milestone-card] .ms-node')].map((n) => n.textContent?.trim())).toEqual([
      '1',
      '2',
    ]);
    // a milestone without a timeframe says it is not set yet
    expect(cards[1]!.querySelector('.ms-timeframe[data-empty="true"]')?.textContent?.trim()).toBe(m.timeframeUnset);
    // without statuses there is no progress to show
    expect(mvp.querySelector('.ms-breakdown')).toBeNull();
    expect(cards[1]!.querySelector('.ms-breakdown')).toBeNull();
    // the next milestone is added at the end of the rail
    const last = timeline.lastElementChild!;
    expect(last.classList.contains('ms-add')).toBe(true);
    expect(last.querySelector('button')?.textContent?.trim()).toBe(m.newMilestoneButton);
    document.body.innerHTML = '';
  });

  it('opens the step picker on a cross-activity drop and moves on submit', async () => {
    const twoActivities = {
      ...base,
      activities: [...base.activities, { id: 'a2', name: 'A2', steps: [{ id: 's3', name: 'S3' }] }],
    };
    window.location.hash = '#view=group';
    document.body.innerHTML = `
    <dpk-template-usm storage="memory">
      <script type="application/json">${JSON.stringify(twoActivities)}</script>
    </dpk-template-usm>`;
    const el = document.querySelector('dpk-template-usm') as DpkTemplateUsm;
    await settle(el);
    const root = el.shadowRoot!;
    const targetCell = root.querySelector('[data-testid="group-cell-a2-mvp"]')!;
    const drop = new Event('drop', { bubbles: true, cancelable: true }) as Event & {
      clientY: number;
      dataTransfer: { getData: (format: string) => string };
    };
    drop.clientY = 4;
    drop.dataTransfer = { getData: () => 'u1' };
    targetCell.dispatchEvent(drop);
    await settle(el);
    const dialog = root.querySelector('#move-dialog');
    expect(dialog).not.toBeNull();
    const trigger = dialog!.querySelector('.dpk-rich-select') as HTMLButtonElement;
    // the dialog lists the target activity's steps (bare ids); the activity is fixed
    expect(trigger.textContent?.trim()).toBe('S3');
    trigger.click();
    await settle(el);
    (dialog!.querySelector('[role="option"][data-value="s3"]') as HTMLElement).click();
    await settle(el);
    [...dialog!.querySelectorAll('button')].find((b) => b.textContent?.includes(m.moveConfirm))!.click();
    await settle(el);
    const moved = el.api.actions.find((a) => a.type === 'MOVE_STORY');
    expect(moved?.payload).toMatchObject({ activityId: 'a2', stepId: 's3', milestoneId: 'mvp' });
    expect(el.api.state.stories.find((story) => story.id === 'u1')).toMatchObject({
      activityId: 'a2',
      stepId: 's3',
    });
    expect(root.querySelector('#move-dialog')).toBeNull();
    document.body.innerHTML = '';
  });
});

describe('usm change notices', () => {
  const mountWithChange = (target: string, hash = ''): DpkTemplateUsm => {
    window.location.hash = hash;
    document.body.innerHTML = `
      <dpk-template-usm storage="memory">
        ${changeLogScript(target)}
        <script type="application/json">${JSON.stringify(base)}</script>
      </dpk-template-usm>`;
    return document.querySelector('dpk-template-usm') as DpkTemplateUsm;
  };

  beforeEach(() => {
    window.location.hash = '';
    document.body.innerHTML = '';
  });

  it('"Show" on a story goes back to the map and highlights its card', async () => {
    const el = mountWithChange('story:u2', '#tab=milestones');
    await settle(el);
    const highlighted = await showChange(el);
    expect(highlighted?.localName).toBe('dpk-internal-usm-story-card');
    expect(highlighted?.getAttribute('data-story')).toBe('u2');
    expect(el.navigation['tab']).toBeUndefined();
  });

  it('"Show" on a step or an activity highlights its head on the map', async () => {
    const step = mountWithChange('step:s2');
    await settle(step);
    const column = await showChange(step);
    expect(column?.classList.contains('col-head')).toBe(true);
    expect(column?.getAttribute('data-dpk-target')).toBe('step:a1.s2');

    const activity = mountWithChange('activity:a1', '#tab=statuses');
    await settle(activity);
    expect((await showChange(activity))?.classList.contains('act-head')).toBe(true);
  });

  it('"Show" on a milestone opens the milestones page at its entry', async () => {
    const el = mountWithChange('milestone:mvp');
    await settle(el);
    const entry = await showChange(el);
    expect(el.navigation['tab']).toBe('milestones');
    expect(entry?.classList.contains('ms-entry')).toBe(true);
  });
});
