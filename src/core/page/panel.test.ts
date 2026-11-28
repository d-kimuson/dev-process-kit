// @vitest-environment happy-dom
import { html } from 'lit';
import { afterEach, describe, expect, it } from 'vitest';

import { definePanelSection } from '../../components/panel-section';
import { PANEL_HOST, panelHostOf, type PanelHost } from '../panel/host';
import { PANEL_CHANGE_EVENT, type PanelChangeDetail } from '../panel/owner';
import { PageElement } from './element';

if (!customElements.get('dpk-page')) customElements.define('dpk-page', PageElement);
definePanelSection();

type Frame = HTMLElement & { updateComplete: Promise<boolean> };

const readChange = (event: CustomEvent<unknown>): PanelChangeDetail => {
  const detail: unknown = event.detail;
  if (typeof detail !== 'object' || detail === null || !('open' in detail) || !('section' in detail))
    throw new Error('no change detail');
  return { open: detail.open === true, section: String(detail.section) };
};

const mountPage = (markup: string, attributes: Record<string, string> = {}): PageElement => {
  const page = document.createElement('dpk-page');
  if (!(page instanceof PageElement)) throw new Error('not upgraded');
  page.setAttribute('name', 'sample');
  for (const [name, value] of Object.entries(attributes)) page.setAttribute(name, value);
  page.innerHTML = markup;
  document.body.append(page);
  return page;
};

const frameOf = (page: PageElement): Frame => {
  const frame = page.renderRoot.querySelector('dpk-internal-layout-panel');
  if (!(frame instanceof HTMLElement) || !('updateComplete' in frame)) throw new Error('no panel frame');
  return frame as Frame;
};

const settle = async (page: PageElement): Promise<ShadowRoot> => {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await page.updateComplete;
  const frame = frameOf(page);
  await frame.updateComplete;
  if (frame.shadowRoot === null) throw new Error('no panel shadow root');
  return frame.shadowRoot;
};

const tabs = (root: ShadowRoot): HTMLElement[] => Array.from(root.querySelectorAll<HTMLElement>('[role="tab"]'));

const SECTIONS = `
  <div>content</div>
  <dpk-panel-section slot="panel" name="issues" label="Issues" badge="2">points</dpk-panel-section>
  <dpk-panel-section slot="panel" name="decisions" label="Decisions">decided</dpk-panel-section>
`;

afterEach(() => {
  document.body.replaceChildren();
  localStorage.clear();
});

