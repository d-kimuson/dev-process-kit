import type { ReactiveController, ReactiveControllerHost } from 'lit';

/**
 * Publishes the shell header's real rendered height as `--dpk-header-height`
 * on the host element.
 *
 * A maximized `dpk-dialog-panel` is lifted into the top layer and would
 * otherwise cover the header (and its undo/redo/history/theme actions) along
 * with the rest of the viewport. The var inherits through the flattened tree
 * — across slot assignment and shadow boundaries alike — into any panel
 * nested inside this host's light DOM, so the panel can stay clear of the
 * header without knowing anything about it.
 *
 * Kept live with a `ResizeObserver`, since the header's height can change
 * from a width-driven wrap (e.g. at narrow viewports) with no other reason
 * for the host to re-render.
 */
export class HeaderHeightController implements ReactiveController {
  readonly #host: ReactiveControllerHost & HTMLElement;
  readonly #header: () => HTMLElement | null;
  #observer: ResizeObserver | null = null;
  #observed: HTMLElement | null = null;

  constructor(host: ReactiveControllerHost & HTMLElement, header: () => HTMLElement | null) {
    this.#host = host;
    this.#header = header;
    host.addController(this);
  }

  hostConnected(): void {
    this.#observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => this.#sync());
  }

  /** Re-checked after every render: the header element a board renders for may come and go. */
  hostUpdated(): void {
    const header = this.#header();
    if (header === this.#observed) {
      if (header) this.#sync();
      return;
    }
    if (this.#observed) this.#observer?.unobserve(this.#observed);
    this.#observed = header;
    if (header) {
      this.#observer?.observe(header);
      this.#sync();
    } else {
      this.#host.style.removeProperty('--dpk-header-height');
    }
  }

  hostDisconnected(): void {
    this.#observer?.disconnect();
    this.#observer = null;
    this.#observed = null;
  }

  #sync(): void {
    if (!this.#observed) return;
    this.#host.style.setProperty('--dpk-header-height', `${this.#observed.getBoundingClientRect().height}px`);
  }
}
