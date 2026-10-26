/**
 * The relative-portal mechanism behind both badge kinds: the grill's Q badges
 * (`./grill-badges`) and Check Mode's per-target marks (`./check-mode-badges`).
 *
 * A badge is a button in a portal layer appended to the nearest box that holds
 * its target's place — the nearest positioned or scrolling ancestor — and
 * positioned in that box's own coordinates. Nothing is laid out against the
 * viewport: a scroll of any column, a canvas pan, a zoom, a pinned header or a
 * maximized panel carries the badge along with its target, because the badge is
 * a child of the box the target moves in
 * ([ADR](../../../dev-docs/adr/20261026_badge-portals.md)).
 *
 * The search runs up the *flattened* tree, so a mark a view slots into a
 * component's own grid finds that component's scroll frame rather than the
 * page's main column: a target inside a horizontally scrolled matrix would
 * otherwise keep an outer `offsetParent` and drift by exactly `scrollLeft`.
 * Where offset coordinates do not describe the target's place in that box — a
 * table row, which has no `offsetParent`, or a box that only becomes the
 * target's containing block by being adopted below — the badge is measured
 * against the same parent instead, so it stays in the target's coordinate space
 * either way, and a frame loop keeps it there while the target moves. It is
 * never handed to `document.body`: a badge outside its parent's space is a
 * badge that drifts.
 */
import type { ReactiveController, ReactiveControllerHost } from 'lit';

import { gutterBottom, layoutBadges, type BadgeGroup } from './badge-layout';

/**
 * The mark a badge belongs to. `index` is the render order of the bindings, and
 * with the feature's own key it identifies one badge across renders.
 */
export type PortalBadgeBinding = {
  readonly index: number;
  readonly target: Element;
};

export type BadgePortalSpec<B extends PortalBadgeBinding> = {
  /** Class of a portal layer, one per positioned parent. */
  readonly portalClass: string;
  /** The badges' own CSS; the layer's own box is the module's. */
  readonly styles: string;
  /** Stable identity of one badge: reused while its target and mark stay the same, so focus survives a render. */
  readonly keyOf: (binding: B) => string;
  /** Builds the button for a binding that has none. */
  readonly create: (binding: B) => HTMLButtonElement;
  /** Brings a reused button up to date with its binding. */
  readonly update: (button: HTMLButtonElement, binding: B) => void;
  /** Whether the badge belongs in the parent's right-hand gutter (the author's own markup) rather than on the target's corner. */
  readonly gutterOf?: (binding: B) => boolean;
};

export type BadgePortalOptions<B extends PortalBadgeBinding> = {
  /** The feature is on: without it no badge is drawn. */
  readonly active: () => boolean;
  /** The marks to badge, in render order. */
  readonly bindings: () => readonly B[];
  readonly spec: BadgePortalSpec<B>;
};

/** `data-dpk-badge-gutter` on a portal's parent: it holds gutter badges, so the shell reserves their column. */
export const BADGE_GUTTER_ATTRIBUTE = 'data-dpk-badge-gutter';

/** Tags that cannot hold an absolutely positioned HTML portal. */
const TABLE_TAGS = new Set(['TABLE', 'THEAD', 'TBODY', 'TFOOT', 'TR', 'COLGROUP']);

const isTableTag = (element: Element): boolean => TABLE_TAGS.has(element.localName.toUpperCase());

/**
 * A `<slot>` is not a box: whatever is put inside one is fallback content, which
 * the browser closes over the moment a node is assigned to it. A portal there is
 * a portal nobody ever sees, so the walk passes through it to the box the
 * component actually laid the mark out in (a column head, a cell, a frame).
 */
const isSlot = (element: Element): boolean => element.localName === 'slot';

/** Whether the box can hold a portal layer at all: a real element that is neither a table part nor a slot. */
const holdsPortal = (element: Element): element is HTMLElement =>
  element instanceof HTMLElement && !isTableTag(element) && !isSlot(element);

/** A target's box in its portal parent's coordinates. */
type Box = { readonly left: number; readonly top: number; readonly width: number; readonly height: number };

type Portal = {
  readonly parent: HTMLElement;
  readonly layer: HTMLElement;
  readonly records: BadgeRecord[];
  /** The parent scrolls its content (`isScrolling`), so the layer's coordinates run over the whole content, not just the visible box. */
  readonly scrolls: boolean;
};

