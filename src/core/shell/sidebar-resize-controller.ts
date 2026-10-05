/**
 * The effects behind the sidebar's resizable edge: the pointer drag, the
 * keyboard, and the reader's persisted width. The widths themselves come from
 * the pure `draggedSidebarWidth` / `keyedSidebarWidth`.
 */
import type { ReactiveController, ReactiveControllerHost } from 'lit';

import { defaultJsonStore, memoryJsonStore, type JsonStore } from '../../lib/dom/json-store';
import {
  draggedSidebarWidth,
  keyedSidebarWidth,
  parseSidebarWidth,
  type SidebarDrag,
  type SidebarLayout,
} from '../sidebar-width';

/**
 * One key per template for every page of the origin: the width is the reader's
 * taste, but a navigation list and a right-hand rail call for different widths.
 */
const storageKey = (template: string): string => `dev-process-kit:sidebar-width:${template}`;

type DragState = { readonly kind: 'idle' } | ({ readonly kind: 'dragging'; readonly pointerId: number } & SidebarDrag);

const IDLE: DragState = { kind: 'idle' };

export type SidebarEdgeHandlers = {
  readonly pointerdown: (event: PointerEvent) => void;
  readonly pointermove: (event: PointerEvent) => void;
  readonly pointerup: (event: PointerEvent) => void;
  readonly pointercancel: (event: PointerEvent) => void;
  readonly keydown: (event: KeyboardEvent) => void;
  readonly dblclick: () => void;
};

export type SidebarResizeOptions = {
  /** Read on first connect, like the color scheme's: `storage="off"` / `"memory"` keeps the width to this page load. */
  readonly persist: () => boolean;
  /** The template's name, read on first connect. */
  readonly template: () => string;
  readonly layout: () => SidebarLayout;
};

export class SidebarResizeController implements ReactiveController {
  readonly #host: ReactiveControllerHost;
  readonly #options: SidebarResizeOptions;
  #store: JsonStore<number> | null = null;
  #key = '';
  /** The reader's width, or `null` while the template's default applies. */
  #preference: number | null = null;
  #drag: DragState = IDLE;

  constructor(host: ReactiveControllerHost, options: SidebarResizeOptions) {
    this.#host = host;
    this.#options = options;
    host.addController(this);
  }

  hostConnected(): void {
    if (this.#store !== null) return;
    this.#store = this.#options.persist() ? defaultJsonStore(parseSidebarWidth) : memoryJsonStore(parseSidebarWidth);
    this.#key = storageKey(this.#options.template());
    this.#preference = this.#store.read(this.#key);
  }

  hostDisconnected(): void {
    this.#drag = IDLE;
  }

  get width(): number {
    return this.#preference ?? this.#options.layout().defaultWidth;
  }

  get dragging(): boolean {
    return this.#drag.kind === 'dragging';
  }

  /** Bound to the edge element with `@event`. */
  readonly handlers: SidebarEdgeHandlers = {
    pointerdown: (event) => {
      if (event.button !== 0) return;
      // Keeps the press from starting a text selection across the page.
      event.preventDefault();
      if (event.currentTarget instanceof Element) event.currentTarget.setPointerCapture(event.pointerId);
      this.#drag = {
        kind: 'dragging',
        pointerId: event.pointerId,
        side: this.#options.layout().side,
        startX: event.clientX,
        startWidth: this.width,
      };
      this.#host.requestUpdate();
    },
    pointermove: (event) => {
      const drag = this.#drag;
      if (drag.kind !== 'dragging' || drag.pointerId !== event.pointerId) return;
      this.#show(draggedSidebarWidth(drag, event.clientX));
    },
    pointerup: (event) => this.#endDrag(event),
    pointercancel: (event) => this.#endDrag(event),
    keydown: (event) => {
      const next = keyedSidebarWidth(this.width, this.#options.layout().side, event);
      if (next === null) return;
      event.preventDefault();
      this.#show(next);
      this.#save();
    },
    dblclick: () => {
      this.#show(this.#options.layout().defaultWidth);
      this.#save();
    },
  };

  #endDrag(event: PointerEvent): void {
    const drag = this.#drag;
    if (drag.kind !== 'dragging' || drag.pointerId !== event.pointerId) return;
    this.#drag = IDLE;
    this.#save();
    this.#host.requestUpdate();
  }

  /** Landing on the default keeps no preference, so the template's default applies again. */
  #show(width: number): void {
    const next = width === this.#options.layout().defaultWidth ? null : width;
    if (next === this.#preference) return;
    this.#preference = next;
    this.#host.requestUpdate();
  }

  #save(): void {
    if (this.#preference === null) this.#store?.remove(this.#key);
    else this.#store?.write(this.#key, this.#preference);
  }
}
