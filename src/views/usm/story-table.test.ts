// @vitest-environment jsdom
// happy-dom parses a template's lone `<tbody>` unlike a browser, and Lit then
// reports duplicate attribute bindings, so the flat table is checked here.
import { describe, expect, it } from 'vitest';

import type { DpkViewUsm } from './element';

import { DpkTable } from '../../components/table';
import '../../index';

const base = {
  activities: [{ id: 'a1', name: 'A1', steps: [{ id: 's1', name: 'S1' }] }],
  stories: [
    { id: 'u1', name: 'U1', activityId: 'a1', stepId: 's1' },
    { id: 'u2', name: 'U2', activityId: 'a1', stepId: 's1' },
  ],
};

const mount = (hash: string): DpkViewUsm => {
  window.location.hash = hash;
  document.body.innerHTML = `
    <dpk-view-usm storage="memory">
      <script type="application/json">${JSON.stringify(base)}</script>
    </dpk-view-usm>`;
  return document.querySelector('dpk-view-usm') as DpkViewUsm;
};

const settle = async (el: DpkViewUsm): Promise<void> => {
  await el.api.ready;
  await el.updateComplete;
  await Promise.resolve();
  await el.updateComplete;
};

describe('usm story table', () => {
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
});