type BadgeRecord = {
  readonly key: string;
  readonly target: Element;
  readonly button: HTMLButtonElement;
  /** The box the badge is drawn in; it can stop being the mark's box (`#reparent`). */
  portal: Portal;
  /** Size in the parent's own (untransformed) units, read once per update: it only changes with the badge's text. */
  width: number;
  height: number;
  gutter: boolean;
  /** The box is measured against the parent every frame rather than read as an offset (`needsMeasuring`). */
  measured: boolean;
};

/** Overflow values whose box moves its content independently of its own place: a scroll (or clip) frame. */
const OVERFLOW_BOX = /(auto|scroll|hidden|overlay)/;

/**
 * How many frames a badge that was just drawn is re-homed on (`#requestSettle`).
 * A component around a view's marks draws its own shadow root — and so the slots
 * and the scroll frame the marks move in — a microtask or two after the view
 * hands them over; the pass exists to land on that layout, not to watch it, so
 * it stops as soon as nothing moves.
 */
const SETTLE_FRAMES = 3;

/**
 * The next box up the *flattened* tree: the slot a slotted element was
 * assigned to, then the host of the shadow root an element lives in. The
 * light-DOM `parentElement` chain stops at a shadow boundary, so it never sees
 * the scroll frame a component renders around the content it is given — the
 * box a mark handed to `<dpk-matrix>` actually moves in.
 */
const flattenedParentOf = (element: Element): Element | null => {
  const slot = element.assignedSlot ?? null;
  if (slot !== null) return slot;
  const parent = element.parentElement ?? null;
  if (parent !== null) return parent;
  const node = element.parentNode;
  return node instanceof ShadowRoot ? node.host : null;
};

/** Whether the box lays its absolutely positioned descendants out in its own coordinates. */
const isPositioned = (element: Element): boolean => getComputedStyle(element).position !== 'static';

/** Whether the box scrolls its content inside itself, so its content and its own place move apart. */
const isScrolling = (element: Element): boolean => {
  // The shorthand as well as the two axes: not every environment expands
  // `overflow` into `overflow-x`/`overflow-y` when it computes.`
  const style = getComputedStyle(element);
  return OVERFLOW_BOX.test(style.overflow) || OVERFLOW_BOX.test(style.overflowX) || OVERFLOW_BOX.test(style.overflowY);
};

/**
 * The box a badge can be positioned in: the nearest ancestor that is positioned
 * — a board node's world, a view's main column — or that scrolls, since a badge
 * inside the scroll frame moves with the target under the scroll where a badge
 * in an outer box would stay put. The walk crosses slot boundaries
 * (`flattenedParentOf`) and passes through the boxes that cannot hold a layer: a
 * table part, and the `<slot>` a view's mark was handed to the component around
 * it through (`holdsPortal`). A table row therefore lands on the box above its
 * table, exactly where its own content does, and a mark slotted into a matrix
 * head or cell lands in that head's or cell's own scroll frame rather than in the
 * slot that distributes it.
 */
export const portalParentOf = (target: Element): HTMLElement | null => {
  for (let node = flattenedParentOf(target); node !== null; node = flattenedParentOf(node)) {
    if (!holdsPortal(node)) continue;
    if (isPositioned(node) || isScrolling(node)) return node;
  }
  return nearestBoxOf(target);
};

/** The last resort: the mark's own nearest ancestor that is a box a portal can live in. */
const nearestBoxOf = (target: Element): HTMLElement | null => {
  for (let node = flattenedParentOf(target); node !== null; node = flattenedParentOf(node)) {
    if (holdsPortal(node)) return node;
  }
  return null;
};

/**
 * The containing block of a portal, per parent: how many portals are in it, and
 * the inline `position` to put back when the last one leaves (`null` when the
 * box was already positioned and nothing has to be restored). A box that is
 * merely scrolling is not the containing block of an absolute child, so its
 * layer would be laid out against an outer box and would not move with the
 * scroll; adopting it with `position: relative` — inert, since no offset is
 * given — puts the layer in that box's own coordinates. References are counted
 * across both badge kinds: they can share one parent.
 */
type ContainingBlock = { count: number; readonly previous: string | null };

const containingBlocks = new Map<HTMLElement, ContainingBlock>();

const adoptContainingBlock = (parent: HTMLElement): void => {
  const existing = containingBlocks.get(parent);
  if (existing !== undefined) {
    existing.count += 1;
    return;
  }
  const previous = isPositioned(parent) ? null : parent.style.position;
  if (previous !== null) parent.style.position = 'relative';
  containingBlocks.set(parent, { count: 1, previous });
};

const releaseContainingBlock = (parent: HTMLElement): void => {
  const existing = containingBlocks.get(parent);
  if (existing === undefined) return;
  existing.count -= 1;
  if (existing.count > 0) return;
  if (existing.previous !== null) parent.style.position = existing.previous;
  containingBlocks.delete(parent);
};

