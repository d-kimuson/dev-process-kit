// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';

import type { DraftAction } from '../../core/types';
import type { DpkViewUsm } from './element';

import '../../index';
import { applyUsmAction } from './apply';
import { usmDefinitionFor } from './definition';
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

describe('usm columns: on the map', () => {
  const settle = async (el: DpkViewUsm): Promise<void> => {
    await el.api.ready;
    await el.updateComplete;
    await Promise.resolve();
    await el.updateComplete;
  };

  const mount = async (hash: string): Promise<DpkViewUsm> => {
    window.location.hash = hash;
    document.body.innerHTML = `
      <dpk-view-usm storage="memory">
        <script type="application/json">${JSON.stringify(raw)}</script>
      </dpk-view-usm>`;
    const el = document.querySelector('dpk-view-usm') as DpkViewUsm;
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
    const matrix = root.querySelector('dpk-matrix')!.shadowRoot!;
    const groups = [...root.querySelectorAll('.act-head[data-activity]')];
    const groupHandles = groups.map((head) =>
      matrix.querySelector(`.matrix-col-head[data-column="${head.getAttribute('data-activity')}"]`),
    );
    expect(groupHandles.map((handle) => handle?.getAttribute('draggable'))).toEqual(['true', 'true', 'true']);
    const steps = [...root.querySelectorAll('.col-head')];
    expect(steps.map((head) => head.getAttribute('data-step'))).toEqual(['a1.s1', 'a1.s2', 'a1.s3', 'a2.t1', 'a3.u1']);
    const stepHandles = steps.map((head) =>
      matrix.querySelector(
        `.matrix-sub-head[data-column="${head.getAttribute('data-column')}"][data-sub-column="${head.getAttribute('data-column-step')}"]`,
      ),
    );
    expect(stepHandles.map((handle) => handle?.getAttribute('draggable'))).toEqual([
      'true',
      'true',
      'true',
      'true',
      'true',
    ]);
    // The grip itself is `<dpk-matrix>`'s own now, not drawn by USM: it lives beside the
    // slot inside the matrix's own draggable wrapper, not inside the host's `.act-head`/`.col-head`.
    for (const handle of [...groupHandles, ...stepHandles]) {
      expect(handle?.querySelector('.matrix-grip')).not.toBeNull();
    }
    for (const head of [...groups, ...steps]) {
      for (const editor of head.querySelectorAll('dpk-inline-edit')) {
        expect(editor.getAttribute('draggable')).toBe('false');
      }
    }
    // the trailing "+ Activity" head is not a group: `<dpk-matrix>` mirrors its own (non-draggable)
    // state onto the slotted content div itself, since native drag-and-drop only ever looks at the
    // light DOM ancestor chain a pointer-down actually lands on, never through the slot into the
    // shadow root that declares `draggable` on the wrapper. With no draggable state, it shows no grip.
    const addActivityHead = root.querySelector('.act-head:not([data-activity])');
    expect(addActivityHead?.getAttribute('draggable')).toBe('false');
    const addActivityHandle = matrix.querySelector('.matrix-col-head[draggable="false"]');
    expect(addActivityHandle).not.toBeNull();
    expect(addActivityHandle?.querySelector('.matrix-grip')).toBeNull();
  });

  it('lets the group view reorder its activity groups too', async () => {
    const el = await mount('#view=group');
    const root = el.shadowRoot!;
    const matrix = root.querySelector('dpk-matrix')!.shadowRoot!;
    const heads = [...root.querySelectorAll('.act-head[data-activity]')];
    const handles = heads.map((head) =>
      matrix.querySelector(`.matrix-col-head[data-column="${head.getAttribute('data-activity')}"]`),
    );
    expect(handles.map((handle) => handle?.getAttribute('draggable'))).toEqual(['true', 'true', 'true']);
  });

  /** jsdom has no DragEvent: a synthetic drop carrying the payload, as the board reads it. */
  const dropOn = (target: Element, payload: string): void => {
    const drop = Object.assign(new Event('drop', { bubbles: true, cancelable: true }), {
      clientY: 0,
      dataTransfer: { getData: () => payload },
    });
    target.dispatchEvent(drop);
  };

  it('marks every part of a column, heads and cells, so the whole column lifts', async () => {
    const el = await mount('');
    const root = el.shadowRoot!;
    const column = (activityId: string, stepId?: string) =>
      [...root.querySelectorAll(`[data-column="${activityId}"]`)]
        .filter((part) => stepId === undefined || part.getAttribute('data-column-step') === stepId)
        .map((part) => part.className);
    // the group's head, its three step heads and their cells in the unassigned row
    expect(column('a1')).toEqual(['act-head', 'col-head', 'col-head', 'col-head', 'cell', 'cell', 'cell']);
    expect(column('a1', 's2')).toEqual(['col-head', 'cell']);
  });

  it('reorders an activity group when <dpk-matrix> reports a column reorder', async () => {
    const el = await mount('');
    const matrix = el.shadowRoot!.querySelector('dpk-matrix')!;
    matrix.dispatchEvent(new CustomEvent('dpk-matrix-reorder-column', { detail: { columnId: 'a3', after: 'a1' } }));
    await settle(el);
    expect(el.api.state.activities.map((activity) => activity.id)).toEqual(['a1', 'a3', 'a2']);
  });

  it('reorders a step inside its own activity when <dpk-matrix> reports a sub-column reorder', async () => {
    const el = await mount('');
    const matrix = el.shadowRoot!.querySelector('dpk-matrix')!;
    matrix.dispatchEvent(
      new CustomEvent('dpk-matrix-reorder-sub-column', {
        detail: { columnId: 'a1', subColumnId: 's3', after: 's1' },
      }),
    );
    await settle(el);
    expect(el.api.state.activities[0]?.steps.map((step) => step.id)).toEqual(['s1', 's3', 's2']);
  });

  it("wires the group view's <dpk-matrix> for column reorders too", async () => {
    const el = await mount('#view=group');
    const matrix = el.shadowRoot!.querySelector('dpk-matrix')!;
    matrix.dispatchEvent(new CustomEvent('dpk-matrix-reorder-column', { detail: { columnId: 'a2', after: null } }));
    await settle(el);
    expect(el.api.state.activities.map((activity) => activity.id)).toEqual(['a2', 'a1', 'a3']);
  });

  it('still takes a dropped story on a cell', async () => {
    const el = await mount('');
    dropOn(el.shadowRoot!.querySelector('.cell[data-column="a1"][data-column-step="s2"]')!, 'x');
    await settle(el);
    expect(el.api.state.stories.find((story) => story.id === 'x')).toMatchObject({ stepId: 's2' });
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
