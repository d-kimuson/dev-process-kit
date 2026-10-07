import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { DpkTemplateWhiteboard } from './element';

import '../../index';

const base = {
  title: 'Retro',
  items: [
    { id: 'went-well', kind: 'frame', x: 0, y: 0, w: 400, h: 300, title: 'Went well' },
    { id: 'to-improve', kind: 'frame', x: 500, y: 0, w: 400, h: 300, title: 'To improve' },
    { id: 'pairing', kind: 'sticky', x: 20, y: 60, text: 'Pairing' },
    { id: 'flaky', kind: 'sticky', x: 520, y: 60, text: 'Flaky CI', color: 'orange' },
    { id: 'goal', kind: 'shape', shape: 'ellipse', x: 1000, y: 40, text: 'Ship v1' },
  ],
  connectors: [{ id: 'flaky-goal', from: 'flaky', to: 'goal', label: 'blocks' }],
};

const mount = (options: { hash?: string; storage?: string } = {}): DpkTemplateWhiteboard => {
  window.location.hash = options.hash ?? '';
  const storage = options.storage ?? 'storage="memory"';
  document.body.innerHTML = `
    <dpk-template-whiteboard lang="en" ${storage}>
      <script type="application/json">${JSON.stringify(base)}</script>
    </dpk-template-whiteboard>`;
  const element = document.querySelector('dpk-template-whiteboard');
  if (element === null) throw new Error('not mounted');
  return element as DpkTemplateWhiteboard;
};

const settle = async (el: DpkTemplateWhiteboard): Promise<void> => {
  await el.api.ready;
  await el.updateComplete;
  await Promise.resolve();
  await el.updateComplete;
};

const root = (el: DpkTemplateWhiteboard): ShadowRoot => {
  if (el.shadowRoot === null) throw new Error('no shadow root');
  return el.shadowRoot;
};

const q = <T extends Element = HTMLElement>(el: DpkTemplateWhiteboard, selector: string): T => {
  const found = root(el).querySelector<T>(selector);
  if (found === null) throw new Error(`missing ${selector}`);
  return found;
};

const pointer = (target: Element, type: string, x: number, y: number): void => {
  target.dispatchEvent(
    new PointerEvent(type, { pointerId: 1, button: 0, clientX: x, clientY: y, bubbles: true, composed: true }),
  );
};

/** Press on `from`, then move and release over the canvas (where pointer capture sends them). */
const drag = async (el: DpkTemplateWhiteboard, from: Element, start: [number, number], end: [number, number]) => {
  pointer(from, 'pointerdown', ...start);
  await settle(el);
  const canvas = q(el, '.wb-canvas');
  pointer(canvas, 'pointermove', ...end);
  await settle(el);
  pointer(canvas, 'pointerup', ...end);
  await settle(el);
};

