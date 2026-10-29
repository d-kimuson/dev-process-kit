// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { DraftAction } from '../../core/types';

import '../../index';
import { coreMessages } from '../../core/messages';
import { applyUsmAction } from './apply';
import { usmDefinitionFor } from './definition';
import { DpkViewUsm } from './element';
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
    expect(definition.resolveNavigation(on, { tab: 'burndown' })['tab']).toBe('burndown');
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

  it('shows an estimate on its page, and a status, label or member nowhere the page can go', () => {
    expect(definition.navigationFor?.(on, { type: 'estimate', id: 'S' })).toEqual({ tab: 'burndown' });
    expect(definition.navigationFor?.(off, { type: 'estimate', id: 'S' })).toBeNull();
    // the map defines these in the settings dialog, which "Show" opens instead of navigating
    expect(definition.navigationFor?.(on, { type: 'status', id: 'todo' })).toBeNull();
    expect(definition.navigationFor?.(on, { type: 'label', id: 'dev' })).toBeNull();
    expect(definition.navigationFor?.(on, { type: 'member', id: 'kim' })).toBeNull();
  });
});

describe('usm features: element', () => {
  const settle = async (el: DpkViewUsm): Promise<void> => {
    await el.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 0));
    await el.updateComplete;
  };

  const mount = async (hash: string, base: object = raw): Promise<DpkViewUsm> => {
    window.location.hash = hash;
    document.body.innerHTML = `
      <dpk-view-usm storage="memory">
        <script type="application/json">${JSON.stringify(base)}</script>
      </dpk-view-usm>`;
    const el = document.querySelector('dpk-view-usm') as DpkViewUsm;
    await el.api.ready;
    await settle(el);
    return el;
  };

  const tabs = (el: DpkViewUsm) =>
    [...el.shadowRoot!.querySelectorAll('.page-tabs [role="tab"]')].map((tab) => tab.getAttribute('data-tab'));
  /** The settings sections after the kit's own `display`, in reading order. */
  const settingsSections = (el: DpkViewUsm) =>
    el.settingsSections.map((section) => section.id).filter((id) => id !== 'display');

  beforeEach(() => {
    window.location.hash = '';
    document.body.innerHTML = '';
  });

  it('leaves out everything of a feature that is off', async () => {
    const el = await mount('#story=u1');
    const root = el.shadowRoot!;
    expect(tabs(el)).toEqual(['map', 'table', 'milestones']);
    // a member is defined in the settings, and its section is part of the feature too
    expect(settingsSections(el)).toEqual(['statuses', 'labels']);
    const panel = root.querySelector('[data-testid="usm-story-panel"]')!;
    expect(panel.querySelector('[data-estimate]')).toBeNull();
    expect(panel.querySelector('[data-assignee]')).toBeNull();
    const card = root.querySelector('dpk-internal-usm-story-card[data-story="u1"]') as HTMLElement & {
      updateComplete: Promise<boolean>;
    };
    await card.updateComplete;
    expect(card.shadowRoot!.querySelector('[data-kind="estimate"]')).toBeNull();
    expect(card.shadowRoot!.querySelector('[data-kind="assignee"]')).toBeNull();
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
    expect(tabs(el)).toEqual(['map', 'table', 'milestones', 'burndown']);
    expect(option('estimates').getAttribute('aria-checked')).toBe('true');
    option('assignees').click();
    await settle(el);
    expect(tabs(el)).toEqual(['map', 'table', 'milestones', 'burndown']);
    expect(settingsSections(el)).toEqual(['statuses', 'labels', 'members']);
    option('estimates').click();
    await settle(el);
    expect(el.api.state.features).toEqual(['assignees']);
  });

  it("builds the page's own sections only while the dialog is open", async () => {
    const built = vi.spyOn(
      DpkViewUsm.prototype as unknown as { renderSettingsSections: () => readonly unknown[] },
      'renderSettingsSections',
    );
    const el = await mount('');
    const root = el.shadowRoot!;
    // Closed, the panel is an empty frame: nothing of the page's state is described.
    expect(built).not.toHaveBeenCalled();
    const trigger = root.querySelector('.dpk-settings-trigger') as HTMLButtonElement;
    trigger.click();
    await settle(el);
    expect(built).toHaveBeenCalled();
    expect([...root.querySelectorAll('.dpk-dialog-nav-item')].map((item) => item.textContent?.trim())).toEqual([
      coreMessages('en').settingsDisplay,
      coreMessages('en').settingsAppearance,
      m.statusesSection,
      m.labelsSection,
    ]);
    // Several sections keep one frame, so switching one never resizes or moves the panel.
    expect(root.querySelector('#dpk-settings')?.getAttribute('data-height')).toBe('fixed');
    // Closed again, a render builds none of them.
    trigger.click();
    await settle(el);
    built.mockClear();
    el.requestUpdate();
    await settle(el);
    expect(built).not.toHaveBeenCalled();
    built.mockRestore();
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
    // The `<dialog>` stays mounted so it can fire `close` and hand focus back, so a
    // closed one is still in the tree: the press closed it, it did not remove it.
    const settings = root.querySelector('#dpk-settings') as HTMLDialogElement;
    expect(settings).not.toBeNull();
    expect(settings.open).toBe(false);
  });
});
