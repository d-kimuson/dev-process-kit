// @vitest-environment jsdom
import { html } from 'lit';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { DpkViewPlain } from '../views/plain/element';

import { coreMessages } from './messages';
import { PANEL_HOST, type PanelHost } from './panel/host';
import { panelMessages } from './panel/messages';
import '../index';

const m = panelMessages('en');
const settings = coreMessages('en').settings;

type Frame = HTMLElement & { updateComplete: Promise<boolean> };

const mount = (supplements = ''): DpkViewPlain => {
  document.body.innerHTML = `
    <dpk-view-plain storage="memory" lang="en">
      <script type="application/json">${JSON.stringify({ title: 'Cancel orders' })}</script>
      <section slot="main"><p>Body</p></section>
      ${supplements}
    </dpk-view-plain>`;
  const element = document.querySelector('dpk-view-plain');
  if (!(element instanceof HTMLElement)) throw new Error('element did not upgrade');
  return element as DpkViewPlain;
};

const frameOf = (element: DpkViewPlain): Frame => {
  const frame = element.shadowRoot?.querySelector<Frame>('dpk-internal-layout-panel');
  if (!frame) throw new Error('no panel frame');
  return frame;
};

const settle = async (element: DpkViewPlain): Promise<void> => {
  await element.api.ready;
  for (let i = 0; i < 3; i += 1) {
    await element.updateComplete;
    await frameOf(element).updateComplete;
    await Promise.resolve();
  }
};

const tabLabels = (element: DpkViewPlain): string[] =>
  Array.from(
    frameOf(element).shadowRoot?.querySelectorAll<HTMLElement>('[role="tab"]') ?? [],
    (tab) => tab.textContent?.trim() ?? '',
  );

const tab = (element: DpkViewPlain, label: string): HTMLButtonElement => {
  const found = Array.from(frameOf(element).shadowRoot?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? []).find(
    (candidate) => candidate.textContent?.trim() === label,
  );
  if (!found) throw new Error(`no tab ${label}`);
  return found;
};

const shown = (element: DpkViewPlain): string[] =>
  Array.from(element.querySelectorAll<HTMLElement>('[slot="supplement"][data-dpk-panel-active]'), (node) =>
    node.getAttribute('data-name'),
  ).map((name) => name ?? '');

const THREE = `
  <section slot="supplement" data-name="ERD"><div id="erd-board">erd</div></section>
  <section slot="supplement" data-name="Checklist">checklist</section>
  <section slot="supplement" data-name="Sequence">sequence</section>`;

beforeEach(() => localStorage.clear());

