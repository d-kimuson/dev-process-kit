/**
 * The effects behind the floating menu: measuring it and the header's slot, the
 * pointer drag on its grip, the keyboard on that grip, and the reader's
 * remembered spot.
 *
 * Everything about where it may go is the pure `floating-menu.ts`; this module
 * only reads the screen, wires the events and writes the one preference. The
 * spot belongs to the reader, not to the page: it is never part of the draft,
 * and it outlives the page in LocalStorage unless the page keeps its state in
 * memory or turns storage off.
 */
import type { ReactiveController, ReactiveControllerHost } from 'lit';

import { defaultJsonStore, memoryJsonStore, type JsonStore } from '../../lib/dom/json-store';
import {
  clampMenuDock,
  draggedMenuBox,
  droppedMenuSpot,
  FLOATING_MENU,
  keyedMenuSpot,
  measuredMenu,
  menuGhostOf,
  menuPlacedAt,
  menuSizeAs,
  menuSlotState,
  parseMenuSpot,
  restingMenuBox,
  restingMenuInsets,
  spotOrientation,
  type MenuArea,
  type MenuBox,
  type MenuDrag,
  type MenuOrientation,
  type MenuPlacement,
  type MeasuredRect,
  type MenuSize,
  type MenuSpot,
} from './floating-menu';

/** One key per content, the way the shell keeps the reader's other view state. */
const storageKey = (key: string): string => `dev-process-kit:menu:${key}`;

/** The size of a menu that is not measurable yet: it still docks, by the edge alone. */
const menuSizeOf = (rect: MeasuredRect | null): MenuSize =>
  rect === null ? { width: 0, height: 0 } : { width: rect.width, height: rect.height };

type DragState =
  | { readonly kind: 'idle' }
  | {
      readonly kind: 'dragging';
      readonly pointerId: number;
      readonly drag: MenuDrag;
      /** The menu's size as the drag started, which is the orientation it is carried in. */
      readonly size: MenuSize;
      readonly orientation: MenuOrientation;
      readonly box: MenuBox;
    };

const IDLE: DragState = { kind: 'idle' };

/**
 * The one corrective render the controller has asked for, kept so a surface
 * whose geometry never settles cannot spin: it is forgotten as soon as the
 * menu is drawn where the state would draw it, and a surface that is not
 * measurable yet may still ask once more once it is.
 */
type Correction = 'none' | 'unmeasurable' | 'misplaced';

/** What one read of the screen gives: the menu's box, the header's slot, and the room the menu has. */
type Screen = {
  readonly rect: MeasuredRect | null;
  readonly slot: MeasuredRect | null;
  readonly area: MenuArea;
};

export type FloatingMenuGripHandlers = {
  readonly pointerdown: (event: PointerEvent) => void;
  readonly pointermove: (event: PointerEvent) => void;
  readonly pointerup: (event: PointerEvent) => void;
  readonly pointercancel: (event: PointerEvent) => void;
  /** The browser can take the capture back (window focus lost, gesture cancelled). */
  readonly lostpointercapture: (event: PointerEvent) => void;
  readonly keydown: (event: KeyboardEvent) => void;
};

export type FloatingMenuOptions = {
  /** The menu's own element: measured for its size and its box. */
  readonly surface: () => HTMLElement | null;
  /**
   * The header's slot the menu sits on: measured for where it is. One that is
   * not laid out (a narrow screen hides it) leaves a header spot at its fallback edge.
   */
  readonly header: () => HTMLElement | null;
  /** The part of the screen the menu may occupy: the viewport less the header row. */
  readonly area: () => MenuArea;
  /** Read on connect: `null` keeps the spot to this page load. */
  readonly persistKey: () => string | null;
};

export class FloatingMenuController implements ReactiveController {
  readonly #host: ReactiveControllerHost;
  readonly #options: FloatingMenuOptions;
  #store: JsonStore<MenuSpot> | null = null;
  #key = '';
  #spot: MenuSpot | null = null;
  #drag: DragState = IDLE;
  /** The last correction asked for, so a geometry that never settles cannot spin. */
  #correction: Correction = 'none';
  readonly #observer: ResizeObserver | null =
    typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => this.#host.requestUpdate());
  #observed: HTMLElement | null = null;

