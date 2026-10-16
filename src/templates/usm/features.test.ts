// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';

import type { DraftAction } from '../../core/types';
import type { DpkTemplateUsm } from './element';

import '../../index';
import { applyUsmAction } from './apply';
import { usmDefinitionFor } from './definition';
import { filterOptionIds } from './map-filter';
import { usmMessages } from './messages';
import { hasFeature, parseUsmBase, type UsmState } from './model';

const m = usmMessages('en');
const definition = usmDefinitionFor('en');

const raw = {
  activities: [{ id: 'a1', name: 'A1', steps: [{ id: 's1', name: 'S1' }] }],
  statuses: [
    { id: 'todo', name: 'Todo' },
    { id: 'done', name: 'Done' },
  ],
  estimates: [{ id: 'S', name: 'S', points: 1 }],
  members: [{ id: 'kim', name: 'Kimura' }],
  stories: [{ id: 'u1', name: 'U1', activityId: 'a1', stepId: 's1', estimateId: 'S', assigneeId: 'kim' }],
};

const off = parseUsmBase(raw);
const on = parseUsmBase({ ...raw, features: ['assignees', 'estimates'] });
const page = { type: 'page', id: 'usm' };

const act = (type: string, target: { type: string; id: string }, payload: unknown): DraftAction => {
  return { id: 'x', type, target, payload, createdAt: '2026-01-01T00:00:00Z' };
};

const setFeature = (state: UsmState, feature: string, enabled: boolean) =>
  applyUsmAction(state, act('SET_FEATURE', page, { feature, enabled }));

describe('usm features: model', () => {
  it('turns the optional features off unless the base names them, and keeps them in the kit’s order', () => {
    expect(off.features).toEqual([]);
    expect(hasFeature(off, 'estimates')).toBe(false);
    expect(on.features).toEqual(['estimates', 'assignees']);
    expect(hasFeature(on, 'assignees')).toBe(true);
  });

  it('rejects an unknown feature and the same feature twice', () => {
    expect(() => parseUsmBase({ ...raw, features: ['gantt'] })).toThrow();
    // the status weights are switched on beside the estimate scale, not as a feature
    expect(() => parseUsmBase({ ...raw, features: ['weights'] })).toThrow();
    expect(() => parseUsmBase({ ...raw, features: ['estimates', 'estimates'] })).toThrow(/twice/);
  });
});

describe('usm features: actions', () => {
  it('turns a feature on and off, keeping what it holds while it is off', () => {
    const enabled = setFeature(off, 'estimates', true);
    expect(enabled?.features).toEqual(['estimates']);
    expect(setFeature(enabled!, 'assignees', true)?.features).toEqual(['estimates', 'assignees']);
    const disabled = setFeature(on, 'estimates', false);
    expect(disabled?.features).toEqual(['assignees']);
    expect(disabled?.estimates).toEqual(on.estimates);
    expect(disabled?.stories[0]?.estimateId).toBe('S');
  });

  it('leaves the draft as it is when the feature already stands that way', () => {
    expect(setFeature(off, 'estimates', false)).toBe(off);
    expect(setFeature(on, 'assignees', true)).toBe(on);
    expect(setFeature(off, 'gantt', true)).toBeNull();
  });

  it('describes turning a feature on and off by its name', () => {
    expect(
      definition.describe(act('SET_FEATURE', page, { feature: 'estimates', enabled: true }), off, off),
    ).toMatchObject({ title: m.enableFeature, tone: 'create', summary: m.featureName('estimates') });
    expect(
      definition.describe(act('SET_FEATURE', page, { feature: 'assignees', enabled: false }), on, on),
    ).toMatchObject({ title: m.disableFeature, tone: 'delete', summary: m.featureName('assignees') });
  });
});

describe('usm features: navigation', () => {
  it('opens the tab of a feature only while it is on', () => {
    expect(definition.resolveNavigation(off, { tab: 'burndown' })['tab']).toBeUndefined();
    expect(definition.resolveNavigation(off, { tab: 'members' })['tab']).toBeUndefined();
    expect(definition.resolveNavigation(on, { tab: 'burndown' })['tab']).toBe('burndown');
    expect(definition.resolveNavigation(on, { tab: 'members' })['tab']).toBe('members');
  });

  it('offers the estimate and assignee filters only while their feature is on', () => {
    expect(filterOptionIds(off, 'estimate')).toEqual([]);
    expect(filterOptionIds(off, 'assignee')).toEqual([]);
    expect(definition.resolveNavigation(off, { estimate: 'S', assignee: 'kim' })).not.toHaveProperty('estimate');
    expect(definition.resolveNavigation(off, { assignee: 'kim' })).not.toHaveProperty('assignee');
    expect(definition.resolveNavigation(on, { estimate: 'S', assignee: 'kim' })).toMatchObject({
      estimate: 'S',
      assignee: 'kim',
    });
  });

  it('shows an estimate or a member on its tab only while its feature is on', () => {
    expect(definition.navigationFor?.(on, { type: 'estimate', id: 'S' })).toEqual({ tab: 'burndown' });
    expect(definition.navigationFor?.(on, { type: 'member', id: 'kim' })).toEqual({ tab: 'members' });
    expect(definition.navigationFor?.(off, { type: 'estimate', id: 'S' })).toBeNull();
    expect(definition.navigationFor?.(off, { type: 'member', id: 'kim' })).toBeNull();
  });
});