/**
 * Whether the badge must be measured every frame: its offset in the parent is
 * then not its place in it, because the parent is not the target's
 * `offsetParent` (a table row has none, a slotted mark's own box is skipped).
 */
const needsMeasuring = (target: Element, parent: HTMLElement): boolean =>
  !(target instanceof HTMLElement) || target.offsetParent !== parent;

/**
 * Where one badge sits in its parent. `offsetParent` boxes are read as offsets —
 * exact through a pan and a zoom, and free of layout reads. Anything else is
 * measured against the parent: it costs a rect, and follows a scroll of any box
 * between the two, which is what a row of a table needs. Both describe the
 * parent's *content* box (the origin its own scroll runs from), which is where
 * the layer is laid out; `clientLeft`/`clientTop` are its border, which the
 * padding-box origin sits inside.
 */
const boxOf = (target: Element, parent: HTMLElement, measured: boolean): Box | null => {
  if (target.getClientRects().length === 0) return null;
  if (!measured && target instanceof HTMLElement) {
    return { left: target.offsetLeft, top: target.offsetTop, width: target.offsetWidth, height: target.offsetHeight };
  }
  // A transformed parent (a zoomed canvas) reports a scaled rect: undo it to stay in its own units.
  const rect = target.getBoundingClientRect();
  const parentRect = parent.getBoundingClientRect();
  const scale = parent.offsetWidth > 0 && parentRect.width > 0 ? parentRect.width / parent.offsetWidth : 1;
  return {
    left: (rect.left - parentRect.left) / scale - parent.clientLeft + parent.scrollLeft,
    top: (rect.top - parentRect.top) / scale - parent.clientTop + parent.scrollTop,
    width: rect.width / scale,
    height: rect.height / scale,
  };
};

/**
 * The layer's own CSS. `z-index` sits above the content it badges (cards are
 * not positioned) and below the shell's and a board's own pinned heads
 * (`z-index` 2 and 3), so a badge whose target scrolls under a pinned header is
 * covered by that header instead of floating over it.
 */
const LAYER_CSS = (portalClass: string): string => `
  .${portalClass} {
    position: absolute;
    inset: 0;
    z-index: 1;
    pointer-events: none;
  }
`;

/**
 * Draws one badge per binding, in a portal inside the binding's own parent: the
 * same mechanism for the grill's Q badges and Check Mode's marks, so a badge is
 * on its target through a scroll, a pan, a zoom and a maximized panel without
 * either feature knowing about a viewport layer.
 */
export class BadgePortalController<B extends PortalBadgeBinding> implements ReactiveController {
  readonly #options: BadgePortalOptions<B>;
  readonly #records = new Map<string, BadgeRecord>();
  readonly #portals = new Map<HTMLElement, Portal>();
  #frame: number | null = null;
  /** Frames left in the settle pass, and the one it is waiting on (`#requestSettle`). */
  #settle = 0;
  #settleFrame: number | null = null;
  /** Whether this pass created or re-homed a badge, so the layout it landed in may still be on its way. */
  #drew = false;

  constructor(host: ReactiveControllerHost & HTMLElement, options: BadgePortalOptions<B>) {
    this.#options = options;
    host.addController(this);
  }

  hostDisconnected(): void {
    this.#stopLoop();
    this.#stopSettle();
    this.#clear();
  }

  hostUpdated(): void {
    if (!this.#options.active()) {
      this.#stopLoop();
      this.#stopSettle();
      this.#clear();
      return;
    }
    this.#sync();
    this.#place();
    this.#followTargets();
  }

  /** Re-reads the marks now, for a feature that saw them change without its host rendering. */
  refresh(): void {
    if (!this.#options.active()) {
      this.#stopLoop();
      this.#stopSettle();
      this.#clear();
      return;
    }
    this.#sync();
    this.#place();
    this.#followTargets();
  }