describe('<dpk-template-whiteboard>', () => {
  beforeEach(() => {
    window.location.hash = '';
    document.body.innerHTML = '';
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('draws frames behind items, connectors between them, and lists the frames', async () => {
    const el = mount();
    await settle(el);
    const ids = [...root(el).querySelectorAll('.wb-item')].map((item) => item.getAttribute('data-item-id'));
    expect(ids).toEqual(['went-well', 'to-improve', 'pairing', 'flaky', 'goal']);
    expect(root(el).querySelectorAll('[data-connector-id]')).toHaveLength(1);
    expect(q(el, '[data-connector-label="flaky-goal"]').textContent).toContain('blocks');
    const frames = [...root(el).querySelectorAll('.wb-frame-link')].map((link) =>
      link.textContent?.replace(/\s+/g, ' ').trim(),
    );
    expect(frames).toEqual(['Whole board 5 items', 'Went well 1 item', 'To improve 1 item']);
  });

  it('drags a sticky into another frame as one move', async () => {
    const el = mount();
    await settle(el);
    await drag(el, q(el, '[data-item-id="pairing"]'), [30, 70], [530, 120]);
    expect(el.api.actions.map((action) => [action.type, action.target.id, action.payload])).toEqual([
      ['MOVE_ITEM', 'pairing', { x: 520, y: 110 }],
    ]);
    expect(el.api.navigation['item']).toBe('pairing');
    const described = el.controller.definition.describe(el.api.actions[0]!, el.api.state, el.api.base);
    expect(described.summary).toBe('frame “Went well” → frame “To improve” (520, 110)');
  });

  it('carries the contents of a frame dragged by its title', async () => {
    const el = mount();
    await settle(el);
    await drag(el, q(el, '[data-item-id="went-well"] .wb-frame-title'), [10, -10], [10, 90]);
    expect(el.api.actions.map((action) => [action.target.id, action.payload])).toEqual([
      ['went-well', { x: 0, y: 100 }],
      ['pairing', { x: 20, y: 160 }],
    ]);
  });

  it('adds a sticky from the toolbar and types into it', async () => {
    const el = mount();
    await settle(el);
    q(el, '[data-add="sticky"]').click();
    await settle(el);
    const [added] = el.api.actions;
    expect(added?.type).toBe('ADD_ITEM');
    const id = added?.target.type === 'page' ? (added.payload as { id: string }).id : '';
    expect(el.api.navigation['item']).toBe(id);
    const editor = q(el, `[data-item-id="${id}"] dpk-component-inline-edit`);
    editor.dispatchEvent(
      new CustomEvent('dpk-commit', { detail: { value: 'Retry less' }, bubbles: true, composed: true }),
    );
    await settle(el);
    // Adding then typing is one net change: an item with that text.
    expect(el.api.state.items.find((item) => item.id === id)).toMatchObject({ kind: 'sticky', text: 'Retry less' });
  });

  it('connects two items by dragging out of the connect handle', async () => {
    const el = mount({ hash: '#item=pairing' });
    await settle(el);
    await drag(el, q(el, '[data-item-id="pairing"] .wb-handle--connect'), [200, 140], [580, 120]);
    expect(el.api.actions.map((action) => [action.type, action.payload])).toEqual([
      ['CONNECT_ITEMS', { id: 'pairing-to-flaky', from: 'pairing', to: 'flaky' }],
    ]);
    // The new connector is selected, ready to be labeled.
    expect(el.api.navigation['item']).toBe('pairing-to-flaky');
    expect(q(el, '.wb-toolbar dpk-component-inline-edit')).toBeTruthy();
  });

  it('resizes the selected item from its corner', async () => {
    const el = mount({ hash: '#item=goal' });
    await settle(el);
    await drag(el, q(el, '[data-item-id="goal"] .wb-handle--resize'), [1180, 150], [1240, 190]);
    expect(el.api.actions.map((action) => [action.type, action.payload])).toEqual([
      ['RESIZE_ITEM', { w: 240, h: 150 }],
    ]);
  });

  it('recolors, comments on and deletes the selection from its toolbar', async () => {
    const el = mount({ hash: '#item=pairing' });
    await settle(el);
    q(el, '.wb-swatch[data-color="pink"]').click();
    await settle(el);
    expect(el.api.state.items.find((item) => item.id === 'pairing')).toMatchObject({ color: 'pink' });

    q(el, '.wb-toolbar [data-role="comment"]').click();
    await settle(el);
    const textarea = q<HTMLTextAreaElement>(el, '.wb-composer .comment-pop textarea');
    textarea.value = 'Who paired?';
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    await settle(el);
    q(el, '.wb-composer .comment-pop .dpk-btn--accent').click();
    await settle(el);
    expect(el.api.comments.map((comment) => [comment.target, comment.payload])).toEqual([
      [{ type: 'item', id: 'pairing' }, { body: 'Who paired?' }],
    ]);
    expect(q(el, '[data-item-id="pairing"] .wb-flag').textContent).toBe('1');

    q(el, '.wb-toolbar [data-role="delete"]').click();
    await settle(el);
    expect(el.api.state.items.some((item) => item.id === 'pairing')).toBe(false);
    expect(el.api.navigation['item']).toBeUndefined();
  });

  it('connects through the toolbar, then a click on the other end', async () => {
    const el = mount({ hash: '#item=pairing' });
    await settle(el);
    q(el, '.wb-toolbar [data-role="connect"]').click();
    await settle(el);
    expect(q(el, '.wb-hint').textContent).toContain('Click the item to connect to');
    pointer(q(el, '[data-item-id="goal"]'), 'pointerdown', 1010, 50);
    await settle(el);
    expect(el.api.state.connectors.map((connector) => [connector.from, connector.to])).toEqual([
      ['flaky', 'goal'],
      ['pairing', 'goal'],
    ]);
  });

  it('deletes the selected connector with the Delete key', async () => {
    const el = mount({ hash: '#item=flaky-goal' });
    await settle(el);
    q(el, '.wb-canvas').dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }));
    await settle(el);
    expect(el.api.actions.map((action) => action.type)).toEqual(['DELETE_CONNECTOR']);
  });

  it('nudges the selection with the arrow keys', async () => {
    const el = mount({ hash: '#item=went-well' });
    await settle(el);
    const canvas = q(el, '.wb-canvas');
    canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    await settle(el);
    expect(el.api.actions.map((action) => [action.target.id, action.payload])).toEqual([
      ['went-well', { x: 20, y: 0 }],
      ['pairing', { x: 40, y: 60 }],
    ]);
  });

  it('keeps navigation canonical and focuses a frame from the sidebar', async () => {
    const el = mount({ hash: '#frame=pairing&item=nope' });
    await settle(el);
    expect(el.api.navigation).toEqual({});
    q(el, '.wb-frame-link[data-frame="to-improve"]').click();
    await settle(el);
    expect(el.api.navigation).toEqual({ frame: 'to-improve' });
    expect(q(el, '.wb-frame-link[data-frame="to-improve"]').getAttribute('aria-current')).toBe('true');
  });

  it('keeps the draft across a reload', async () => {
    const storage = 'storage-key="whiteboard-reload-test"';
    const first = mount({ storage });
    await settle(first);
    await drag(first, q(first, '[data-item-id="flaky"]'), [530, 70], [630, 470]);
    expect(first.api.actions).toHaveLength(1);
    const second = mount({ storage });
    await settle(second);
    expect(second.api.actions.map((action) => [action.type, action.payload])).toEqual([
      ['MOVE_ITEM', { x: 620, y: 460 }],
    ]);
    expect(q(second, '[data-item-id="flaky"]').style.left).toBe('620px');
  });
});