describe('usm features: element', () => {
  const settle = async (el: DpkTemplateUsm): Promise<void> => {
    await el.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 0));
    await el.updateComplete;
  };

  const mount = async (hash: string, base: object = raw): Promise<DpkTemplateUsm> => {
    window.location.hash = hash;
    document.body.innerHTML = `
      <dpk-template-usm storage="memory">
        <script type="application/json">${JSON.stringify(base)}</script>
      </dpk-template-usm>`;
    const el = document.querySelector('dpk-template-usm') as DpkTemplateUsm;
    await el.api.ready;
    await settle(el);
    return el;
  };

  const tabs = (el: DpkTemplateUsm) =>
    [...el.shadowRoot!.querySelectorAll('.page-tabs [role="tab"]')].map((tab) => tab.getAttribute('data-tab'));

  beforeEach(() => {
    window.location.hash = '';
    document.body.innerHTML = '';
  });

  it('leaves out everything of a feature that is off', async () => {
    const el = await mount('#story=u1');
    const root = el.shadowRoot!;
    expect(tabs(el)).toEqual(['map', 'milestones', 'statuses', 'labels']);
    const panel = root.querySelector('[data-testid="usm-story-panel"]')!;
    expect(panel.querySelector('[data-estimate]')).toBeNull();
    expect(panel.querySelector('[data-assignee]')).toBeNull();
    const card = root.querySelector('dpk-internal-usm-story-card[data-story="u1"]') as HTMLElement & {
      updateComplete: Promise<boolean>;
    };
    await card.updateComplete;
    expect(card.shadowRoot!.querySelector('.estimate-chip')).toBeNull();
    expect(card.shadowRoot!.querySelector('.assignee-avatar')).toBeNull();
    expect(root.querySelector('[data-filter-trigger="estimate"]')).toBeNull();
    expect(root.querySelector('[data-filter-trigger="assignee"]')).toBeNull();
  });

  it('offers each optional feature as a setting whose flip is a SET_FEATURE change', () => {
    const state = parseUsmBase({ ...raw, features: ['assignees'] });
    const settings = usmDefinitionFor('ja').settings?.(state);
    expect(settings?.note).toBe(usmMessages('ja').featuresNote);
    expect(settings?.items.map((item) => [item.key, item.label, item.on])).toEqual([
      ['estimates', usmMessages('ja').featureName('estimates'), false],
      ['assignees', usmMessages('ja').featureName('assignees'), true],
    ]);
    expect(settings?.items[1]?.toggle).toEqual({
      type: 'SET_FEATURE',
      target: { type: 'page', id: 'usm' },
      payload: { feature: 'assignees', enabled: false },
    });
  });

  it('turns a feature on from the settings in the shared header, as a change of the draft', async () => {
    const el = await mount('');
    const root = el.shadowRoot!;
    expect(root.querySelector('[data-features-trigger]')).toBeNull();
    const trigger = root.querySelector('.dpk-settings-trigger') as HTMLButtonElement;
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    trigger.click();
    await settle(el);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    const option = (feature: string) =>
      root.querySelector(`#dpk-settings [data-setting="${feature}"]`) as HTMLButtonElement;
    expect(option('estimates').getAttribute('aria-checked')).toBe('false');
    expect(option('estimates').textContent).toContain(usmMessages('en').featureName('estimates'));
    option('estimates').click();
    await settle(el);
    expect(el.api.state.features).toEqual(['estimates']);
    expect(el.api.actions.at(-1)).toMatchObject({
      type: 'SET_FEATURE',
      payload: { feature: 'estimates', enabled: true },
    });
    expect(tabs(el)).toEqual(['map', 'milestones', 'statuses', 'labels', 'burndown']);
    expect(option('estimates').getAttribute('aria-checked')).toBe('true');
    option('assignees').click();
    await settle(el);
    expect(tabs(el)).toEqual(['map', 'milestones', 'statuses', 'labels', 'members', 'burndown']);
    option('estimates').click();
    await settle(el);
    expect(el.api.state.features).toEqual(['assignees']);
  });

  it('closes the settings on a press outside them', async () => {
    const el = await mount('');
    const root = el.shadowRoot!;
    (root.querySelector('.dpk-settings-trigger') as HTMLButtonElement).click();
    await settle(el);
    expect(root.querySelector('#dpk-settings')).not.toBeNull();
    // jsdom has no PointerEvent; the listener only reads the path and the button.
    document.body.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, composed: true, button: 0 }));
    await settle(el);
    expect(root.querySelector('#dpk-settings')).toBeNull();
  });
});
