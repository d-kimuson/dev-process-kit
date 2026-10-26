/**
 * The effects behind the supplements drawer's top edge: the pointer drag, the
 * keyboard, and the reader's remembered height. The heights themselves come
 * from the pure `draggedSupplementHeight` / `keyedSupplementHeight`.
 *
 * The height is the reader's own view state: it is never written to the draft
 * or handed to the agent. It outlives the page in LocalStorage under its own
 * key, unless the page keeps its state in memory or turns storage off.
 */
import type { ReactiveController, ReactiveControllerHost } from 'lit';

import { defaultJsonStore, memoryJsonStore, type JsonStore } from '../../lib/dom/json-store';
import {
  clampSupplementHeight,
  draggedSupplementHeight,
  keyedSupplementHeight,
  parseSupplementHeight,
  SUPPLEMENT_HEIGHT,
  supplementHeightMax,
  windowViewportHeight,
} from './supplement-height';

/** One key per template, the way the sidebar keeps its fold and width. */
const storageKey = (key: string): string => `dev-process-kit:supplements-height:${key}`;

type DragState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'dragging'; readonly pointerId: number; readonly startY: number; readonly startHeight: number };

const IDLE: DragState = { kind: 'idle' };

export type SupplementEdgeHandlers = {
  readonly pointerdown: (event: PointerEvent) => void;
  readonly pointermove: (event: PointerEvent) => void;
  readonly pointerup: (event: PointerEvent) => void;
  readonly pointercancel: (event: PointerEvent) => void;
  /** The browser can take the capture back (window focus lost, gesture cancelled). */
  readonly lostpointercapture: (event: PointerEvent) => void;
  readonly keydown: (event: KeyboardEvent) => void;
  readonly dblclick: () => void;
};

export type SupplementHeightOptions = {
  /** Read on first connect: `null` keeps the height to this page load. */
  readonly persistKey: () => string | null;
  /** The window the drawer may not grow past; the real one unless a test says otherwise. */
  readonly viewportHeight?: () => number;
};

export class SupplementHeightController implements ReactiveController {
  readonly #host: ReactiveControllerHost;
  readonly #options: SupplementHeightOptions;
  #store: JsonStore<number> | null = null;
  #key = '';
  /** The reader's height, or `null` while the default applies. */
  #preference: number | null = null;
  #drag: DragState = IDLE;

  constructor(host: ReactiveControllerHost, options: SupplementHeightOptions) {
    this.#host = host;
    this.#options = options;
    host.addController(this);
  }

  hostConnected(): void {
    if (this.#store === null) {
      const key = this.#options.persistKey();
      this.#store = key === null ? memoryJsonStore(parseSupplementHeight) : defaultJsonStore(parseSupplementHeight);
      this.#key = storageKey(key ?? '');
      this.#preference = this.#store.read(this.#key);
    }
    // A shorter window lowers the tallest the drawer may be, so it has to be re-clamped.
    if (typeof window !== 'undefined') window.addEventListener('resize', this.#onResize);
  }

  hostDisconnected(): void {
    this.#drag = IDLE;
    if (typeof window !== 'undefined') window.removeEventListener('resize', this.#onResize);
  }

  /** The height to draw with: the reader's, clamped to what the window leaves. */
  get height(): number {
    return clampSupplementHeight(this.#preference ?? SUPPLEMENT_HEIGHT.default, this.#viewportHeight());
  }

  get max(): number {
    return supplementHeightMax(this.#viewportHeight());
  }

  get dragging(): boolean {
    return this.#drag.kind === 'dragging';
  }

  /** Bound to the edge element with `@event`. */
  readonly handlers: SupplementEdgeHandlers = {
    pointerdown: (event) => {
      if (event.button !== 0) return;
      // Keeps the press from starting a text selection across the page.
      event.preventDefault();
      if (event.currentTarget instanceof Element) event.currentTarget.setPointerCapture(event.pointerId);
      this.#drag = {
        kind: 'dragging',
        pointerId: event.pointerId,
        startY: event.clientY,
        startHeight: this.height,
      };
      this.#host.requestUpdate();
    },
    pointermove: (event) => {
      const drag = this.#drag;
      if (drag.kind !== 'dragging' || drag.pointerId !== event.pointerId) return;
      this.#show(draggedSupplementHeight(drag, event.clientY, this.#viewportHeight()));
    },
    pointerup: (event) => this.#endDrag(event),
    pointercancel: (event) => this.#endDrag(event),
    lostpointercapture: (event) => this.#endDrag(event),
    keydown: (event) => {
      const next = keyedSupplementHeight(this.height, event, this.#viewportHeight());
      if (next === null) return;
      event.preventDefault();
      this.#show(next);
      this.#save();
    },
    dblclick: () => {
      this.#show(SUPPLEMENT_HEIGHT.default);
      this.#save();
    },
  };

  readonly #onResize = (): void => {
    this.#host.requestUpdate();
  };

  #endDrag(event: PointerEvent): void {
    const drag = this.#drag;
    if (drag.kind !== 'dragging' || drag.pointerId !== event.pointerId) return;
    this.#drag = IDLE;
    this.#save();
    this.#host.requestUpdate();
  }

  /** Landing on the default keeps no preference, so a double-click really resets it. */
  #show(height: number): void {
    const clamped = clampSupplementHeight(height, this.#viewportHeight());
    const next = clamped === SUPPLEMENT_HEIGHT.default ? null : clamped;
    if (next === this.#preference) return;
    this.#preference = next;
    this.#host.requestUpdate();
  }

  /** Written once the gesture is over, not on every pointer move. */
  #save(): void {
    if (this.#preference === null) this.#store?.remove(this.#key);
    else this.#store?.write(this.#key, this.#preference);
  }

  #viewportHeight(): number {
    return this.#options.viewportHeight?.() ?? windowViewportHeight();
  }
}
