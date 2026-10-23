import { afterEach, describe, expect, it } from 'vitest';

import { DpkWhiteboard } from './element';
import { defineWhiteboard } from './index';
import { whiteboardMessages } from './messages';
import { parseWhiteboardBase } from './model';
import { connectorLabel, itemLabel } from './present';

const m = whiteboardMessages('en');

defineWhiteboard();

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

describe('<dpk-whiteboard>', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  const settle = async (element: DpkWhiteboard): Promise<void> => {
    for (let index = 0; index < 3; index++) await element.updateComplete;
  };

  const mount = async (raw: unknown = base): Promise<DpkWhiteboard> => {
    const element = document.createElement('dpk-whiteboard');
    if (!(element instanceof DpkWhiteboard)) throw new Error('did not upgrade');
    element.id = 'board';
    element.innerHTML = `<script type="application/json">${JSON.stringify(raw)}</script>`;
    document.body.append(element);
    await settle(element);
    return element;
  };

  /** Stand-in for the hosting page: accept each action, then hand the recorded draft back. */
  const acceptActions = (element: DpkWhiteboard): void => {
    element.addEventListener('dpk-element-action', (event) => {
      if (!(event instanceof CustomEvent)) return;
      event.preventDefault();
      const detail: { type: string; target: string; payload: unknown } = event.detail;
      element.elementActions = [
        ...element.elementActions,
        {
          id: `a${element.elementActions.length}`,
          type: detail.type,
          target: { type: 'element', id: detail.target.slice('element:'.length) },
          payload: detail.payload,
          createdAt: '2026-09-24T00:00:00.000Z',
        },
      ];
    });
  };

  const q = <T extends Element = HTMLElement>(element: DpkWhiteboard, selector: string): T => {
    const found = element.renderRoot.querySelector<T>(selector);
    if (found === null) throw new Error(`missing ${selector}`);
    return found;
  };

  const pointer = (target: Element, type: string, x: number, y: number, init: PointerEventInit = {}): void => {
    target.dispatchEvent(
      new PointerEvent(type, {
        pointerId: 1,
        button: 0,
        clientX: x,
        clientY: y,
        bubbles: true,
        composed: true,
        ...init,
      }),
    );
  };

  /** A press released where it started; the release lands on the canvas, as pointer capture sends it. */
  const click = async (
    element: DpkWhiteboard,
    on: Element,
    at: [number, number],
    init: PointerEventInit = {},
  ): Promise<void> => {
    pointer(on, 'pointerdown', ...at, init);
    pointer(q(element, '.wb-canvas'), 'pointerup', ...at, init);
    await settle(element);
  };

  /** Press on `from`, then move and release over the canvas (where pointer capture sends them). */
  const drag = async (
    element: DpkWhiteboard,
    from: Element,
    start: [number, number],
    end: [number, number],
  ): Promise<void> => {
    pointer(from, 'pointerdown', ...start);
    await settle(element);
    const canvas = q(element, '.wb-canvas');
    pointer(canvas, 'pointermove', ...end);
    await settle(element);
    pointer(canvas, 'pointerup', ...end);
    await settle(element);
  };

  const editor = (element: DpkWhiteboard, itemId: string): HTMLInputElement | HTMLTextAreaElement =>
    q(element, `[data-item-id="${itemId}"] .wb-editor`);

  /** Every recorded action, in `[type, elementId, payload]` form for terse assertions. */
  const actionsOf = (element: DpkWhiteboard): (readonly [string, string, unknown])[] =>
    element.elementActions.map((action) => [action.type, action.target.id, action.payload]);

  it('draws frames behind items and connectors between them', async () => {
    const element = await mount();
    const root = element.renderRoot;
    const ids = [...root.querySelectorAll('.wb-item')].map((item) => item.getAttribute('data-item-id'));
    expect(ids).toEqual(['went-well', 'to-improve', 'pairing', 'flaky', 'goal']);
    expect(root.querySelectorAll('[data-connector-id]')).toHaveLength(1);
    expect(q(element, '[data-connector-label="flaky-goal"]').textContent).toContain('blocks');
  });

  it('offers the whole board, every item and every connector as a comment target', async () => {
    const element = await mount();
    const state = parseWhiteboardBase(base);
    expect(element.commentTargets.map((target) => [target.value, target.label])).toEqual([
      ['element:board/page/whiteboard', m.wholeBoard],
      ...state.items.map((item) => [`element:board/item/${item.id}`, itemLabel(m, item)]),
      ...state.connectors.map((connector) => [
        `element:board/connector/${connector.id}`,
        connectorLabel(m, state, connector),
      ]),
    ]);
  });

  it('drags a sticky into another frame as one move', async () => {
    const element = await mount();
    acceptActions(element);
    await drag(element, q(element, '[data-item-id="pairing"]'), [30, 70], [530, 120]);
    expect(actionsOf(element)).toEqual([['MOVE_ITEM', 'board/item/pairing', { x: 520, y: 110 }]]);
    expect(element.selection).toEqual({ kind: 'item', id: 'pairing' });
  });

  it('carries the contents of a frame dragged by its title', async () => {
    const element = await mount();
    acceptActions(element);
    await drag(element, q(element, '[data-item-id="went-well"] .wb-frame-title'), [10, -10], [10, 90]);
    expect(actionsOf(element).map(([, id, payload]) => [id, payload])).toEqual([
      ['board/item/went-well', { x: 0, y: 100 }],
      ['board/item/pairing', { x: 20, y: 160 }],
    ]);
  });

  it('moves a selected frame by its empty inside, and selects it there first', async () => {
    const element = await mount();
    acceptActions(element);
    const frame = q(element, '[data-item-id="went-well"]');
    // Not selected yet: a drag inside draws a selection area, a click selects the frame.
    await drag(element, frame, [300, 250], [390, 290]);
    expect(element.elementActions).toEqual([]);
    await click(element, frame, [300, 250]);
    expect(element.selection).toEqual({ kind: 'item', id: 'went-well' });
    await drag(element, frame, [300, 250], [300, 350]);
    expect(actionsOf(element).map(([, id, payload]) => [id, payload])).toEqual([
      ['board/item/went-well', { x: 0, y: 100 }],
      ['board/item/pairing', { x: 20, y: 160 }],
    ]);
    expect(element.selection).toEqual({ kind: 'item', id: 'went-well' });
  });

  it('adds a sticky from the toolbar and types into it', async () => {
    const element = await mount();
    acceptActions(element);
    q(element, '[data-add="sticky"]').click();
    await settle(element);
    const [added] = element.elementActions;
    if (added === undefined) throw new Error('expected an element action');
    expect(added.type).toBe('ADD_ITEM');
    const id = (added.payload as { id: string }).id;
    expect(element.selection).toEqual({ kind: 'item', id });
    const field = editor(element, id);
    expect(element.shadowRoot?.activeElement).toBe(field);
    field.value = 'Retry less';
    field.dispatchEvent(new FocusEvent('blur'));
    await settle(element);
    expect(actionsOf(element).map(([type]) => type)).toEqual(['ADD_ITEM', 'SET_ITEM_TEXT']);
    expect(element.renderRoot.querySelector('.wb-editor')).toBeNull();
  });

  it('edits a sticky on a second click or a double-click, never adding one', async () => {
    const element = await mount();
    acceptActions(element);
    const sticky = q(element, '[data-item-id="pairing"]');
    await click(element, sticky, [100, 150]);
    expect(element.selection).toEqual({ kind: 'item', id: 'pairing' });
    expect(element.renderRoot.querySelector('.wb-editor')).toBeNull();
    // The second press of a double-click starts the edit; the dblclick itself reaches the canvas.
    await click(element, sticky, [100, 150]);
    q(element, '.wb-canvas').dispatchEvent(
      new MouseEvent('dblclick', { clientX: 100, clientY: 150, bubbles: true, composed: true }),
    );
    await settle(element);
    const field = editor(element, 'pairing');
    expect(element.shadowRoot?.activeElement).toBe(field);
    // The caret is placed, never the whole text selected.
    expect(field.selectionStart).toBe(field.selectionEnd);
    field.value = 'Pairing daily';
    field.dispatchEvent(new FocusEvent('blur'));
    await settle(element);
    expect(actionsOf(element)).toEqual([['SET_ITEM_TEXT', 'board/item/pairing', { text: 'Pairing daily' }]]);
    // On open ground (a frame's inside too) a double-click adds a sticky.
    await click(element, q(element, '.wb-canvas'), [300, 250]);
    q(element, '.wb-canvas').dispatchEvent(
      new MouseEvent('dblclick', { clientX: 300, clientY: 250, bubbles: true, composed: true }),
    );
    await settle(element);
    expect(actionsOf(element).map(([type]) => type)).toEqual(['SET_ITEM_TEXT', 'ADD_ITEM']);
  });

  it('cancels an edit with Escape and keeps the text as it was', async () => {
    const element = await mount();
    acceptActions(element);
    await click(element, q(element, '[data-item-id="goal"]'), [1100, 100]);
    expect(element.selection).toEqual({ kind: 'item', id: 'goal' });
    q(element, '.wb-canvas').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await settle(element);
    const field = editor(element, 'goal');
    field.value = 'Ship v2';
    field.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true }));
    await settle(element);
    expect(element.renderRoot.querySelector('.wb-editor')).toBeNull();
    expect(element.elementActions).toEqual([]);
  });

  it('selects with a dragged-out area and moves the selection together', async () => {
    const element = await mount();
    acceptActions(element);
    // Starting on a frame's empty inside draws an area; it does not pan or pick the frame.
    await drag(element, q(element, '.wb-canvas'), [10, 50], [600, 100]);
    expect(element.renderRoot.querySelectorAll('.wb-item.is-selected')).toHaveLength(2);
    expect(q(element, '.wb-toolbar').getAttribute('aria-label')).toBe('2 items selected');
    await drag(element, q(element, '[data-item-id="pairing"]'), [30, 70], [40, 80]);
    expect(actionsOf(element).map(([, id, payload]) => [id, payload])).toEqual([
      ['board/item/pairing', { x: 30, y: 70 }],
      ['board/item/flaky', { x: 530, y: 70 }],
    ]);
    // Shift-click takes one out again; a click on a frame's empty inside selects the frame.
    await click(element, q(element, '[data-item-id="flaky"]'), [540, 80], { shiftKey: true });
    expect(element.selection).toEqual({ kind: 'item', id: 'pairing' });
    await click(element, q(element, '.wb-canvas'), [300, 250]);
    expect(element.selection).toEqual({ kind: 'item', id: 'went-well' });
    await click(element, q(element, '.wb-canvas'), [2000, 2000]);
    expect(element.selection).toBeNull();
  });

  it('pans instead of selecting while Space is held', async () => {
    const element = await mount();
    const canvas = q(element, '.wb-canvas');
    const world = q(element, '.wb-world');
    const before = world.style.transform;
    canvas.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    await settle(element);
    expect(canvas.classList.contains('wb-canvas--pan-ready')).toBe(true);
    await drag(element, canvas, [10, 50], [60, 120]);
    expect(world.style.transform).not.toBe(before);
    expect(element.selection).toBeNull();
    canvas.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', bubbles: true }));
    await settle(element);
    expect(canvas.classList.contains('wb-canvas--pan-ready')).toBe(false);
  });

  it('connects two items by dragging out of the connect handle', async () => {
    const element = await mount();
    acceptActions(element);
    await click(element, q(element, '[data-item-id="pairing"]'), [100, 150]);
    await drag(element, q(element, '[data-item-id="pairing"] .wb-handle--connect'), [200, 140], [580, 120]);
    expect(actionsOf(element).map(([type, , payload]) => [type, payload])).toEqual([
      ['CONNECT_ITEMS', { id: 'pairing-to-flaky', from: 'pairing', to: 'flaky' }],
    ]);
    // The new connector is selected, ready to be labeled.
    expect(element.selection).toEqual({ kind: 'connector', id: 'pairing-to-flaky' });
  });

  it('resizes the selected item from its corner', async () => {
    const element = await mount();
    acceptActions(element);
    await click(element, q(element, '[data-item-id="goal"]'), [1100, 100]);
    await drag(element, q(element, '[data-item-id="goal"] .wb-handle--resize'), [1180, 150], [1240, 190]);
    expect(actionsOf(element).map(([type, , payload]) => [type, payload])).toEqual([
      ['RESIZE_ITEM', { w: 240, h: 150 }],
    ]);
  });

  it('recolors and deletes the selection from its toolbar', async () => {
    const element = await mount();
    acceptActions(element);
    await click(element, q(element, '[data-item-id="pairing"]'), [100, 150]);
    q(element, '.wb-swatch[data-color="pink"]').click();
    await settle(element);
    expect(actionsOf(element)).toEqual([['SET_ITEM_COLOR', 'board/item/pairing', { color: 'pink' }]]);

    q(element, '.wb-toolbar [data-role="delete"]').click();
    await settle(element);
    expect(actionsOf(element).map(([type]) => type)).toEqual(['SET_ITEM_COLOR', 'DELETE_ITEM']);
    expect(element.renderRoot.querySelector('[data-item-id="pairing"]')).toBeNull();
    expect(element.selection).toBeNull();
  });

  it('sizes the text and restacks the selection from its toolbar', async () => {
    const element = await mount();
    acceptActions(element);
    await click(element, q(element, '[data-item-id="pairing"]'), [100, 150]);
    // Nothing overlaps pairing, so restacking it would change nothing: no control for it.
    expect(element.renderRoot.querySelector('.wb-toolbar [data-role="arrange"]')).toBeNull();
    q(element, '.wb-toolbar [data-font-size="large"]').click();
    await settle(element);
    expect(q(element, '[data-item-id="pairing"]').style.getPropertyValue('--wb-font-scale')).toBe('1.4');
    expect(q(element, '.wb-toolbar [data-font-size="large"]').getAttribute('aria-checked')).toBe('true');
    // Laid over flaky, pairing is under it: the menu offers only the moves up.
    await drag(element, q(element, '[data-item-id="pairing"]'), [30, 70], [530, 90]);
    q(element, '.wb-toolbar [data-role="arrange"]').click();
    await settle(element);
    const enabled = [...element.renderRoot.querySelectorAll<HTMLButtonElement>('.wb-menu [data-arrange]')].map(
      (item) => [item.dataset['arrange'], !item.disabled],
    );
    expect(enabled).toEqual([
      ['front', true],
      ['forward', true],
      ['backward', false],
      ['back', false],
    ]);
    q(element, '.wb-menu [data-arrange="front"]').click();
    await settle(element);
    expect(element.renderRoot.querySelector('.wb-menu')).toBeNull();
    expect(actionsOf(element).map(([type]) => type)).toEqual(['SET_ITEM_FONT_SIZE', 'MOVE_ITEM', 'REORDER_ITEM']);
    const ids = [...element.renderRoot.querySelectorAll('.wb-item')].map((item) => item.getAttribute('data-item-id'));
    expect(ids).toEqual(['went-well', 'to-improve', 'flaky', 'goal', 'pairing']);
  });

  it('reshapes a connector from its toolbar, and deletes it with the Delete key', async () => {
    const element = await mount();
    acceptActions(element);
    await click(element, q(element, '[data-connector-id="flaky-goal"] .wb-link-hit'), [0, 0]);
    expect(element.selection).toEqual({ kind: 'connector', id: 'flaky-goal' });
    q(element, '.wb-toolbar [data-route="elbow"]').click();
    await settle(element);
    expect(actionsOf(element)).toEqual([['SET_CONNECTOR_ROUTE', 'board/connector/flaky-goal', { route: 'elbow' }]]);
    const d = q(element, '[data-connector-id="flaky-goal"] .wb-link').getAttribute('d') ?? '';
    expect(d.match(/ L /g)).toHaveLength(3);
    expect(q(element, '.wb-toolbar [data-route="elbow"]').getAttribute('aria-checked')).toBe('true');

    q(element, '.wb-canvas').dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }));
    await settle(element);
    expect(actionsOf(element).map(([type]) => type)).toEqual(['SET_CONNECTOR_ROUTE', 'DELETE_CONNECTOR']);
  });

  it('duplicates the selected item with copy and paste', async () => {
    const element = await mount();
    acceptActions(element);
    await click(element, q(element, '[data-item-id="pairing"]'), [100, 150]);
    const canvas = q(element, '.wb-canvas');
    canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', ctrlKey: true, bubbles: true }));
    canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'v', ctrlKey: true, bubbles: true }));
    await settle(element);
    expect(actionsOf(element).map(([type]) => type)).toEqual(['ADD_ITEM']);
    const [added] = element.elementActions;
    expect(added?.payload).toMatchObject({ kind: 'sticky' });
    expect(added?.payload).not.toMatchObject({ id: 'pairing' });
  });

  it('marks an item with the grill questions it answers', async () => {
    const marked = {
      ...base,
      items: [{ ...base.items[0], questions: 'Q1 Q2' }, ...base.items.slice(1)],
    };
    const element = await mount(marked);
    expect(q(element, '[data-item-id="went-well"]').dataset['grillQuestions']).toBe('Q1 Q2');
    expect(q(element, '[data-item-id="to-improve"]').hasAttribute('data-grill-questions')).toBe(false);
  });

  it('nudges the selection with the arrow keys', async () => {
    const element = await mount();
    acceptActions(element);
    await click(element, q(element, '[data-item-id="went-well"]'), [300, 250]);
    const canvas = q(element, '.wb-canvas');
    canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    await settle(element);
    // Each key press is dispatched (and recorded) on its own; a host's own controller is
    // what compacts adjacent same-target patches (`appendAction` in `core/action.ts`), not
    // this element, so a bare test harness sees both nudges rather than their sum.
    expect(actionsOf(element).map(([, id, payload]) => [id, payload])).toEqual([
      ['board/item/went-well', { x: 10, y: 0 }],
      ['board/item/pairing', { x: 30, y: 60 }],
      ['board/item/went-well', { x: 20, y: 0 }],
      ['board/item/pairing', { x: 40, y: 60 }],
    ]);
  });
});
