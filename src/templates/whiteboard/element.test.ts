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

const pointer = (target: Element, type: string, x: number, y: number, init: PointerEventInit = {}): void => {
  target.dispatchEvent(
    new PointerEvent(type, { pointerId: 1, button: 0, clientX: x, clientY: y, bubbles: true, composed: true, ...init }),
  );
};

/** A press released where it started; the release lands on the canvas, as pointer capture sends it. */
const click = async (el: DpkTemplateWhiteboard, on: Element, at: [number, number], init: PointerEventInit = {}) => {
  pointer(on, 'pointerdown', ...at, init);
  pointer(q(el, '.wb-canvas'), 'pointerup', ...at, init);
  await settle(el);
};

const editor = (el: DpkTemplateWhiteboard, itemId: string): HTMLTextAreaElement =>
  q<HTMLTextAreaElement>(el, `[data-item-id="${itemId}"] textarea.wb-editor`);

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

  it('moves a selected frame by its empty inside, and selects it there first', async () => {
    const el = mount();
    await settle(el);
    const frame = q(el, '[data-item-id="went-well"]');
    // Not selected yet: a drag inside draws a selection area, a click selects the frame.
    await drag(el, frame, [300, 250], [390, 290]);
    expect(el.api.actions).toEqual([]);
    await click(el, frame, [300, 250]);
    expect(el.api.navigation['item']).toBe('went-well');
    await drag(el, frame, [300, 250], [300, 350]);
    expect(el.api.actions.map((action) => [action.target.id, action.payload])).toEqual([
      ['went-well', { x: 0, y: 100 }],
      ['pairing', { x: 20, y: 160 }],
    ]);
    expect(el.api.navigation['item']).toBe('went-well');
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
    const field = editor(el, id);
    expect(root(el).activeElement).toBe(field);
    field.value = 'Retry less';
    // A press on the canvas re-renders the board at once; the text must still land.
    await click(el, q(el, '.wb-canvas'), [2000, 2000]);
    expect(root(el).querySelector('textarea.wb-editor')).toBeNull();
    // Adding then typing is one net change: an item with that text.
    expect(el.api.state.items.find((item) => item.id === id)).toMatchObject({ kind: 'sticky', text: 'Retry less' });
  });

  it('edits a sticky on a second click or a double-click, never adding one', async () => {
    const el = mount();
    await settle(el);
    const sticky = q(el, '[data-item-id="pairing"]');
    await click(el, sticky, [100, 150]);
    expect(el.api.navigation['item']).toBe('pairing');
    expect(root(el).querySelector('.wb-editor')).toBeNull();
    // The second press of a double-click starts the edit; the dblclick itself reaches the canvas.
    await click(el, sticky, [100, 150]);
    q(el, '.wb-canvas').dispatchEvent(
      new MouseEvent('dblclick', { clientX: 100, clientY: 150, bubbles: true, composed: true }),
    );
    await settle(el);
    const field = editor(el, 'pairing');
    expect(root(el).activeElement).toBe(field);
    // The caret is placed, never the whole text selected.
    expect(field.selectionStart).toBe(field.selectionEnd);
    field.value = 'Pairing daily';
    field.dispatchEvent(new FocusEvent('blur'));
    await settle(el);
    expect(el.api.actions.map((action) => [action.type, action.payload])).toEqual([
      ['SET_ITEM_TEXT', { text: 'Pairing daily' }],
    ]);
    // On open ground (a frame's inside too) a double-click adds a sticky.
    await click(el, q(el, '.wb-canvas'), [300, 250]);
    q(el, '.wb-canvas').dispatchEvent(
      new MouseEvent('dblclick', { clientX: 300, clientY: 250, bubbles: true, composed: true }),
    );
    await settle(el);
    expect(el.api.actions.map((action) => action.type)).toEqual(['SET_ITEM_TEXT', 'ADD_ITEM']);
  });

  it('cancels an edit with Escape and keeps the text as it was', async () => {
    const el = mount({ hash: '#item=goal' });
    await settle(el);
    q(el, '.wb-canvas').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await settle(el);
    const field = editor(el, 'goal');
    field.value = 'Ship v2';
    field.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true }));
    await settle(el);
    expect(root(el).querySelector('.wb-editor')).toBeNull();
    expect(el.api.actions).toEqual([]);
  });

  it('selects with a dragged-out area and moves the selection together', async () => {
    const el = mount();
    await settle(el);
    // Starting on a frame's empty inside draws an area; it does not pan or pick the frame.
    await drag(el, q(el, '.wb-canvas'), [10, 50], [600, 100]);
    expect(el.api.navigation['item']).toBe('pairing,flaky');
    expect(root(el).querySelectorAll('.wb-item.is-selected')).toHaveLength(2);
    expect(q(el, '.wb-toolbar').getAttribute('aria-label')).toBe('2 items selected');
    await drag(el, q(el, '[data-item-id="pairing"]'), [30, 70], [40, 80]);
    expect(el.api.actions.map((action) => [action.target.id, action.payload])).toEqual([
      ['pairing', { x: 30, y: 70 }],
      ['flaky', { x: 530, y: 70 }],
    ]);
    // Shift-click takes one out again; a click on a frame's empty inside selects the frame.
    await click(el, q(el, '[data-item-id="flaky"]'), [540, 80], { shiftKey: true });
    expect(el.api.navigation['item']).toBe('pairing');
    await click(el, q(el, '.wb-canvas'), [300, 250]);
    expect(el.api.navigation['item']).toBe('went-well');
    await click(el, q(el, '.wb-canvas'), [2000, 2000]);
    expect(el.api.navigation['item']).toBeUndefined();
  });

  it('pans instead of selecting while Space is held', async () => {
    const el = mount();
    await settle(el);
    const canvas = q(el, '.wb-canvas');
    const world = q(el, '.wb-world');
    const before = world.style.transform;
    canvas.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    await settle(el);
    expect(canvas.classList.contains('wb-canvas--pan-ready')).toBe(true);
    await drag(el, canvas, [10, 50], [60, 120]);
    expect(world.style.transform).not.toBe(before);
    expect(el.api.navigation['item']).toBeUndefined();
    canvas.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', bubbles: true }));
    await settle(el);
    expect(canvas.classList.contains('wb-canvas--pan-ready')).toBe(false);
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

  it('sizes the text and restacks the selection from its toolbar', async () => {
    const el = mount({ hash: '#item=pairing' });
    await settle(el);
    expect(root(el).querySelector('.wb-toolbar [data-role="edit"], .wb-toolbar [data-role="connect"]')).toBeNull();
    q(el, '.wb-toolbar [data-font-size="large"]').click();
    await settle(el);
    expect(q(el, '[data-item-id="pairing"]').style.getPropertyValue('--wb-font-scale')).toBe('1.4');
    expect(q(el, '.wb-toolbar [data-font-size="large"]').getAttribute('aria-checked')).toBe('true');
    // Nothing overlaps pairing, so restacking it would change nothing: no control for it.
    expect(root(el).querySelector('.wb-toolbar [data-role="arrange"]')).toBeNull();
    // Laid over flaky, pairing is under it: the menu offers only the moves up.
    await drag(el, q(el, '[data-item-id="pairing"]'), [30, 70], [530, 90]);
    q(el, '.wb-toolbar [data-role="arrange"]').click();
    await settle(el);
    const enabled = [...root(el).querySelectorAll<HTMLButtonElement>('.wb-menu [data-arrange]')].map((item) => [
      item.dataset['arrange'],
      !item.disabled,
    ]);
    expect(enabled).toEqual([
      ['front', true],
      ['forward', true],
      ['backward', false],
      ['back', false],
    ]);
    q(el, '.wb-menu [data-arrange="front"]').click();
    await settle(el);
    expect(root(el).querySelector('.wb-menu')).toBeNull();
    expect(el.api.actions.map((action) => [action.type, action.payload])).toEqual([
      ['SET_ITEM_FONT_SIZE', { fontSize: 'large' }],
      ['MOVE_ITEM', { x: 520, y: 80 }],
      ['REORDER_ITEM', { after: 'goal' }],
    ]);
    const ids = [...root(el).querySelectorAll('.wb-item')].map((item) => item.getAttribute('data-item-id'));
    expect(ids).toEqual(['went-well', 'to-improve', 'flaky', 'goal', 'pairing']);
    // ⌘[ / Ctrl+[ sends it back to the bottom, which cancels the restack.
    q(el, '.wb-canvas').dispatchEvent(new KeyboardEvent('keydown', { key: '[', ctrlKey: true, bubbles: true }));
    await settle(el);
    expect(el.api.actions.map((action) => action.type)).toEqual(['SET_ITEM_FONT_SIZE', 'MOVE_ITEM']);
  });

  it('reshapes a connector from its toolbar', async () => {
    const el = mount({ hash: '#item=flaky-goal' });
    await settle(el);
    q(el, '.wb-toolbar [data-route="elbow"]').click();
    await settle(el);
    expect(el.api.actions.map((action) => [action.type, action.payload])).toEqual([
      ['SET_CONNECTOR_ROUTE', { route: 'elbow' }],
    ]);
    const d = q(el, '[data-connector-id="flaky-goal"] .wb-link').getAttribute('d') ?? '';
    expect(d.match(/ L /g)).toHaveLength(3);
    expect(q(el, '.wb-toolbar [data-route="elbow"]').getAttribute('aria-checked')).toBe('true');
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