  constructor(host: ReactiveControllerHost, options: FloatingMenuOptions) {
    this.#host = host;
    this.#options = options;
    host.addController(this);
  }

  hostConnected(): void {
    if (this.#store === null) {
      const key = this.#options.persistKey();
      this.#store = key === null ? memoryJsonStore(parseMenuSpot) : defaultJsonStore(parseMenuSpot);
      this.#key = storageKey(key ?? '');
      this.#spot = this.#store.read(this.#key) ?? FLOATING_MENU.default;
    }
    // A narrower window may leave the menu outside the room it has: it is re-clamped.
    if (typeof window !== 'undefined') window.addEventListener('resize', this.#onResize);
  }

  hostDisconnected(): void {
    this.#drag = IDLE;
    this.#observer?.disconnect();
    this.#observed = null;
    if (typeof window !== 'undefined') window.removeEventListener('resize', this.#onResize);
  }

  /**
   * The menu's own size follows its orientation, and a render is placed by the
   * size measured before it: a spot it has just moved to therefore needs one
   * more render, and a window resize needs one to re-clamp it. Both are the
   * same correction, asked for only while the menu is drawn somewhere else than
   * this state would draw it — and asked for once even before the menu can be
   * measured at all, since a page whose layout settles after its first render
   * (a board above all) would otherwise never ask for the render that places it.
   */
  hostUpdated(): void {
    this.#observe(this.#options.surface());
    const screen = this.#screen();
    const box = this.#boxOf(this.#resolved(screen), screen);
    if (screen.rect !== null && box !== null && menuPlacedAt(screen.rect, box)) {
      this.#correction = 'none';
      return;
    }
    const asked: Correction = screen.rect === null ? 'unmeasurable' : 'misplaced';
    if (this.#correction === asked) return;
    this.#correction = asked;
    // Asked for once this update has finished: an update requested from
    // `hostUpdated` is one scheduled inside the update that is completing, which
    // Lit reports as an inefficient change-in-update. The microtask still runs
    // before the browser paints the corrected position.
    queueMicrotask(() => this.#host.requestUpdate());
  }

  /**
   * Where to draw it: its measured box once it has one, else the insets that
   * place it at its spot; while it is carried, also where letting go would put it.
   */
  get placement(): MenuPlacement {
    const screen = this.#screen();
    const spot = this.#resolved(screen);
    const drag = this.#drag;
    const drop =
      drag.kind === 'dragging' ? droppedMenuSpot(drag.box, drag.size, screen.area, screen.slot !== null) : null;
    const ghost =
      drag.kind === 'dragging' && drop?.kind === 'edge'
        ? menuGhostOf(drop.dock, drag.size, drag.orientation, screen.area)
        : null;
    // The slot holds open the room of the menu lying as one row, whichever way it lies now.
    const width = screen.rect === null ? null : menuSizeAs('horizontal', screen.rect, spotOrientation(spot)).width;
    return {
      spot,
      box: this.#boxOf(spot, screen),
      insets: restingMenuInsets(spot, screen.slot, screen.area),
      drop,
      ghost,
      slot: { state: menuSlotState(spot, drop), width },
    };
  }

  get dragging(): boolean {
    return this.#drag.kind === 'dragging';
  }

  /** Bound to the grip in the menu's own markup. */
  readonly grip: FloatingMenuGripHandlers = {
    pointerdown: (event) => {
      if (event.button !== 0) return;
      // Takes focus and the page's own click behaviour out of a drag of the menu.
      event.preventDefault();
      if (event.currentTarget instanceof Element) event.currentTarget.setPointerCapture(event.pointerId);
      // Carried from where it is drawn, which is its spot until the pointer moves it.
      const screen = this.#screen();
      const spot = this.#resolved(screen);
      const size = menuSizeOf(screen.rect);
      const box =
        screen.rect === null
          ? restingMenuBox(spot, screen.slot, size, screen.area)
          : { left: screen.rect.left, top: screen.rect.top };
      this.#drag = {
        kind: 'dragging',
        pointerId: event.pointerId,
        drag: { startX: event.clientX, startY: event.clientY, box },
        size,
        orientation: spotOrientation(spot),
        box,
      };
      this.#host.requestUpdate();
    },
    pointermove: (event) => {
      const drag = this.#drag;
      if (drag.kind !== 'dragging' || drag.pointerId !== event.pointerId) return;
      this.#drag = { ...drag, box: draggedMenuBox(drag.drag, event.clientX, event.clientY) };
      this.#host.requestUpdate();
    },
    pointerup: (event) => this.#endDrag(event, event),
    pointercancel: (event) => this.#endDrag(event, event),
    // The browser took the capture back without a last position: the menu lands
    // where the box it was last carried to would.
    lostpointercapture: (event) => this.#endDrag(event, null),
    keydown: (event) => {
      const screen = this.#screen();
      const next = keyedMenuSpot(
        this.#resolved(screen),
        event,
        menuSizeOf(screen.rect),
        screen.area,
        screen.slot !== null,
      );
      if (next === null) return;
      event.preventDefault();
      this.#spot = next;
      this.#save();
      this.#host.requestUpdate();
    },
  };

  readonly #onResize = (): void => {
    this.#host.requestUpdate();
  };

  /** The drag is over: the menu snaps into the header, or to the edge nearest where it was let go. */
  #endDrag(event: PointerEvent, at: { readonly clientX: number; readonly clientY: number } | null): void {
    const drag = this.#drag;
    if (drag.kind !== 'dragging' || drag.pointerId !== event.pointerId) return;
    this.#drag = IDLE;
    const screen = this.#screen();
    const box = at === null ? drag.box : draggedMenuBox(drag.drag, at.clientX, at.clientY);
    this.#spot = droppedMenuSpot(box, drag.size, screen.area, screen.slot !== null);
    this.#save();
    this.#host.requestUpdate();
  }

  /** Written once the gesture is over, not on every pointer move. */
  #save(): void {
    if (this.#spot !== null) this.#store?.write(this.#key, this.#spot);
  }

  #screen(): Screen {
    const surface = this.#options.surface();
    const header = this.#options.header();
    return {
      rect: surface === null ? null : measuredMenu(surface),
      slot: header === null ? null : measuredMenu(header),
      area: this.#options.area(),
    };
  }

