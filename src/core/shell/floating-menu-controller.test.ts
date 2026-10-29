// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { dockedMenuBox, FLOATING_MENU, type MenuArea, type MenuBox, type MenuDock } from './floating-menu';
import { FloatingMenuController } from './floating-menu-controller';

/** A 1200x800 screen, less a 60px header row. */
const AREA: MenuArea = { left: 0, top: 60, width: 1_200, height: 740 };
/** The menu as a column, which is how it opens (docked to the right edge). */
const SIZE = { width: 44, height: 240 };
const EMPTY = {
  left: 0,
  top: 0,
  width: 0,
  height: 0,
  right: 0,
  bottom: 0,
  x: 0,
  y: 0,
  toJSON: () => ({}),
} as DOMRect;

const rectOf = (box: MenuBox): DOMRect =>
  ({
    ...box,
    width: SIZE.width,
    height: SIZE.height,
    right: box.left + SIZE.width,
    bottom: box.top + SIZE.height,
    x: box.left,
    y: box.top,
    toJSON: () => ({}),
  }) as DOMRect;

/**
 * A host and a menu surface driven by hand: jsdom lays nothing out, so the test
 * supplies the two things a browser does — when the page's layout settles, and
 * where the last render drew the menu.
 */
const harness = (dock?: MenuDock) => {
  const state = { measurable: false, drawn: null as MenuBox | null };
  const surface = document.createElement('div');
  surface.getBoundingClientRect = () => (state.measurable && state.drawn !== null ? rectOf(state.drawn) : EMPTY);
  if (dock !== undefined) localStorage.setItem('dev-process-kit:menu:plain', JSON.stringify(dock));
  const host = {
    updates: 0,
    addController: (_controller: unknown): void => {},
    requestUpdate: (): void => {
      host.updates += 1;
    },
  };
  const controller = new FloatingMenuController(host as never, {
    surface: () => surface,
    area: () => AREA,
    persistKey: () => (dock === undefined ? null : 'plain'),
  });
  controller.hostConnected();
  /**
   * One render of the element whose chrome the menu is: the view draws it, then
   * the controller measures. The correction it asks for is made after that
   * update finishes, so the test lets the microtask that carries it run.
   */
  const render = async (): Promise<void> => {
    const placement = controller.placement;
    state.drawn = placement.box ?? dockedMenuBox(placement.dock, SIZE, AREA);
    controller.hostUpdated();
    await Promise.resolve();
  };
  return { controller, host, state, render };
};

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

describe('FloatingMenuController placement', () => {
  // The ERD case: a board whose layout settles after its first render. The menu
  // was drawn, but nothing was measurable yet, and returning early there left it
  // unplaced for the rest of the page's life.
  it('places the menu after a first render with no measurable surface', async () => {
    const { controller, host, state, render } = harness();
    await render();
    expect(controller.placement.box).toBeNull();
    // It asks for the one render that can place it.
    expect(host.updates).toBe(1);

    // The page's layout arrives, and the correction it asked for finds a size.
    state.measurable = true;
    await render();
    expect(controller.placement.box).toEqual({
      left: AREA.width - SIZE.width - FLOATING_MENU.margin,
      top: AREA.top + FLOATING_MENU.margin,
    });
    expect(host.updates).toBe(1);
  });

  it('asks once for a surface that never becomes measurable, so nothing spins', async () => {
    const { host, render } = harness();
    await render();
    await render();
    await render();
    expect(host.updates).toBe(1);
  });

  // The menu is drawn at its dock from the very first render: the insets that
  // place it need no measurement, so nothing gates its visibility on one.
  it('is drawn at its dock before it can be measured', () => {
    const { controller } = harness();
    const placement = controller.placement;
    expect(placement.box).toBeNull();
    expect(placement.insets).toEqual([
      { side: 'right', value: FLOATING_MENU.margin },
      { side: 'top', value: AREA.top + FLOATING_MENU.margin },
    ]);
  });

  it('asks for the render that moves a menu drawn where the state would not', async () => {
    const { controller, host, state, render } = harness();
    state.measurable = true;
    state.drawn = { left: 0, top: 0 };
    controller.hostUpdated();
    await Promise.resolve();
    expect(host.updates).toBe(1);

    await render();
    expect(host.updates).toBe(1);
    // Placed: the guard is cleared, so a later geometry change is corrected again.
    state.drawn = { left: 0, top: 0 };
    controller.hostUpdated();
    await Promise.resolve();
    expect(host.updates).toBe(2);
  });

  it('re-clamps a remembered dock that the screen no longer has room for', async () => {
    const { controller, host, state, render } = harness({ edge: 'bottom', offset: 5_000 });
    state.measurable = true;
    // Nothing is drawn yet, so the offset cannot be held inside the edge: it is clamped once the menu has a size.
    await render();
    expect(host.updates).toBe(1);
    await render();
    // The correction brings it back inside, and the dock it reports is the one drawn.
    const clamped: MenuDock = { edge: 'bottom', offset: AREA.width - SIZE.width - FLOATING_MENU.margin };
    expect(controller.placement.dock).toEqual(clamped);
    expect(controller.placement.box).toEqual(dockedMenuBox(clamped, SIZE, AREA));
    expect(host.updates).toBe(1);
  });
});
