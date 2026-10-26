// @vitest-environment jsdom
/**
 * The relative portal both badge kinds share: a badge is a child of its mark's
 * own positioned parent, placed in that parent's coordinates, so no feature
 * needs a viewport layer and a badge cannot drift away from its mark.
 */
import { afterEach, describe, expect, it } from 'vitest';

import { BADGE_GUTTER_ATTRIBUTE, BadgePortalController, portalParentOf, type PortalBadgeBinding } from './badge-portal';

type Binding = PortalBadgeBinding & { readonly ref: string };

const rect = (left: number, top: number, width: number, height: number): DOMRect =>
  ({
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    x: left,
    y: top,
    toJSON: () => ({}),
  }) as DOMRect;

const size = (element: HTMLElement, width: number, height: number): void => {
  Object.defineProperty(element, 'offsetWidth', { value: width, configurable: true });
  Object.defineProperty(element, 'offsetHeight', { value: height, configurable: true });
};

const frames = async (count = 2): Promise<void> => {
  for (let index = 0; index < count; index += 1) {
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
  }
};

type Mounted = {
  readonly controller: BadgePortalController<Binding>;
  readonly parent: HTMLElement;
  readonly target: HTMLElement;
  readonly badges: () => HTMLButtonElement[];
  readonly moveTarget: (left: number, top: number) => void;
  readonly setActive: (value: boolean) => void;
  readonly setGutter: (value: boolean) => void;
  readonly setBindings: (bindings: readonly Binding[]) => void;
};

let mounted: Mounted | null = null;

/**
 * A host with one mark inside a positioned parent the width of a column: the
 * shape a board node has in its diagram world, and a card in a matrix cell.
 */
const mount = (options: { readonly gutter?: boolean } = {}): Mounted => {
  const host = document.createElement('div');
  const parent = document.createElement('div');
  parent.style.position = 'relative';
  document.body.append(host);
  host.append(parent);
  size(parent, 400, 300);
  Object.defineProperty(parent, 'clientWidth', { value: 400, configurable: true });
  Object.defineProperty(parent, 'clientHeight', { value: 300, configurable: true });
  parent.getBoundingClientRect = () => rect(0, 0, 400, 300);

  const target = document.createElement('div');
  size(target, 80, 40);
  let box = rect(100, 60, 80, 40);
  target.getBoundingClientRect = () => box;
  // jsdom lays nothing out, so the box a browser would report is stubbed.
  target.getClientRects = () => [box] as unknown as DOMRectList;
  parent.append(target);

  let active = true;
  let gutter = options.gutter ?? false;
  let bindings: readonly Binding[] = [{ index: 0, target, ref: 'card:a' }];

  const controller = new BadgePortalController(
    Object.assign(host, {
      addController: () => {},
      removeController: () => {},
      requestUpdate: () => {},
      updateComplete: Promise.resolve(true),
    }),
    {
      active: () => active,
      bindings: () => bindings,
      spec: {
        portalClass: 'dpk-test-portal',
        styles: '.dpk-test-badge { position: absolute; }',
        keyOf: (binding) => `${binding.index}:${binding.ref}`,
        create: () => {
          const button = document.createElement('button');
          button.className = 'dpk-test-badge';
          button.textContent = 'Q1';
          size(button, 30, 22);
          return button;
        },
        update: (button, binding) => {
          button.dataset['ref'] = binding.ref;
        },
        gutterOf: () => gutter,
      },
    },
  );
  controller.hostUpdated();

  const badgeList = (): HTMLButtonElement[] => [...parent.querySelectorAll<HTMLButtonElement>('.dpk-test-badge')];
  const state: Mounted = {
    controller,
    parent,
    target,
    badges: badgeList,
    moveTarget: (left, top) => {
      box = rect(left, top, 80, 40);
    },
    setActive: (value) => {
      active = value;
    },
    setGutter: (value) => {
      gutter = value;
    },
    setBindings: (next) => {
      bindings = next;
    },
  };
  mounted = state;
  return state;
};

