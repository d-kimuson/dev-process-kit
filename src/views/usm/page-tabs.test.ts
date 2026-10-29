// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { DpkViewUsm } from './element';

import '../../index';

const raw = {
  features: ['assignees', 'estimates'],
  activities: [{ id: 'a1', name: 'A1', steps: [{ id: 's1', name: 'S1' }] }],
  stories: [{ id: 'u1', name: 'U1', activityId: 'a1', stepId: 's1' }],
};

/** jsdom lays nothing out: give the tab row, its tabs and its more button widths. */
const stubWidths = (row: () => number): void => {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    const width = this.classList.contains('page-nav')
      ? row()
      : this.getAttribute('role') === 'tab'
        ? 120
        : this.classList.contains('tabs-more')
          ? 36
          : 0;
    return new DOMRect(0, 0, width, 20);
  });
};

describe('usm page tabs: the ones that do not fit fold into a more menu', () => {
  let rowWidth = 1000;

  const settle = async (el: DpkViewUsm): Promise<void> => {
    for (let round = 0; round < 3; round += 1) {
      el.requestUpdate();
      await el.updateComplete;
      await Promise.resolve();
    }
  };

  const mount = async (hash = ''): Promise<DpkViewUsm> => {
    window.location.hash = hash;
    document.body.innerHTML = `
      <dpk-view-usm storage="memory">
        <script type="application/json">${JSON.stringify(raw)}</script>
      </dpk-view-usm>`;
    const el = document.querySelector('dpk-view-usm') as DpkViewUsm;
    await el.api.ready;
    await settle(el);
    return el;
  };

  const shownTabs = (el: DpkViewUsm) =>
    [...el.shadowRoot!.querySelectorAll('.page-tabs [role="tab"]:not([data-overflow])')].map((tab) =>
      tab.getAttribute('data-tab'),
    );
  const more = (el: DpkViewUsm) => el.shadowRoot!.querySelector<HTMLButtonElement>('[data-tabs-more-trigger]');
  const menuTabs = (el: DpkViewUsm) =>
    [...el.shadowRoot!.querySelectorAll('#tabs-menu [role="menuitem"]')].map((item) => item.getAttribute('data-tab'));

  beforeEach(() => {
    rowWidth = 1000;
    stubWidths(() => rowWidth);
    window.location.hash = '';
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows every tab and no more button while they all fit', async () => {
    const el = await mount();
    expect(shownTabs(el)).toEqual(['map', 'table', 'milestones', 'burndown']);
    expect(more(el)?.getAttribute('data-unused')).toBe('true');
  });

  it('folds the trailing tabs behind the more button, and lists them in its menu', async () => {
    rowWidth = 400; // 3 × 120 beside the 36 of the button
    const el = await mount();
    expect(shownTabs(el)).toEqual(['map', 'table', 'milestones']);
    const folded = el.shadowRoot!.querySelector('.page-tabs [data-tab="burndown"]')!;
    expect(folded.getAttribute('aria-hidden')).toBe('true');
    expect(folded.getAttribute('tabindex')).toBe('-1');
    expect(more(el)?.getAttribute('data-unused')).toBe('false');
    expect(more(el)?.getAttribute('aria-expanded')).toBe('false');

    more(el)!.click();
    await settle(el);
    expect(more(el)?.getAttribute('aria-expanded')).toBe('true');
    expect(menuTabs(el)).toEqual(['burndown']);
    const burndown = el.shadowRoot!.querySelector<HTMLAnchorElement>('#tabs-menu [data-tab="burndown"]')!;
    expect(burndown.getAttribute('href')).toContain('tab=burndown');

    // choosing a tab closes the menu
    burndown.click();
    await settle(el);
    expect(el.shadowRoot!.querySelector('#tabs-menu')).toBeNull();
  });

  it('keeps the current tab in the row, folding the ones before it instead', async () => {
    rowWidth = 400;
    const el = await mount('#tab=burndown');
    expect(shownTabs(el)).toEqual(['map', 'table', 'burndown']);
    more(el)!.click();
    await settle(el);
    expect(menuTabs(el)).toEqual(['milestones']);
  });

  it('shows the map for a stored tab that the template no longer has', async () => {
    // statuses, labels and members moved into the settings dialog: a link or a
    // stored hash still carrying one of their tabs lands on the map.
    for (const stored of ['statuses', 'labels', 'members']) {
      document.body.innerHTML = '';
      const el = await mount(`#tab=${stored}`);
      expect(el.navigation['tab']).toBeUndefined();
      expect(el.shadowRoot!.querySelector('.page-tabs [aria-selected="true"]')?.getAttribute('data-tab')).toBe('map');
      expect(el.shadowRoot!.querySelector('[data-testid="usm-map"]')).not.toBeNull();
    }
  });

  it('closes the menu on Escape', async () => {
    rowWidth = 400;
    const el = await mount();
    more(el)!.click();
    await settle(el);
    el.shadowRoot!.querySelector('#tabs-menu')!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
    );
    await settle(el);
    expect(el.shadowRoot!.querySelector('#tabs-menu')).toBeNull();
    expect(more(el)?.getAttribute('aria-expanded')).toBe('false');
  });

  it('closes the menu once every tab fits again, so it does not reopen on its own', async () => {
    rowWidth = 400;
    const el = await mount();
    more(el)!.click();
    await settle(el);
    rowWidth = 1000;
    await settle(el);
    expect(more(el)?.getAttribute('aria-expanded')).toBe('false');
    rowWidth = 400;
    await settle(el);
    expect(el.shadowRoot!.querySelector('#tabs-menu')).toBeNull();
  });

  it('unfolds the tabs again when the row grows', async () => {
    rowWidth = 400;
    const el = await mount();
    rowWidth = 1000;
    await settle(el);
    expect(shownTabs(el)).toHaveLength(4);
    expect(more(el)?.getAttribute('data-unused')).toBe('true');
  });
});