describe('dpk-page side panel', () => {
  it('stays closed until opened when it has only the detail', async () => {
    const page = mountPage('<div>content</div>');
    const root = await settle(page);
    expect(page.panelOpen).toBe(false);
    expect(root.querySelector('.panel')).toBeNull();
  });

  it("opens on the author's sections, shows the section asked for and says so", async () => {
    const page = mountPage(SECTIONS);
    let root = await settle(page);
    expect(page.panelOpen).toBe(true);

    const changes: PanelChangeDetail[] = [];
    page.addEventListener(PANEL_CHANGE_EVENT, (event) => {
      if (event instanceof CustomEvent) if (event instanceof CustomEvent) changes.push(readChange(event));
    });
    page.openPanel('decisions');
    root = await settle(page);
    expect(page.panelOpen).toBe(true);
    expect(page.panelSection).toBe('decisions');
    expect(tabs(root).map((tab) => tab.textContent?.replace(/\s+/g, ' ').trim())).toEqual(['Issues 2', 'Decisions']);
    expect(tabs(root).map((tab) => tab.getAttribute('aria-selected'))).toEqual(['false', 'true']);
    const [issues, decisions] = Array.from(page.querySelectorAll('dpk-panel-section'));
    expect(decisions).toHaveProperty('active', true);
    expect(issues).toHaveProperty('active', false);
    expect(changes).toEqual([{ open: true, section: 'decisions' }]);

    page.closePanel();
    root = await settle(page);
    expect(root.querySelector('.panel')).toBeNull();
    expect(changes.at(-1)).toEqual({ open: false, section: 'decisions' });
  });

  it('moves between sections with the arrow keys, as tabs do', async () => {
    const page = mountPage(SECTIONS, { panel: 'open' });
    const root = await settle(page);
    expect(page.panelSection).toBe('issues');
    tabs(root)[0]?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    const after = await settle(page);
    expect(page.panelSection).toBe('decisions');
    expect(after.activeElement).toBe(tabs(after)[1]);
  });

  it.each([{ panel: 'open' }, {}])(
    'remembers the reader closing a panel that opens by itself (%o)',
    async (attributes) => {
      const first = mountPage(SECTIONS, attributes);
      await settle(first);
      expect(first.panelOpen).toBe(true);
      first.panelOpen = false;
      await settle(first);
      first.remove();

      const second = mountPage(SECTIONS, attributes);
      await settle(second);
      expect(second.panelOpen).toBe(false);
    },
  );

  it('offers no panel with panel="none"', async () => {
    const page = mountPage(SECTIONS, { panel: 'none' });
    page.openPanel('issues');
    const root = await settle(page);
    expect(page.panelOpen).toBe(false);
    expect(root.querySelector('.panel')).toBeNull();
  });

  it('opens on the detail a board hands it, keyed on the element', async () => {
    const page = mountPage('<div id="board">board</div>');
    const board = page.querySelector('#board');
    if (board === null) throw new Error('no board');
    const host: PanelHost | null = panelHostOf(board);
    expect(host).toBe(page[PANEL_HOST]);
    host?.provideDetail(board);
    const detail = (key: string): Parameters<PanelHost['showDetail']>[1] => ({
      key,
      kind: 'Card',
      title: key,
      render: () => html`<input data-key=${key} />`,
    });
    host?.showDetail(board, detail('a'), 'open');
    let root = await settle(page);
    expect(page.panelSection).toBe('detail');
    expect(root.querySelector('[data-role="detail-heading"]')?.textContent).toContain('a');
    const typed = root.querySelector<HTMLInputElement>('input[data-key="a"]');
    if (typed === null) throw new Error('no detail input');
    typed.value = 'half typed';

    host?.showDetail(board, detail('b'), 'select');
    root = await settle(page);
    const next = root.querySelector<HTMLInputElement>('input[data-key="b"]');
    expect(next).not.toBe(typed);
    expect(next?.value).toBe('');
  });
});

describe("dpk-page and its content's supplements", () => {
  it('shows each supplement of its content as a section, after its own, in the order written', async () => {
    const page = mountPage(`
      <dpk-panel-section slot="panel" name="issues" label="Issues">points</dpk-panel-section>
      <dpk-view-sample>
        <section slot="supplement" data-name="ERD">erd</section>
        <p slot="main">body</p>
        <section slot="supplement" data-name="Checklist">checklist</section>
      </dpk-view-sample>`);
    page.openPanel();
    let root = await settle(page);
    expect(tabs(root).map((tab) => tab.textContent?.trim())).toEqual(['Issues', 'ERD', 'Checklist']);
    const content = page.querySelector('dpk-view-sample');
    expect(content?.querySelector('[slot="supplement"]')).toBeNull();

    const added = document.createElement('section');
    added.slot = 'supplement';
    added.dataset['name'] = 'Glossary';
    content?.append(added);
    await settle(page);
    root = await settle(page);
    expect(tabs(root).map((tab) => tab.textContent?.trim())).toEqual(['Issues', 'ERD', 'Checklist', 'Glossary']);

    tabs(root)[2]?.click();
    await settle(page);
    expect(
      Array.from(page.querySelectorAll('[slot="supplement"][data-dpk-panel-active]'), (node) =>
        node.getAttribute('data-name'),
      ),
    ).toEqual(['Checklist']);
  });
});