/** A controller a test mounts itself, torn down with `mounted`'s. */
let transient: { readonly hostDisconnected: () => void } | null = null;

afterEach(() => {
  mounted?.controller.hostDisconnected();
  mounted = null;
  transient?.hostDisconnected();
  transient = null;
  document.body.replaceChildren();
});

describe('portalParentOf', () => {
  it('uses the box the mark is laid out in, and never a table row', () => {
    const wrapper = document.createElement('div');
    const table = document.createElement('table');
    const body = document.createElement('tbody');
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    const target = document.createElement('span');
    cell.append(target);
    row.append(cell);
    body.append(row);
    table.append(body);
    wrapper.append(table);
    document.body.append(wrapper);
    // A row cannot hold an absolutely positioned layer: the box above it does.
    expect(portalParentOf(row)).toBe(wrapper);
    // A mark in a cell keeps the cell: it is not a table part itself.
    expect(portalParentOf(target)).toBe(cell);
  });

  it('falls back to the mark’s own parent when it has no offset parent', () => {
    const parent = document.createElement('div');
    const target = document.createElement('span');
    parent.append(target);
    expect(portalParentOf(target)).toBe(parent);
  });

  it('prefers a scrolling box inside the positioned one, since only it moves the mark', () => {
    const column = document.createElement('div');
    column.style.position = 'relative';
    const frame = document.createElement('div');
    frame.style.overflow = 'auto';
    const target = document.createElement('span');
    column.append(frame);
    frame.append(target);
    document.body.append(column);
    expect(portalParentOf(target)).toBe(frame);
  });

  it('reaches the scroll frame through a slot, where the mark’s parent chain stops', () => {
    const column = document.createElement('div');
    column.style.position = 'relative';
    const frame = document.createElement('div');
    frame.style.overflow = 'auto';
    const host = document.createElement('div');
    const slot = document.createElement('slot');
    host.attachShadow({ mode: 'open' }).append(slot);
    const mark = document.createElement('span');
    column.append(frame);
    frame.append(host);
    host.append(mark);
    document.body.append(column);
    // The mark is a light child of the host: `parentElement` never leaves it.
    expect(mark.parentElement).toBe(host);
    expect(portalParentOf(mark)).toBe(frame);
  });

  it('never puts a portal in a slot, which renders none of its own children', () => {
    const host = document.createElement('div');
    const slot = document.createElement('slot');
    host.attachShadow({ mode: 'open' }).append(slot);
    const mark = document.createElement('span');
    host.append(mark);
    document.body.append(host);
    // Nothing above the slot is positioned or scrolling, so the walk ends on the
    // host's own box: a layer appended to the slot would be fallback content the
    // browser closes over the moment the mark is assigned to it.
    expect(mark.assignedSlot).toBe(slot);
    expect(portalParentOf(mark)).toBe(host);
  });
});

