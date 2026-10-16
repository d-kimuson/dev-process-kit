// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';

import type { DraftAction } from '../../core/types';
import type { DpkTemplateUsm } from './element';

import '../../index';
import { applyUsmAction } from './apply';
import { usmDefinitionFor } from './definition';
import { resolveActivityDrop, resolveStepDrop } from './drop';
import { usmMessages } from './messages';
import { parseUsmBase } from './model';

const m = usmMessages('en');
const definition = usmDefinitionFor('en');

const raw = {
  activities: [
    {
      id: 'a1',
      name: 'A1',
      steps: [
        { id: 's1', name: 'S1' },
        { id: 's2', name: 'S2' },
        { id: 's3', name: 'S3' },
      ],
    },
    { id: 'a2', name: 'A2', steps: [{ id: 't1', name: 'T1' }] },
    { id: 'a3', name: 'A3', steps: [{ id: 'u1', name: 'U1' }] },
  ],
  stories: [{ id: 'x', name: 'X', activityId: 'a1', stepId: 's1' }],
};

const state = parseUsmBase(raw);

const action = (type: string, target: { type: string; id: string }, payload: unknown): DraftAction => {
  return { id: 'a', type, target, payload, createdAt: '2026-01-01T00:00:00Z' };
};

const activityOrder = (next: ReturnType<typeof applyUsmAction>) => next?.activities.map((activity) => activity.id);

describe('usm columns: REORDER_ACTIVITY', () => {
  it('moves an activity group, steps and stories along, behind the anchor or to the front', () => {
    const moved = applyUsmAction(state, action('REORDER_ACTIVITY', { type: 'activity', id: 'a3' }, { after: 'a1' }));
    expect(activityOrder(moved)).toEqual(['a1', 'a3', 'a2']);
    expect(moved?.activities[1]?.steps.map((step) => step.id)).toEqual(['u1']);
    expect(moved?.stories).toEqual(state.stories);
    const front = applyUsmAction(state, action('REORDER_ACTIVITY', { type: 'activity', id: 'a2' }, { after: null }));
    expect(activityOrder(front)).toEqual(['a2', 'a1', 'a3']);
  });

  it('is inapplicable for an unknown activity or anchor', () => {
    expect(applyUsmAction(state, action('REORDER_ACTIVITY', { type: 'activity', id: 'gone' }, { after: null }))).toBe(
      null,
    );
    expect(applyUsmAction(state, action('REORDER_ACTIVITY', { type: 'activity', id: 'a1' }, { after: 'gone' }))).toBe(
      null,
    );
  });

  it('describes the move by the name of the group it lands behind', () => {
    const summary = definition.describe(
      action('REORDER_ACTIVITY', { type: 'activity', id: 'a3' }, { after: 'a1' }),
      state,
    );
    expect(summary).toMatchObject({ title: m.reorderActivity, tone: 'move' });
  });
});

describe('usm columns: drops', () => {
  it('reorders activity groups: the dragged one takes the hovered slot', () => {
    const ids = state.activities.map((activity) => activity.id);
    expect(resolveActivityDrop(ids, 'a3', 'a1', 'after')).toEqual({
      type: 'REORDER_ACTIVITY',
      target: { type: 'activity', id: 'a3' },
      payload: { after: null },
    });
    expect(resolveActivityDrop(ids, 'a1', 'a2', 'before')).toMatchObject({ payload: { after: 'a2' } });
    expect(resolveActivityDrop(ids, 'a1', null, 'end')).toMatchObject({ payload: { after: 'a3' } });
    expect(resolveActivityDrop(ids, 'gone', 'a1', 'after')).toBeNull();
  });

  it('reorders steps inside their activity by qualified refs, never across activities', () => {
    expect(resolveStepDrop(state, 'a1.s3', 'a1.s1', 'after')).toEqual({
      type: 'REORDER_STEP',
      target: { type: 'step', id: 'a1.s3' },
      payload: { after: null },
    });
    expect(resolveStepDrop(state, 'a1.s1', 'a1.s2', 'before')).toMatchObject({ payload: { after: 'a1.s2' } });
    expect(resolveStepDrop(state, 'a1.s1', 'a2.t1', 'before')).toBeNull();
    expect(resolveStepDrop(state, 'a1.gone', 'a1.s1', 'before')).toBeNull();
  });
});

describe('usm columns: on the map', () => {
  const settle = async (el: DpkTemplateUsm): Promise<void> => {
    await el.api.ready;
    await el.updateComplete;
    await Promise.resolve();
    await el.updateComplete;
  };

  const mount = async (hash: string): Promise<DpkTemplateUsm> => {
    window.location.hash = hash;
    document.body.innerHTML = `
      <dpk-template-usm storage="memory">
        <script type="application/json">${JSON.stringify(raw)}</script>
      </dpk-template-usm>`;
    const el = document.querySelector('dpk-template-usm') as DpkTemplateUsm;
    await settle(el);
    return el;
  };

  beforeEach(() => {
    window.location.hash = '';
    document.body.innerHTML = '';
  });

  it('lets the activity group heads and the step heads be picked up by a grip, but not their editors', async () => {
    const el = await mount('');
    const root = el.shadowRoot!;
    const groups = [...root.querySelectorAll('.act-head[data-activity]')];
    expect(groups.map((head) => head.getAttribute('draggable'))).toEqual(['true', 'true', 'true']);
    const steps = [...root.querySelectorAll('.col-head')];
    expect(steps.map((head) => head.getAttribute('data-step'))).toEqual(['a1.s1', 'a1.s2', 'a1.s3', 'a2.t1', 'a3.u1']);
    for (const head of [...groups, ...steps]) {
      expect(head.getAttribute('draggable')).toBe('true');
      expect(head.querySelector('.col-grip')).not.toBeNull();
      for (const editor of head.querySelectorAll('dpk-component-inline-edit')) {
        expect(editor.getAttribute('draggable')).toBe('false');
      }
    }
    // the trailing "+ Activity" head is not a group
    expect(root.querySelector('.act-head:not([data-activity])')?.getAttribute('draggable')).toBeNull();
  });

  it('lets the group view reorder its activity groups too', async () => {
    const el = await mount('#view=group');
    const heads = [...el.shadowRoot!.querySelectorAll('.act-head[data-activity]')];
    expect(heads.map((head) => head.getAttribute('draggable'))).toEqual(['true', 'true', 'true']);
  });

  it('moves the columns when a reorder is dispatched', async () => {
    const el = await mount('');
    el.api.dispatch({ type: 'REORDER_ACTIVITY', target: 'activity:a3', payload: { after: null } });
    el.api.dispatch({ type: 'REORDER_STEP', target: 'step:a1.s3', payload: { after: null } });
    await settle(el);
    const steps = [...el.shadowRoot!.querySelectorAll('.col-head')].map((head) => head.getAttribute('data-step'));
    expect(steps).toEqual(['a3.u1', 'a1.s3', 'a1.s1', 'a1.s2', 'a2.t1']);
  });
});
