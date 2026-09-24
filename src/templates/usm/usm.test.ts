import { LitElement } from 'lit';
// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';

import type { DraftAction } from '../../core/types';
import type { DpkTemplateUsm } from './element';

import { composerMessages } from '../../components/comment-composer/messages';
import { DpkComponentInlineEdit } from '../../components/inline-edit';
import { applyUsmAction } from './apply';
import '../../index';
import { usmDefinitionFor } from './definition';
import { dropAfter, resolveGroupDrop, resolveMilestoneDrop } from './drop';
import { usmMessages } from './messages';
import { parseUsmBase } from './model';

const usmDefinition = usmDefinitionFor('en');
const m = usmMessages('en');
const composerM = composerMessages('en');

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
    const editor = el.shadowRoot?.querySelector('.col-head dpk-component-inline-edit');
    if (!(editor instanceof DpkComponentInlineEdit)) throw new Error('missing editor');
    editor.startEditing();
    await editor.updateComplete;
    const input = editor.shadowRoot?.querySelector('input');
    if (!input) throw new Error('missing input');
    input.value = 'Draft S1';
    input.dispatchEvent(new Event('input'));
    el.api.dispatch({ type: 'REORDER_STEP', target: 'step:a1.s2', payload: { after: null } });
    await settle(el);
    expect([...el.shadowRoot!.querySelectorAll('.col-head dpk-component-inline-edit')][1]).toBe(editor);
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
    const tabs = [...root.querySelectorAll('.view-tabs .tab')].map((t) => t.textContent?.trim());
    expect(tabs).toEqual([m.activityGroup, m.groupViewTab]);
    expect(root.querySelector('.view-tabs .tab[data-current="true"]')?.textContent?.trim()).toBe(m.groupViewTab);
    // one header per activity, no step columns
    expect(root.querySelectorAll('.act-head dpk-component-inline-edit').length).toBe(1);
    expect(root.querySelectorAll('.col-head').length).toBe(0);
    // u1/u2 share the activity column and the unassigned + mvp rows resolve
    const cell = root.querySelector('[data-testid="group-cell-a1-mvp"]');
    expect(cell).not.toBeNull();
    expect(cell!.querySelectorAll('dpk-internal-usm-story-card').length).toBe(2);
    // dropping inside the activity view keeps the dragged story's own step.
    // jsdom has no DataTransfer/DragEvent, and it swallows a synthetic dragstart
    // outright — so the pointer wiring is verified in a real browser, and here the
    // extracted drop logic is exercised directly.
    const dropInput = resolveGroupDrop(parseUsmBase(base), 'a1', 'mvp', 'u2', 'u1', 'before');
    expect(dropInput?.payload).toMatchObject({ activityId: 'a1', stepId: 's1', milestoneId: 'mvp', after: null });
    expect(resolveGroupDrop(parseUsmBase(base), 'a1', 'mvp', 'u2', 'u1', 'after')).toMatchObject({
      payload: { after: 'u1' },
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

  it('resolves milestone drops to reorder anchors', () => {
    const ids = ['mvp', 'v1', 'v2'];
    expect(resolveMilestoneDrop(ids, 'v1', 'mvp', 'before')).toMatchObject({
      type: 'REORDER_MILESTONE',
      target: { type: 'milestone', id: 'v1' },
      payload: { after: null },
    });
    expect(resolveMilestoneDrop(ids, 'v1', 'v2', 'after')).toMatchObject({ payload: { after: 'v2' } });
    expect(resolveMilestoneDrop(ids, 'v1', null, 'end')).toMatchObject({ payload: { after: 'v2' } });
    expect(resolveMilestoneDrop(ids, 'gone', null, 'end')).toBeNull();
    const state = parseUsmBase(base);
    expect(resolveMilestoneDrop(['mvp'], 'mvp', null, 'end')).toMatchObject({ payload: { after: null } });
    expect(state).toBeDefined();
  });

  it('makes milestone rows draggable and button-free', async () => {
    const el = mount();
    await settle(el);
    const root = el.shadowRoot!;
    const heads = [...root.querySelectorAll('.row-head')].filter(
      (h) =>
        (h.querySelector('dpk-component-inline-edit') as unknown as { value?: string } | null)?.value !== undefined,
    );
    expect(heads.length).toBeGreaterThan(0);
    for (const head of heads) {
      expect(head.getAttribute('draggable')).toBe('true');
      expect(head.querySelectorAll('button').length).toBe(0);
    }
    // the unassigned row is neither draggable nor a drop target
    const unassigned = [...root.querySelectorAll('.row-head')].find((h) =>
      (h.textContent ?? '').includes(m.unassigned),
    )!;
    expect(unassigned.getAttribute('draggable')).toBe('false');
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
    // Three icon-only buttons per card: edit, comment, delete.
    // (Moving across activities goes through the drop-triggered dialog.)
    const cards = root.querySelectorAll('dpk-internal-usm-story-card');
    expect(cards.length).toBe(2);
    await Promise.all([...cards].map((card) => (card as LitElement).updateComplete));
    const buttons = cards[0]!.shadowRoot!.querySelectorAll('.dpk-icon-btn');
    expect(buttons.length).toBe(3);
    expect([...buttons].every((b) => b.textContent?.trim() === '' && !!b.getAttribute('aria-label'))).toBe(true);
    // Open the comment composer and dispatch a comment for that story.
    const cardBefore = cards[0]!.getBoundingClientRect().height;
    (buttons[1] as HTMLButtonElement).click();
    await el.updateComplete;
    await (cards[0] as LitElement).updateComplete;
    const composer = cards[0]!.shadowRoot!.querySelector('.comment-pop');
    expect(composer).not.toBeNull();
    // only the clicked card is in commenting mode
    expect(cards[0]!.getAttribute('data-mode')).toBe('commenting');
    expect(cards[1]!.getAttribute('data-mode')).toBe('view');
    // The tooltip must not move the card.
    expect(cards[0]!.getBoundingClientRect().height).toBe(cardBefore);
    const textarea = composer!.querySelector('textarea')!;
    textarea.value = 'hello';
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    if (cards[0] instanceof LitElement) await cards[0].updateComplete;
    const send = Array.from(composer!.querySelectorAll('button')).find((b) =>
      b.textContent?.includes(composerM.submit),
    )!;
    expect(send).toBeTruthy();
    send.click();
    await settle(el);
    expect(el.api.actions.some((a) => a.type === 'comment' && a.target.id === 'u1')).toBe(true);
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
    const select = dialog!.querySelector('select') as HTMLSelectElement;
    // the dialog lists the target activity's steps (bare ids); the activity is fixed
    expect(select.querySelector('option')?.textContent?.trim()).toBe('S3');
    select.value = 's3';
    select.dispatchEvent(new Event('change', { bubbles: true }));
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
