import type { ReactiveControllerHost } from 'lit';

import { describe, expect, it, vi } from 'vitest';

import { CheckModeTopLayerController, MAXIMIZE_EVENT, maximizedPanelOf } from './check-mode-top-layer';

/** A host that behaves enough like a Lit element for a reactive controller. */
type FakeHost = ReactiveControllerHost & HTMLElement;

const fakeHost = (): FakeHost => {
  const host = document.createElement('div');
  const withControllers = Object.assign(host, {
    addController: () => {},
    removeController: () => {},
    requestUpdate: vi.fn(),
    updateComplete: Promise.resolve(true),
  });
  document.body.append(withControllers);
  return withControllers as FakeHost;
};

/** A layer that records what the top layer was asked to do, standing in for a real popover. */
type FakeLayer = HTMLElement & { readonly calls: string[] };

const fakeLayer = (): FakeLayer => {
  const layer = document.createElement('div');
  const calls: string[] = [];
  let open = false;
  Object.assign(layer, {
    showPopover: () => {
      open = true;
      calls.push('show');
    },
    hidePopover: () => {
      open = false;
      calls.push('hide');
    },
    matches: (selector: string) => selector === ':popover-open' && open,
  });
  document.body.append(layer);
  return Object.assign(layer, { calls }) as FakeLayer;
};

/** A panel under `host`: only its tag name matters to the controller. */
const panel = (host: Element): HTMLElement => {
  const element = document.createElement('dpk-dialog-panel');
  host.append(element);
  return element;
};

/** A panel a board renders in its own shadow root, the way a diagram has one. */
const panelInsideBoard = (host: Element): HTMLElement => {
  const board = document.createElement('dpk-board-er-diagram');
  const shadow = board.attachShadow({ mode: 'open' });
  const element = document.createElement('dpk-dialog-panel');
  shadow.append(element);
  host.append(board);
  return element;
};

const maximize = (target: Element, maximized: boolean): void => {
  target.dispatchEvent(new CustomEvent(MAXIMIZE_EVENT, { detail: { maximized }, bubbles: true, composed: true }));
};

const setup = (options: { active?: boolean; layer?: FakeLayer } = {}) => {
  const host = fakeHost();
  const layer = options.layer ?? fakeLayer();
  const placed = vi.fn();
  const controller = new CheckModeTopLayerController(host, {
    active: () => options.active ?? true,
    layer: () => layer,
    placed,
  });
  controller.hostConnected();
  return { host, layer, placed, controller };
};

describe('CheckModeTopLayerController', () => {
  it('shows the layer once a panel is maximized, and hides it when the panel is restored', () => {
    const { host, layer, controller } = setup();
    const er = panel(host);

    maximize(er, true);
    controller.hostUpdated();
    expect(layer.calls).toEqual(['show']);
    expect(controller.maximized).toBe(true);
    expect(controller.panels).toEqual([er]);

    maximize(er, false);
    controller.hostUpdated();
    expect(layer.calls).toEqual(['show', 'hide']);
    expect(controller.maximized).toBe(false);
  });

  it('puts its layer last again whenever a panel maximizes, even while already shown', () => {
    const { host, layer, controller } = setup();
    const er = panel(host);

    maximize(er, true);
    controller.hostUpdated();
    // A panel shown a second time is back above the layer: out and in again keeps the badges on top.
    maximize(er, true);
    controller.hostUpdated();

    expect(layer.calls).toEqual(['show', 'hide', 'show']);
  });

  it('shows nothing while Check Mode is off', () => {
    const { host, layer, controller } = setup({ active: false });
    maximize(panel(host), true);
    controller.hostUpdated();
    expect(layer.calls).toEqual([]);
    expect(controller.maximized).toBe(true);
  });

  it('hides the layer as soon as the render that drew it stops drawing it', () => {
    const layer = fakeLayer();
    let drawn: HTMLElement | null = layer;
    const host = fakeHost();
    const controller = new CheckModeTopLayerController(host, {
      active: () => true,
      layer: () => drawn,
      placed: () => {},
    });
    controller.hostConnected();
    maximize(panel(host), true);
    controller.hostUpdated();
    expect(layer.calls).toEqual(['show']);

    drawn = null; // Check Mode turned off: the layer is gone from the render
    controller.hostUpdated();
    expect(layer.calls).toEqual(['show', 'hide']);
  });

  it('places the badges again as soon as the layer is shown, and on every later render', () => {
    const { host, controller, placed } = setup();
    maximize(panel(host), true);
    controller.hostUpdated();
    expect(placed).toHaveBeenCalledTimes(1);
    controller.hostUpdated();
    expect(placed).toHaveBeenCalledTimes(2);
  });

  it('takes the layer out of the top layer when the host goes away', () => {
    const { host, layer, controller } = setup();
    maximize(panel(host), true);
    controller.hostUpdated();
    controller.hostDisconnected();
    expect(layer.calls).toEqual(['show', 'hide']);
    expect(controller.maximized).toBe(false);
  });

  it('finds the maximized panel of a board through the shadow root it is rendered in', () => {
    const { host, layer, controller } = setup();
    const er = panelInsideBoard(host);
    let target: EventTarget | null = null;
    host.addEventListener(MAXIMIZE_EVENT, (event) => {
      target = event.target;
    });

    maximize(er, true);
    controller.hostUpdated();

    // A browser retargets `target` to the board here; the panel is on the composed path either way.
    expect(target).not.toBeNull();
    expect(controller.panels).toEqual([er]);
    expect(layer.calls).toEqual(['show']);
  });
});

describe('maximizedPanelOf', () => {
  it('reads the panel out of the composed path, past the board that shadows it', () => {
    const outer = document.createElement('div');
    const board = document.createElement('dpk-board-er-diagram');
    const shadow = board.attachShadow({ mode: 'open' });
    const er = document.createElement('dpk-dialog-panel');
    shadow.append(er);
    outer.append(board);
    document.body.append(outer);

    const seen: { panel: Element | null } = { panel: null };
    outer.addEventListener(MAXIMIZE_EVENT, (event) => {
      seen.panel = maximizedPanelOf(event);
    });
    maximize(er, true);

    expect(seen.panel).toBe(er);
  });
});