describe('BadgePortalController', () => {
  it('draws the badge inside the mark’s parent, on the mark’s top-right corner', async () => {
    const { parent, badges } = mount();
    await frames();
    const portal = parent.querySelector('.dpk-test-portal');
    expect(portal).not.toBeNull();
    expect(portal?.parentElement).toBe(parent);
    // The portal is a child of the mark's box, never a layer of the page's own.
    expect(portal?.parentElement).not.toBe(document.body);
    const badge = badges()[0];
    expect(badge?.dataset['ref']).toBe('card:a');
    // right (100 + 80) + the 8px overhang, minus the badge's own width; the
    // badge hangs half its height above the mark's top edge.
    expect(badge?.style.left).toBe('158px');
    expect(badge?.style.top).toBe('49px');
  });

  it('lays the author’s own markup in the parent’s right-hand gutter, and says so', async () => {
    const { parent, badges } = mount({ gutter: true });
    await frames();
    expect(parent.hasAttribute(BADGE_GUTTER_ATTRIBUTE)).toBe(true);
    expect(badges()[0]?.style.left).toBe('370px');
    // A parent shorter than its gutter badges grows to the last one instead of
    // piling them up on its bottom edge.
    expect(parent.style.minHeight).toBe('82px');
  });

  it('keeps several badges on one mark, side by side', async () => {
    const { parent, setBindings, target } = mount();
    await frames();
    setBindings([
      { index: 0, target, ref: 'card:a' },
      { index: 1, target, ref: 'card:b' },
    ]);
    mounted?.controller.refresh();
    await frames();
    const badges = [...parent.querySelectorAll<HTMLButtonElement>('.dpk-test-badge')];
    expect(badges.map((badge) => badge.dataset['ref'])).toEqual(['card:a', 'card:b']);
    // The last badge is the rightmost; the earlier one sits to its left.
    expect(badges.map((badge) => badge.style.left)).toEqual(['123px', '158px']);
  });

  it('reuses a badge across renders, so a focused one keeps its focus', async () => {
    const { controller, badges } = mount();
    await frames();
    const first = badges()[0];
    first?.focus();
    controller.refresh();
    await frames();
    expect(badges()).toHaveLength(1);
    expect(badges()[0]).toBe(first);
    expect(document.activeElement).toBe(first);
  });

  it('follows its mark when the mark moves inside the parent, without a scroll event', async () => {
    const { moveTarget, badges } = mount();
    await frames();
    moveTarget(200, 120);
    await frames(3);
    expect(badges()[0]?.style.left).toBe('258px');
    expect(badges()[0]?.style.top).toBe('109px');
  });

  it('removes the badge, its layer and the gutter claim when the feature is off', async () => {
    const { controller, parent, setActive } = mount({ gutter: true });
    await frames();
    setActive(false);
    controller.hostUpdated();
    expect(parent.querySelector('.dpk-test-portal')).toBeNull();
    expect(parent.hasAttribute(BADGE_GUTTER_ATTRIBUTE)).toBe(false);
  });

  it('removes a mark’s badge when its binding goes away', async () => {
    const { controller, parent, setBindings } = mount();
    await frames();
    setBindings([]);
    controller.refresh();
    expect(parent.querySelector('.dpk-test-badge')).toBeNull();
    expect(parent.querySelector('.dpk-test-portal')).toBeNull();
  });

  /**
   * A view renders its marks and hands them to the component around them in the
   * same pass, but that component draws its own shadow root — the slots, and the
   * scroll frame the marks move in — a microtask later. A badge drawn in between
   * lands in the box above the component, which the scroll passes under.
   */
  it('re-homes a badge onto the frame once the component has drawn it', async () => {
    const outer = document.createElement('div');
    outer.style.position = 'relative';
    const component = document.createElement('div');
    const mark = document.createElement('div');
    size(mark, 80, 40);
    const box = rect(100, 60, 80, 40);
    mark.getBoundingClientRect = () => box;
    mark.getClientRects = () => [box] as unknown as DOMRectList;
    document.body.append(outer);
    outer.append(component);
    component.append(mark);
    const shadow = component.attachShadow({ mode: 'open' });

    const binding: Binding = { index: 0, target: mark, ref: 'card:a' };
    const controller = new BadgePortalController(
      Object.assign(outer, {
        addController: () => {},
        removeController: () => {},
        requestUpdate: () => {},
        updateComplete: Promise.resolve(true),
      }),
      {
        active: () => true,
        bindings: () => [binding],
        spec: {
          portalClass: 'dpk-test-portal',
          styles: '.dpk-test-badge { position: absolute; }',
          keyOf: (one) => `${one.index}:${one.ref}`,
          create: () => Object.assign(document.createElement('button'), { className: 'dpk-test-badge' }),
          update: () => {},
        },
      },
    );
    transient = controller;
    controller.hostUpdated();
    // Nothing to scroll in yet: the box above the component is all there is.
    expect(outer.querySelector('.dpk-test-portal')?.parentElement).toBe(outer);

    const frame = document.createElement('div');
    frame.style.overflow = 'auto';
    frame.append(document.createElement('slot'));
    shadow.append(frame);
    expect(mark.assignedSlot).not.toBeNull();

    await frames(3);
    // The badge followed the mark into the frame, layer and all.
    expect(frame.querySelector('.dpk-test-portal')?.parentElement).toBe(frame);
    expect(outer.querySelector('.dpk-test-portal')).toBeNull();
    expect(outer.style.position).toBe('relative');
  });
});

