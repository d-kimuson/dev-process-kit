/**
 * The effects behind the floating menu: measuring it, the pointer drag on its
 * grip, the keyboard on that grip, and the reader's remembered dock.
 *
 * Everything about where it may go is the pure `floating-menu.ts`; this module
 * only reads the screen, wires the events and writes the one preference. The
 * dock belongs to the reader, not to the page: it is never part of the draft,
 * and it outlives the page in LocalStorage unless the page keeps its state in
 * memory or turns storage off.
 */
import type { ReactiveController, ReactiveControllerHost } from 'lit';

import { defaultJsonStore, memoryJsonStore, type JsonStore } from '../../lib/dom/json-store';
import {
  clampMenuDock,
  dockedMenuAt,
  dockedMenuBox,
  dockedMenuInsets,
  draggedMenuBox,
  droppedMenuDock,
  FLOATING_MENU,
  keyedMenuDock,
  measuredMenu,
  menuPlacedAt,
  parseMenuDock,
  type MenuArea,
  type MenuBox,
  type MenuDock,
  type MenuDrag,
  type MenuPlacement,
  type MeasuredRect,
  type MenuSize,
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
  /** The part of the screen the menu may occupy: the viewport less the header row. */
  readonly area: () => MenuArea;
  /** Read on connect: `null` keeps the dock to this page load. */
  readonly persistKey: () => string | null;
};

export class FloatingMenuController implements ReactiveController {
  readonly #host: ReactiveControllerHost;
  readonly #options: FloatingMenuOptions;
  #store: JsonStore<MenuDock> | null = null;
  #key = '';
  #dock: MenuDock | null = null;
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
      this.#store = key === null ? memoryJsonStore(parseMenuDock) : defaultJsonStore(parseMenuDock);
      this.#key = storageKey(key ?? '');
      this.#dock = this.#store.read(this.#key) ?? FLOATING_MENU.default;
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
   * size measured before it: a dock it has just moved to therefore needs one
   * more render, and a window resize needs one to re-clamp it. Both are the
   * same correction, asked for only while the menu is drawn somewhere else than
   * this state would draw it — and asked for once even before the menu can be
   * measured at all, since a page whose layout settles after its first render
   * (a board above all) would otherwise never ask for the render that places it.
   */
  hostUpdated(): void {
    const surface = this.#options.surface();
    this.#observe(surface);
    const area = this.#options.area();
    const rect = this.#rect();
    const box = this.#boxOf(this.#docked(rect, area), rect, area);
    if (rect !== null && box !== null && menuPlacedAt(rect, box)) {
      this.#correction = 'none';
      return;
    }
    const asked: Correction = rect === null ? 'unmeasurable' : 'misplaced';
    if (this.#correction === asked) return;
    this.#correction = asked;
    // Asked for once this update has finished: an update requested from
    // `hostUpdated` is one scheduled inside the update that is completing, which
    // Lit reports as an inefficient change-in-update. The microtask still runs
    // before the browser paints the corrected position.
    queueMicrotask(() => this.#host.requestUpdate());
  }

  /** Where to draw it: its measured box once it has one, else the insets that place it at its dock. */
  get placement(): MenuPlacement {
    const area = this.#options.area();
    const rect = this.#rect();
    const dock = this.#docked(rect, area);
    return { dock, box: this.#boxOf(dock, rect, area), insets: dockedMenuInsets(dock, area) };
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
      // Carried from where it is drawn, which is its dock until the pointer moves it.
      const area = this.#options.area();
      const size = this.#size();
      const box = dockedMenuBox(this.#docked(this.#rect(), area), size, area);
      this.#drag = {
        kind: 'dragging',
        pointerId: event.pointerId,
        drag: { startX: event.clientX, startY: event.clientY, box },
        size,
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
    // The browser took the capture back without a last position: the menu hangs
    // from the edge nearest the box it was last carried to.
    lostpointercapture: (event) => this.#endDrag(event, null),
    keydown: (event) => {
      const area = this.#options.area();
      const next = keyedMenuDock(this.#docked(this.#rect(), area), event, this.#size(), area);
      if (next === null) return;
      event.preventDefault();
      this.#dock = next;
      this.#save();
      this.#host.requestUpdate();
    },
  };

  readonly #onResize = (): void => {
    this.#host.requestUpdate();
  };

  /** The drag is over: the menu hangs from the edge nearest where it was let go. */
  #endDrag(event: PointerEvent, at: { readonly clientX: number; readonly clientY: number } | null): void {
    const drag = this.#drag;
    if (drag.kind !== 'dragging' || drag.pointerId !== event.pointerId) return;
    this.#drag = IDLE;
    const area = this.#options.area();
    this.#dock =
      at === null
        ? dockedMenuAt(drag.box, drag.size, area)
        : droppedMenuDock(drag.drag, at.clientX, at.clientY, drag.size, area);
    this.#save();
    this.#host.requestUpdate();
  }

  /** Written once the gesture is over, not on every pointer move. */
  #save(): void {
    if (this.#dock !== null) this.#store?.write(this.#key, this.#dock);
  }

  #rect(): MeasuredRect | null {
    const surface = this.#options.surface();
    return surface === null ? null : measuredMenu(surface);
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
    if (surface !== null) this.#observer?.observe(surface);
  }

  /** The dock the menu hangs from, held inside the room it has. */
  #docked(rect: MeasuredRect | null, area: MenuArea): MenuDock {
    return clampMenuDock(this.#dock ?? FLOATING_MENU.default, menuSizeOf(rect), area);
  }

  /** Where the menu is drawn: under the pointer while it is carried, else against its edge. */
  #boxOf(dock: MenuDock, rect: MeasuredRect | null, area: MenuArea): MenuBox | null {
    const drag = this.#drag;
    if (drag.kind === 'dragging') return drag.box;
    return rect === null ? null : dockedMenuBox(dock, rect, area);
  }

  /** Its size for the dock's own arithmetic; before it is measurable, a dock still moves by the keys. */
  #size(): MenuSize {
    return menuSizeOf(this.#rect());
  }
}
