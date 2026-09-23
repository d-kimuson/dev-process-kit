import type { ReactiveController, ReactiveControllerHost } from 'lit';

import { openPopover, type PopoverAnchor, type PopoverSize, type PopoverOptions } from '../lib/dom/popover';

/** Owns only DOM resource lifetime; geometry and UI decisions stay outside. */
export class PopoverController implements ReactiveController {
  readonly #host: ReactiveControllerHost;
  readonly #open = new Map<HTMLElement, () => void>();
  constructor(host: ReactiveControllerHost) {
    this.#host = host;
    host.addController(this);
  }
  hostConnected(): void {
    this.#host.requestUpdate();
  }
  hostUpdated(): void {
    for (const [surface, stop] of this.#open) {
      if (surface.isConnected) continue;
      stop();
      this.#open.delete(surface);
    }
  }
  hostDisconnected(): void {
    for (const stop of this.#open.values()) stop();
    this.#open.clear();
  }
  open(surface: HTMLElement, anchor: Element | PopoverAnchor, size: PopoverSize, options?: PopoverOptions): void {
    this.#open.get(surface)?.();
    this.#open.set(surface, openPopover(surface, anchor, size, options));
  }
}