/** Where the scroll frame sits on screen, and how big the window into its content is. */
const FRAME = { left: 24, top: 200, width: 400, height: 300 };

/** The mark's place in the frame's *content*, far right and far down: a badge clamped to the visible window would land on the frame's own corner instead. */
const MARK = { left: 2000, top: 620, width: 80, height: 40 };

type Scrolled = {
  readonly controller: BadgePortalController<Binding>;
  readonly column: HTMLElement;
  readonly frame: HTMLElement;
  readonly target: HTMLElement;
  readonly badges: () => HTMLButtonElement[];
  readonly scrollTo: (left: number, top: number) => void;
  readonly setActive: (value: boolean) => void;
  /** Another badge kind drawing into the same frame, as the grill's and Check Mode's do. */
  readonly secondController: () => { readonly controller: BadgePortalController<Binding>; readonly stop: () => void };
};

/**
 * A mark inside a scroll frame inside a positioned column — the shape a card
 * has in a matrix: the frame is not positioned, so it becomes the badge's box
 * only by being adopted, and the column is the box an `offsetParent`-shaped
 * portal would have chosen instead. jsdom lays nothing out, so the frame's
 * scroll and the mark's box are stubbed the way a browser would report them.
 */
const mountScrolled = (): Scrolled => {
  const host = document.createElement('div');
  const column = document.createElement('div');
  column.style.position = 'relative';
  const frame = document.createElement('div');
  frame.style.overflow = 'auto';
  const target = document.createElement('div');
  document.body.append(host);
  host.append(column);
  column.append(frame);
  frame.append(target);
  size(column, 1280, 600);
  Object.defineProperty(column, 'clientWidth', { value: 1280, configurable: true });
  Object.defineProperty(column, 'clientHeight', { value: 600, configurable: true });
  column.getBoundingClientRect = () => rect(0, 0, 1280, 600);
  size(frame, FRAME.width, FRAME.height);
  Object.defineProperty(frame, 'clientWidth', { value: FRAME.width, configurable: true });
  Object.defineProperty(frame, 'clientHeight', { value: FRAME.height, configurable: true });
  Object.defineProperty(frame, 'scrollWidth', { value: 2600, configurable: true });
  Object.defineProperty(frame, 'scrollHeight', { value: 900, configurable: true });
  frame.getBoundingClientRect = () => rect(FRAME.left, FRAME.top, FRAME.width, FRAME.height);
  let scrolledLeft = 0;
  let scrolledTop = 0;
  Object.defineProperty(frame, 'scrollLeft', { get: () => scrolledLeft, configurable: true });
  Object.defineProperty(frame, 'scrollTop', { get: () => scrolledTop, configurable: true });
  const markBox = (): DOMRect =>
    rect(FRAME.left + MARK.left - scrolledLeft, FRAME.top + MARK.top - scrolledTop, MARK.width, MARK.height);
  size(target, MARK.width, MARK.height);
  target.getBoundingClientRect = markBox;
  target.getClientRects = () => [markBox()] as unknown as DOMRectList;

  const bindings: readonly Binding[] = [{ index: 0, target, ref: 'card:a' }];
  const controllerFor = (active: () => boolean): BadgePortalController<Binding> =>
    new BadgePortalController(
      Object.assign(host, {
        addController: () => {},
        removeController: () => {},
        requestUpdate: () => {},
        updateComplete: Promise.resolve(true),
      }),
      {
        active,
        bindings: () => bindings,
        spec: {
          portalClass: 'dpk-test-portal',
          styles: '.dpk-test-badge { position: absolute; }',
          keyOf: (binding) => `${binding.index}:${binding.ref}`,
          create: () => {
            const button = document.createElement('button');
            button.className = 'dpk-test-badge';
            size(button, 30, 22);
            return button;
          },
          update: () => {},
        },
      },
    );
  let active = true;
  const controller = controllerFor(() => active);
  controller.hostUpdated();
  const state: Scrolled = {
    controller,
    column,
    frame,
    target,
    badges: () => [...frame.querySelectorAll<HTMLButtonElement>('.dpk-test-badge')],
    scrollTo: (left, top) => {
      scrolledLeft = left;
      scrolledTop = top;
    },
    setActive: (value) => {
      active = value;
    },
    secondController: () => {
      let on = true;
      const second = controllerFor(() => on);
      second.hostUpdated();
      return {
        controller: second,
        stop: () => {
          on = false;
          second.hostUpdated();
        },
      };
    },
  };
  mounted = state as unknown as Mounted;
  return state;
};

