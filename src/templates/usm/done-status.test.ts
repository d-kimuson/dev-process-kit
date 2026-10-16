// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';

import type { DraftAction } from '../../core/types';
import type { DpkTemplateUsm } from './element';

import '../../index';
import { applyUsmAction } from './apply';
import { remainingSharesOf } from './burndown';
import { usmDefinitionFor } from './definition';
import { dependencyOf } from './dependencies';
import { doneStatusOf, isFinishedStatus, statusesToDone } from './done-status';
import { mapFilterOf, passesMapFilter } from './map-filter';
import { usmMessages } from './messages';
import { parseUsmBase, type UsmState } from './model';
import { presentStatusOverview } from './status-overview';
import { statusViews } from './status-view';
import { weightDividersOf } from './weight-split';

const m = usmMessages('en');
const definition = usmDefinitionFor('en');

const story = (id: string, statusId: string, extra: Record<string, unknown> = {}) => ({
  id,
  name: id.toUpperCase(),
  activityId: 'a1',
  stepId: 's1',
  statusId,
  ...extra,
});

const raw = {
  features: ['estimates'],
  activities: [{ id: 'a1', name: 'A1', steps: [{ id: 's1', name: 'S1' }] }],
  statuses: [
    { id: 'idea', name: 'Idea', weight: 7 },
    { id: 'demo', name: 'Demo', weight: 3 },
    { id: 'done', name: 'Done' },
    { id: 'shipped', name: 'Shipped' },
  ],
  stories: [
    story('u1', 'idea', { blockedBy: ['u3'] }),
    story('u2', 'demo'),
    story('u3', 'done'),
    story('u4', 'shipped'),
  ],
};

/** The map with `Done` counted as done: `Shipped` comes after it. */
const base = parseUsmBase({ ...raw, doneStatusId: 'done' });

const act = (type: string, target: { type: string; id: string }, payload: unknown): DraftAction => {
  return { id: 'x', type, target, payload, createdAt: '2026-01-01T00:00:00Z' };
};

const apply = (state: UsmState, type: string, target: { type: string; id: string }, payload: unknown) => {
  return applyUsmAction(state, act(type, target, payload));
};

const ids = (statuses: readonly { readonly id: string }[]): readonly string[] => statuses.map((status) => status.id);

describe('usm done status: model', () => {
  it('counts a story done from the last status on, unless the map names another', () => {
    const plain = parseUsmBase(raw);
    expect(plain).not.toHaveProperty('doneStatusId');
    expect(doneStatusOf(plain)?.id).toBe('shipped');
    expect(doneStatusOf(base)?.id).toBe('done');
    expect(doneStatusOf(parseUsmBase({ ...raw, statuses: [], stories: [] }))).toBeUndefined();
  });

  it('counts the statuses past the done one as done too', () => {
    expect(['idea', 'demo', 'done', 'shipped'].map((id) => isFinishedStatus(base, id))).toEqual([
      false,
      false,
      true,
      true,
    ]);
    expect(isFinishedStatus(base, undefined)).toBe(false);
    expect(ids(statusesToDone(base))).toEqual(['idea', 'demo', 'done']);
  });

  it('rejects a done status the map does not have', () => {
    expect(() => parseUsmBase({ ...raw, doneStatusId: 'nope' })).toThrow(/unknown doneStatusId/);
  });
});

describe('usm done status: actions', () => {
  it('counts another status as done, and keeps the draft as it is for the one already', () => {
    const target = { type: 'status', id: 'demo' };
    expect(apply(base, 'SET_DONE_STATUS', target, {})?.doneStatusId).toBe('demo');
    expect(apply(base, 'SET_DONE_STATUS', { type: 'status', id: 'done' }, {})).toBe(base);
    expect(apply(base, 'SET_DONE_STATUS', { type: 'status', id: 'nope' }, {})).toBeNull();
    expect(definition.describe(act('SET_DONE_STATUS', target, {}), base, base)).toMatchObject({
      title: m.setDoneStatus,
      targetLabel: 'Status · Demo',
      summary: '“Done” → “Demo”',
    });
  });

  it('falls back to the last status once the done one is deleted', () => {
    const state = apply(base, 'DELETE_STATUS', { type: 'status', id: 'done' }, {});
    expect(state).not.toHaveProperty('doneStatusId');
    expect(doneStatusOf(state!)?.id).toBe('shipped');
  });
});

describe('usm done status: what it decides', () => {
  it('frees the stories waiting on one that is done', () => {
    expect(dependencyOf(base, 'u1').openBlockers).toBe(0);
    expect(dependencyOf({ ...base, doneStatusId: 'shipped' }, 'u1').openBlockers).toBe(1);
  });

  it('leaves no work ahead of a story that is done, and shares the work between the statuses before it', () => {
    expect(remainingSharesOf(base)).toEqual([1, 1, 0, 0]);
    const weighted = { ...base, weighted: true };
    expect(remainingSharesOf(weighted)).toEqual([1, 0.3, 0, 0]);
    expect(weightDividersOf(statusesToDone(weighted))).toEqual([7]);
  });

  it('leaves the stories that are done off the map until the reader shows them', () => {
    const shown = (nav: Record<string, string>) => {
      const filter = mapFilterOf(base, nav);
      return base.stories.filter((each) => passesMapFilter(filter, each)).map((each) => each.id);
    };
    expect(shown({})).toEqual(['u1', 'u2']);
    expect(shown({ done: 'show' })).toEqual(['u1', 'u2', 'u3', 'u4']);
    // a status that is done cannot be chosen while they are out
    expect([...mapFilterOf(base, { status: 'demo,shipped' }).status]).toEqual(['demo']);
  });

  it('fills the progress ring at the done status', () => {
    expect(statusViews(base).map((view) => view.progress)).toEqual([0, 0.5, 1, 1]);
    expect(presentStatusOverview(base).rows.map((row) => [row.id, row.progress, row.done])).toEqual([
      ['idea', 0, false],
      ['demo', 0.5, false],
      ['done', 1, true],
      ['shipped', 1, false],
    ]);
  });
});

describe('usm done status: element', () => {
  beforeEach(() => {
    window.location.hash = '';
    document.body.innerHTML = '';
  });

  it('picks the done status on the statuses tab', async () => {
    window.location.hash = '#tab=statuses';
    document.body.innerHTML = `
      <dpk-template-usm storage="memory">
        <script type="application/json">${JSON.stringify(raw)}</script>
      </dpk-template-usm>`;
    const el = document.querySelector('dpk-template-usm') as DpkTemplateUsm;
    await el.api.ready;
    await el.updateComplete;
    const section = el.shadowRoot!.querySelector('[data-testid="usm-statuses"]')!;
    const choices = () => [...section.querySelectorAll<HTMLInputElement>('input[data-role="done"]')];
    expect(choices().map((choice) => choice.checked)).toEqual([false, false, false, true]);
    expect(new Set(choices().map((choice) => choice.name)).size).toBe(1);
    choices()[2]!.click();
    await el.updateComplete;
    expect(el.api.state.doneStatusId).toBe('done');
    expect(el.api.actions.map((action) => [action.type, action.target])).toEqual([
      ['SET_DONE_STATUS', { type: 'status', id: 'done' }],
    ]);
    expect(choices().map((choice) => choice.checked)).toEqual([false, false, true, false]);
  });
});
