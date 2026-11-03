// @vitest-environment jsdom
// happy-dom does not reflect `draggable` to its attribute, and the mirroring
// onto the slotted heads is what this checks; the rest of the columns tests
// run in `columns.test.ts`, where jsdom's slot assignment would make them slow.
import { beforeEach, describe, expect, it } from 'vitest';

import type { DpkViewUsm } from './element';

import '../../index';

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

describe('usm columns: the grips on the map', () => {
  const mount = async (hash: string): Promise<DpkViewUsm> => {
    window.location.hash = hash;
    document.body.innerHTML = `
      <dpk-view-usm storage="memory">
        <script type="application/json">${JSON.stringify(raw)}</script>
      </dpk-view-usm>`;
    const el = document.querySelector('dpk-view-usm') as DpkViewUsm;
    await el.api.ready;
    await el.updateComplete;
    await Promise.resolve();
    await el.updateComplete;
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
});