  /** One badge per binding, reused by key so a re-render keeps the button (and its focus) as it was. */
  #sync(): void {
    const { spec } = this.#options;
    this.#drew = false;
    const seen = new Set<string>();
    for (const binding of this.#options.bindings()) {
      const key = spec.keyOf(binding);
      seen.add(key);
      const existing = this.#records.get(key);
      if (existing !== undefined && existing.target === binding.target) {
        spec.update(existing.button, binding);
        existing.width = existing.button.offsetWidth;
        existing.height = existing.button.offsetHeight;
        existing.gutter = spec.gutterOf?.(binding) ?? false;
        this.#reparent(existing);
        continue;
      }
      if (existing !== undefined) this.#discard(existing);
      this.#create(binding, key);
    }
    for (const [key, record] of this.#records) {
      if (!seen.has(key)) this.#discard(record);
    }
    // A parent that holds gutter badges says so, so the shell reserves their
    // column: a claim about its badges, not about whether one is in view now.
    for (const portal of this.#portals.values()) {
      portal.parent.toggleAttribute(
        BADGE_GUTTER_ATTRIBUTE,
        portal.records.some((record) => record.gutter),
      );
    }
    if (this.#drew) {
      this.#drew = false;
      this.#settle = SETTLE_FRAMES;
      this.#requestSettle();
    }
  }

  #create(binding: B, key: string): void {
    // A mark a view has rendered but not attached yet has no box to be placed
    // in: everything above it computes as a plain static box, and the badge
    // would be laid out in one that no longer holds it once the page is
    // attached. The next render, which is what attaching causes, draws it.
    if (!binding.target.isConnected) return;
    const parent = portalParentOf(binding.target);
    if (parent === null) return;
    // The portal first: adopting the box (`#portal`) is what makes it the
    // target's containing block, and so what `needsMeasuring` has to read.
    const portal = this.#portal(parent);
    const button = this.#options.spec.create(binding);
    this.#options.spec.update(button, binding);
    portal.layer.append(button);
    const record: BadgeRecord = {
      key,
      target: binding.target,
      button,
      portal,
      width: button.offsetWidth,
      height: button.offsetHeight,
      gutter: this.#options.spec.gutterOf?.(binding) ?? false,
      measured: needsMeasuring(binding.target, parent),
    };
    portal.records.push(record);
    this.#records.set(key, record);
    this.#drew = true;
  }

  /**
   * Moves a badge whose box is no longer the one its mark moves in. A mark can
   * be laid out before the component around it renders (a view slots its cards
   * into a matrix that has not drawn its scroll frame yet), and the box it
   * landed in then is one the scroll passes under. An offset badge is in its
   * own `offsetParent`, so that read alone answers it; a measured one always
   * sits in some other box, and the box is searched for again.
   */
  #reparent(record: BadgeRecord): void {
    const target = record.target;
    if (!record.measured && target instanceof HTMLElement && target.offsetParent === record.portal.parent) return;
    const parent = portalParentOf(target);
    if (parent === null || parent === record.portal.parent) return;
    const from = record.portal;
    record.button.remove();
    const index = from.records.indexOf(record);
    if (index >= 0) from.records.splice(index, 1);
    if (from.records.length === 0) this.#discardPortal(from);
    const portal = this.#portal(parent);
    portal.layer.append(record.button);
    record.portal = portal;
    record.measured = needsMeasuring(target, parent);
    portal.records.push(record);
    this.#drew = true;
  }

  /** The layer of a parent, made on first use with its own copy of the CSS: its box may be another shadow root. */
  #portal(parent: HTMLElement): Portal {
    const existing = this.#portals.get(parent);
    if (existing !== undefined) return existing;
    adoptContainingBlock(parent);
    const layer = document.createElement('div');
    layer.className = this.#options.spec.portalClass;
    const style = document.createElement('style');
    style.textContent = `${LAYER_CSS(this.#options.spec.portalClass)}${this.#options.spec.styles}`;
    layer.append(style);
    parent.append(layer);
    const portal: Portal = { parent, layer, records: [], scrolls: isScrolling(parent) };
    this.#portals.set(parent, portal);
    return portal;
  }

  #discard(record: BadgeRecord): void {
    record.button.remove();
    this.#records.delete(record.key);
    const { portal } = record;
    const index = portal.records.indexOf(record);
    if (index >= 0) portal.records.splice(index, 1);
    if (portal.records.length > 0) return;
    this.#discardPortal(portal);
  }

  #discardPortal(portal: Portal): void {
    portal.layer.remove();
    portal.parent.removeAttribute(BADGE_GUTTER_ATTRIBUTE);
    portal.parent.style.minHeight = '';
    releaseContainingBlock(portal.parent);
    this.#portals.delete(portal.parent);
  }

  #clear(): void {
    this.#stopSettle();
    for (const portal of this.#portals.values()) this.#discardPortal(portal);
    // `#discardPortal` already empties the map as it goes.
    this.#portals.clear();
    this.#records.clear();
  }

  /** Places every badge in its parent's coordinates, corner or gutter, one group per target. */
  #place(): void {
    for (const portal of this.#portals.values()) this.#placePortal(portal);
  }

  #placePortal(portal: Portal): void {
    const byTarget = new Map<Element, BadgeRecord[]>();
    for (const record of portal.records) {
      const list = byTarget.get(record.target);
      if (list === undefined) byTarget.set(record.target, [record]);
      else list.push(record);
    }
    const groups: BadgeGroup[] = [];
    const grouped: BadgeRecord[][] = [];
    for (const [target, records] of byTarget) {
      const box = boxOf(target, portal.parent, records[0]?.measured ?? false);
      for (const record of records) record.button.hidden = box === null;
      if (box === null) continue;
      grouped.push(records);
      groups.push({
        target: { left: box.left, top: box.top, right: box.left + box.width, bottom: box.top + box.height },
        widths: records.map((record) => record.width),
        gutter: records.some((record) => record.gutter),
      });
    }
    // A scrolling parent's own box is only the window onto its content: badge
    // coordinates run over the whole content it scrolls, so a badge on a card
    // far down or far right of a matrix lands on it instead of being clamped
    // to the visible corner. Everything else is its own box.
    const bounds = {
      width: portal.scrolls ? portal.parent.scrollWidth : portal.parent.clientWidth,
      height: portal.scrolls ? portal.parent.scrollHeight : portal.parent.clientHeight,
      badgeHeight: Math.max(0, ...portal.records.map((record) => record.height)),
    };
    // The gutter's badges may run past the bottom of a short parent: it grows to
    // its last badge rather than piling them up on its last line. A scroll frame
    // is never grown: it is already as tall as the content it scrolls.
    const bottom = gutterBottom(groups, bounds);
    const minHeight = bottom > 0 && !portal.scrolls ? `${Math.ceil(bottom)}px` : '';
    if (portal.parent.style.minHeight !== minHeight) portal.parent.style.minHeight = minHeight;
    const placed = layoutBadges(groups, { ...bounds, height: Math.max(bounds.height, bottom) });
    grouped.forEach((records, group) => {
      records.forEach((record, badge) => {
        const point = placed[group]?.[badge];
        if (point === undefined) return;
        const left = `${point.x}px`;
        const top = `${point.y}px`;
        if (record.button.style.left !== left) record.button.style.left = left;
        if (record.button.style.top !== top) record.button.style.top = top;
      });
    });
  }

  /**
   * Keeps measured badges on their targets. An offset badge needs no loop: it is
   * a child of the same box as its target, so the layout moves both. One
   * measured badge anywhere means the frame loop runs, for every portal.
   */
  #followTargets(): void {
    const measured = [...this.#portals.values()].some((portal) => portal.records.some((record) => record.measured));
    if (!measured) {
      this.#stopLoop();
      return;
    }
    if (this.#frame !== null) return;
    this.#frame = requestAnimationFrame(this.#tick);
  }

  #stopLoop(): void {
    if (this.#frame === null) return;
    cancelAnimationFrame(this.#frame);
    this.#frame = null;
  }

  #tick = (): void => {
    this.#frame = null;
    if (!this.#options.active()) return;
    this.#place();
    this.#frame = requestAnimationFrame(this.#tick);
  };

  /**
   * Re-homes the badges once the layout they were first placed in has settled.
   *
   * A view draws its marks in its own render and hands them to the component
   * around them through slots in the same pass, but that component renders its
   * own shadow root a microtask later (a `<dpk-matrix>` draws the scroll frame
   * the cards move in). A badge created before that frame exists resolves to the
   * box above the component — a view's main column — where the scroll passes
   * under it: a Q badge or a Check Mode mark left there sits still while its card
   * slides away horizontally. One more render used to fix it, which is not
   * something a feature can count on, so the pass runs on its own for a few
   * frames and then stops.
   */
  #requestSettle(): void {
    if (this.#settleFrame !== null) return;
    this.#settleFrame = requestAnimationFrame(this.#settleTick);
  }

  #settleTick = (): void => {
    this.#settleFrame = null;
    if (!this.#options.active() || this.#settle <= 0) return;
    this.#settle -= 1;
    for (const record of this.#records.values()) this.#reparent(record);
    this.#place();
    this.#followTargets();
    // A badge that had to move may have moved into a box whose own frame is
    // still being drawn; one that did not is where it belongs already.
    if (this.#drew) this.#settle = SETTLE_FRAMES;
    this.#drew = false;
    if (this.#settle > 0) this.#requestSettle();
  };

  #stopSettle(): void {
    this.#settle = 0;
    this.#drew = false;
    if (this.#settleFrame === null) return;
    cancelAnimationFrame(this.#settleFrame);
    this.#settleFrame = null;
  }
}
