/**
 * The effects behind the panel's resize grip: the pointer drag and the keys.
 * The heights themselves come from the pure `draggedPanelHeight` /
 * `keyedPanelHeight`. The height is view state: it lasts for the page load.
 */
import type { ReactiveController, ReactiveControllerHost } from 'lit';

import { draggedPanelHeight, keyedPanelHeight } from './model';

type DragState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'dragging'; readonly pointerId: number; readonly startY: number; readonly startHeight: number };

const IDLE: DragState = { kind: 'idle' };

export type PanelGripHandlers = {
  readonly pointerdown: (event: PointerEvent) => void;
  readonly pointermove: (event: PointerEvent) => void;
  readonly pointerup: (event: PointerEvent) => void;
  readonly pointercancel: (event: PointerEvent) => void;
  readonly keydown: (event: KeyboardEvent) => void;
  readonly dblclick: () => void;
};

export class PanelHeightController implements ReactiveController {
  readonly #host: ReactiveControllerHost;
  /** The panel's current rendered height, for a drag or a key to start from. */
  readonly #measure: () => number;
  /** The reader's height, or `null` while the panel's own sizing applies. */
  #height: number | null = null;
  #drag: DragState = IDLE;

  constructor(host: ReactiveControllerHost, measure: () => number) {
    this.#host = host;
    this.#measure = measure;
    host.addController(this);
  }

  hostConnected(): void {}

  get height(): number | null {
    return this.#height;
  }

  get dragging(): boolean {
    return this.#drag.kind === 'dragging';
  }

  readonly handlers: PanelGripHandlers = {
    pointerdown: (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      const grip = event.currentTarget;
      if (grip instanceof Element) grip.setPointerCapture(event.pointerId);
      this.#drag = {
        kind: 'dragging',
        pointerId: event.pointerId,
        startY: event.clientY,
        startHeight: this.#measure(),
      };
      this.#host.requestUpdate();
    },
    pointermove: (event) => {
      const drag = this.#drag;
      if (drag.kind !== 'dragging' || drag.pointerId !== event.pointerId) return;
      this.#set(draggedPanelHeight(drag.startHeight, event.clientY - drag.startY));
    },
    pointerup: (event) => this.#end(event),
    pointercancel: (event) => this.#end(event),
    keydown: (event) => {
      const next = keyedPanelHeight(this.#height ?? this.#measure(), event.key, event.shiftKey);
      if (next === null) return;
      event.preventDefault();
      this.#set(next);
    },
    dblclick: () => this.#set(null),
  };

  #set(height: number | null): void {
    if (height === this.#height) return;
    this.#height = height;
    this.#host.requestUpdate();
  }

  #end(event: PointerEvent): void {
    const drag = this.#drag;
    if (drag.kind !== 'dragging' || drag.pointerId !== event.pointerId) return;
    this.#drag = IDLE;
    this.#host.requestUpdate();
  }
}