afterEach(() => {
  document.body.replaceChildren();
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('supplements as sections of the side panel', () => {
  it('starts closed with only the settings when the author slots no supplement', async () => {
    const element = mount();
    await settle(element);
    expect(element.panelOpen).toBe(false);
    element.openPanel();
    await settle(element);
    expect(tabLabels(element)).toEqual([settings]);
  });

  it('starts open on the first supplement until the reader closes the panel', async () => {
    const element = mount(THREE);
    await settle(element);
    expect(element.panelOpen).toBe(true);
    expect(shown(element)).toEqual(['ERD']);
  });

  it('lists each supplement by its name, in the order written, and shows only the one picked', async () => {
    const element = mount(THREE);
    await settle(element);
    element.openPanel();
    await settle(element);
    expect(tabLabels(element)).toEqual(['ERD', 'Checklist', 'Sequence', settings]);
    expect(shown(element)).toEqual(['ERD']);

    tab(element, 'Sequence').click();
    await settle(element);
    expect(shown(element)).toEqual(['Sequence']);
    // The light DOM is the author's and is left as written.
    expect(element.querySelector('[data-name="Sequence"]')?.getAttribute('slot')).toBe('supplement');
  });

  it('names a supplement without a name as the panel names an unnamed section', async () => {
    const element = mount('<div slot="supplement">premise</div>');
    await settle(element);
    element.openPanel();
    await settle(element);
    expect(tabLabels(element)).toEqual([m.notes, settings]);
  });

  it('keeps supplements and the author panel sections in the order written', async () => {
    const element = mount(`
      <dpk-panel-section slot="panel" label="Decisions">decisions</dpk-panel-section>
      <section slot="supplement" data-name="ERD">erd</section>
      <dpk-panel-section slot="panel" label="Risks">risks</dpk-panel-section>`);
    await settle(element);
    element.openPanel();
    await settle(element);
    expect(tabLabels(element)).toEqual(['Decisions', 'ERD', 'Risks', settings]);
  });

  it('follows supplements the author adds later', async () => {
    const element = mount(THREE);
    await settle(element);
    element.openPanel();
    await settle(element);
    const added = document.createElement('section');
    added.slot = 'supplement';
    added.dataset['name'] = 'Glossary';
    element.append(added);
    await new Promise((resolve) => setTimeout(resolve, 0));
    await settle(element);
    expect(tabLabels(element)).toEqual(['ERD', 'Checklist', 'Sequence', 'Glossary', settings]);
  });

  it('leads from the detail of an element in a supplement back to that supplement', async () => {
    const element = mount(THREE);
    await settle(element);
    const host = (element as unknown as { [PANEL_HOST]: PanelHost })[PANEL_HOST];
    const board = element.querySelector<HTMLElement>('#erd-board')!;
    const focus = vi.fn();
    host.provideDetail(board);
    host.showDetail(
      board,
      { key: 'orders', kind: 'Table', title: 'orders', render: () => html`orders`, focus },
      'open',
    );
    await settle(element);
    expect(element.panelSection).toBe('detail');
    expect(shown(element)).toEqual([]);

    const back = frameOf(element).shadowRoot?.querySelector<HTMLButtonElement>('[data-role="detail-origin"]');
    expect(back?.getAttribute('aria-label')).toBe(m.backToSection('ERD'));
    back?.click();
    await settle(element);
    expect(shown(element)).toEqual(['ERD']);

    // Escape in the detail shows the supplement again before the focus returns to the element.
    tab(element, m.detail).click();
    await settle(element);
    frameOf(element)
      .shadowRoot?.querySelector('[data-role="detail-heading"]')
      ?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true }));
    await settle(element);
    expect(shown(element)).toEqual(['ERD']);
    expect(focus).toHaveBeenCalledOnce();
  });

  it('turns to the detail when the reader selects an element in the supplement on show', async () => {
    const element = mount(THREE);
    await settle(element);
    element.openPanel();
    await settle(element);
    const host = (element as unknown as { [PANEL_HOST]: PanelHost })[PANEL_HOST];
    const board = element.querySelector<HTMLElement>('#erd-board')!;
    host.provideDetail(board);
    host.showDetail(board, { key: 'orders', kind: 'Table', title: 'orders', render: () => html`orders` }, 'select');
    await settle(element);
    expect(element.panelSection).toBe('detail');
  });

  it('only marks the detail when the selected element is not on show', async () => {
    const element = mount(THREE);
    await settle(element);
    element.openPanel('section-2');
    await settle(element);
    const host = (element as unknown as { [PANEL_HOST]: PanelHost })[PANEL_HOST];
    const board = element.querySelector<HTMLElement>('#erd-board')!;
    host.provideDetail(board);
    host.showDetail(board, { key: 'orders', kind: 'Table', title: 'orders', render: () => html`orders` }, 'select');
    await settle(element);
    expect(shown(element)).toEqual(['Checklist']);
  });

  it('offers no way back for an element outside the supplements', async () => {
    const element = mount(THREE);
    await settle(element);
    const host = (element as unknown as { [PANEL_HOST]: PanelHost })[PANEL_HOST];
    const board = element.querySelector<HTMLElement>('[slot="main"]')!;
    host.provideDetail(board);
    host.showDetail(board, { key: 'x', kind: 'Step', title: 'x', render: () => html`x` }, 'open');
    await settle(element);
    expect(frameOf(element).shadowRoot?.querySelector('[data-role="detail-origin"]')).toBeNull();
  });

  it('warns about the memo slot it replaced', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const element = mount('<div slot="memo">premise</div>');
    await settle(element);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('slot="supplement"'));
  });
});
