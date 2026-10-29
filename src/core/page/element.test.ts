// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';

import { coreMessages } from '../messages';
import { PAGE_STATE_EVENT, PageElement, type PageContentState } from './element';

if (!customElements.get('dpk-page')) customElements.define('dpk-page', PageElement);

class FakeBoard extends HTMLElement {
  readonly ready = Promise.resolve();
  readonly resetView = vi.fn();
}

if (!customElements.get('dpk-board-fake')) customElements.define('dpk-board-fake', FakeBoard);

const mountPage = (name: string, content?: string): PageElement => {
  const page = document.createElement('dpk-page');
  if (!(page instanceof PageElement)) throw new Error('not upgraded');
  page.setAttribute('name', name);
  if (content !== undefined) page.append(document.createElement(content));
  document.body.append(page);
  return page;
};

const notices = (page: PageElement): string =>
  Array.from(page.renderRoot.querySelectorAll('.dpk-page-notice'), (node) => node.textContent ?? '').join(' ');

const settle = async (page: PageElement): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await page.updateComplete;
};

afterEach(() => {
  document.body.replaceChildren();
});

describe('dpk-page board content', () => {
  it('marks a board as page content and opens it fitted', async () => {
    const page = mountPage('sample', 'dpk-board-fake');
    const board = page.querySelector('dpk-board-fake') as FakeBoard;
    await new Promise((resolve) => requestAnimationFrame(resolve));
    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(board.hasAttribute('data-dpk-page-content')).toBe(true);
    expect(board.resetView).toHaveBeenCalledOnce();
  });
});

describe('dpk-page content state', () => {
  const messages = coreMessages('en');

  it('settles empty when it holds no view or board, and says so', async () => {
    const page = mountPage('empty');
    await page.ready;
    await settle(page);
    expect(page.contentState).toEqual({ status: 'empty' });
    expect(notices(page)).toContain(messages.pageEmpty);
  });

  it('settles unavailable when no loaded entry defines its content, and says which tag', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const page = mountPage('missing', 'dpk-board-missing');
    await page.ready;
    await settle(page);
    expect(page.contentState).toEqual({ status: 'unavailable', tag: 'dpk-board-missing' });
    expect(notices(page)).toContain(messages.pageUnavailableHint('dpk-board-missing'));
  });

  it('waits for a definition that loads with the document', async () => {
    vi.spyOn(document, 'readyState', 'get').mockReturnValue('loading');
    const tag = 'dpk-board-late-load';
    const page = mountPage('late-load', tag);
    await Promise.resolve();
    expect(page.contentState).toBeNull();
    customElements.define(tag, class extends FakeBoard {});
    await page.ready;
    await settle(page);
    expect(page.contentState).toEqual({ status: 'ready' });
  });

  it('becomes ready when a content element arrives after it settled empty', async () => {
    const page = mountPage('gains');
    await page.ready;
    const states: PageContentState[] = [];
    page.addEventListener(PAGE_STATE_EVENT, (event) => {
      states.push((event as CustomEvent<PageContentState>).detail);
    });
    page.append(document.createElement('dpk-board-fake'));
    await settle(page);
    expect(page.contentState).toEqual({ status: 'ready' });
    expect(states).toEqual([{ status: 'ready' }]);
  });

  it('recovers when a definition arrives after it answered unavailable', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const tag = 'dpk-board-recovered';
    const page = mountPage('recovered', tag);
    await page.ready;
    await settle(page);
    expect(page.contentState).toEqual({ status: 'unavailable', tag });
    customElements.define(tag, class extends FakeBoard {});
    await settle(page);
    expect(page.contentState).toEqual({ status: 'ready' });
  });

  it('answers unavailable after its grace period when no definition is coming', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(document, 'readyState', 'get').mockReturnValue('loading');
    vi.useFakeTimers();
    try {
      const tag = 'dpk-board-never-defined';
      const page = mountPage('never', tag);
      await Promise.resolve();
      expect(page.contentState).toBeNull();
      await vi.advanceTimersByTimeAsync(5_000);
      await page.ready;
      expect(page.contentState).toEqual({ status: 'unavailable', tag });
    } finally {
      vi.useRealTimers();
    }
  });
});
