// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PageElement } from './element';

if (!customElements.get('dpk-page')) customElements.define('dpk-page', PageElement);

class FakeBoard extends HTMLElement {
  readonly ready = Promise.resolve();
  readonly resetView = vi.fn();
}

if (!customElements.get('dpk-board-fake')) customElements.define('dpk-board-fake', FakeBoard);

afterEach(() => {
  document.body.innerHTML = '';
});

describe('dpk-page board content', () => {
  it('marks a board as page content and opens it fitted', async () => {
    const page = document.createElement('dpk-page');
    page.setAttribute('name', 'sample');
    page.innerHTML = '<dpk-board-fake></dpk-board-fake>';
    document.body.append(page);
    const board = document.querySelector('dpk-board-fake') as FakeBoard;
    await new Promise((resolve) => requestAnimationFrame(resolve));
    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(board.hasAttribute('data-dpk-page-content')).toBe(true);
    expect(board.resetView).toHaveBeenCalledOnce();
  });
});