  /**
   * Watches the menu's own size. Its first one arrives with the page's layout,
   * after the render that drew it — a board's chrome is drawn inside a layout
   * element whose own first render comes later — so the observer is what asks
   * for the render that places the menu by a measurement at all.
   */
  #observe(surface: HTMLElement | null): void {
    if (surface === this.#observed) return;
    if (this.#observed !== null) this.#observer?.unobserve(this.#observed);
    this.#observed = surface;
    // Its border box: the pill it becomes while carried differs only in padding.
    if (surface !== null) this.#observer?.observe(surface, { box: 'border-box' });
  }

  /**
   * The spot the menu rests at on this screen: a header spot with no slot to
   * sit on is drawn at its fallback edge, and an edge's dock is held inside the
   * room it has. The reader's choice itself is left as it was.
   */
  #resolved({ rect, slot, area }: Screen): MenuSpot {
    const spot = this.#spot ?? FLOATING_MENU.default;
    if (spot.kind === 'header' && slot !== null) return spot;
    const dock = spot.kind === 'edge' ? spot.dock : FLOATING_MENU.fallback;
    return { kind: 'edge', dock: clampMenuDock(dock, menuSizeOf(rect), area) };
  }

  /** Where the menu is drawn: under the pointer while it is carried, else at its spot. */
  #boxOf(spot: MenuSpot, { rect, slot, area }: Screen): MenuBox | null {
    const drag = this.#drag;
    if (drag.kind === 'dragging') return drag.box;
    return rect === null ? null : restingMenuBox(spot, slot, rect, area);
  }
}