describe('BadgePortalController in a scrolled box', () => {
  it('puts the portal inside the scroll frame, not in the positioned box above it', async () => {
    const { frame, column, badges } = mountScrolled();
    await frames();
    const portal = frame.querySelector('.dpk-test-portal');
    expect(portal?.parentElement).toBe(frame);
    // Nothing of the column's own: a badge there would not move with the scroll.
    expect([...column.children]).not.toContain(portal);
    expect(badges()).toHaveLength(1);
  });

  it('adopts the scroll frame as the layer’s containing block, and gives it back afterwards', async () => {
    const { controller, frame, frame: scroller, setActive } = mountScrolled();
    await frames();
    expect(frame.style.position).toBe('relative');
    setActive(false);
    controller.hostUpdated();
    expect(scroller.style.position).toBe('');
  });

  it('places the badge on its mark’s content coordinates, not clamped to the visible window', async () => {
    const { badges } = mountScrolled();
    await frames();
    // MARK.right (2000 + 80) + the 8px overhang, minus the badge's own width;
    // the frame is only 400 wide, so clamping to it would give 370px.
    expect(badges()[0]?.style.left).toBe('2058px');
    expect(badges()[0]?.style.top).toBe('609px');
  });

  it('keeps the frame adopted while another badge kind still draws in it', async () => {
    const { controller, frame, setActive, secondController } = mountScrolled();
    await frames();
    const second = secondController();
    await frames();
    // The grill's Q badges and Check Mode's marks can share one frame: the
    // first kind to leave must not take the layer's containing block with it.
    setActive(false);
    controller.hostUpdated();
    expect(frame.style.position).toBe('relative');
    second.stop();
    expect(frame.style.position).toBe('');
  });

  it('keeps the badge on its mark through a horizontal and a vertical scroll', async () => {
    const { badges, frame, scrollTo, target } = mountScrolled();
    await frames();
    const badge = badges()[0];
    if (badge === undefined) throw new Error('no badge');
    /** Where the badge paints: the frame's content origin, shifted by its scroll. */
    const painted = (): { left: number; top: number } => ({
      left: FRAME.left - frame.scrollLeft + Number.parseFloat(badge.style.left),
      top: FRAME.top - frame.scrollTop + Number.parseFloat(badge.style.top),
    });
    const gap = (): { right: number; middle: number } => ({
      right: painted().left + 30 - (target.getBoundingClientRect().right ?? 0),
      middle: painted().top + 22 / 2 - target.getBoundingClientRect().top,
    });
    expect(gap()).toEqual({ right: 8, middle: 0 });
    scrollTo(400, 200);
    await frames(3);
    // The badge hangs off the mark's corner still, and both moved by the scroll.
    expect(gap()).toEqual({ right: 8, middle: 0 });
    expect(painted()).toEqual({ left: FRAME.left - 400 + 2058, top: FRAME.top - 200 + 609 });
  });
});
