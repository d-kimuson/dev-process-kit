import type { ReactiveController, ReactiveControllerHost } from 'lit';

/** The attribute the board puts on each hotspot pin, carrying the pin's note id. */
const PIN_ATTRIBUTE = 'data-pin';

/**
 * Measures the hotspot pins the board renders. A pin sizes itself to its name,
 * so only the browser knows how tall it is; the board needs that height to
 * stack the pins of one note and to reserve head room above the band.
 */
export class PinHeightsController implements ReactiveController {
  readonly #host: ReactiveControllerHost & { readonly renderRoot: ParentNode };
  readonly #observed = new Set<Element>();
  #observer: ResizeObserver | undefined;
  #heights: ReadonlyMap<string, number> = new Map();

  constructor(host: ReactiveControllerHost & { readonly renderRoot: ParentNode }) {
    this.#host = host;
    host.addController(this);
  }

  /** Pin note id → rendered height; a pin not measured yet is absent. */
  get heights(): ReadonlyMap<string, number> {
    return this.#heights;
  }

  hostConnected(): void {
    if (typeof ResizeObserver === 'undefined') return;
    this.#observer = new ResizeObserver((entries) => this.#onResize(entries));
  }

  hostUpdated(): void {
    const observer = this.#observer;
    if (observer === undefined) return;
    const pins = new Set(this.#host.renderRoot.querySelectorAll(`[${PIN_ATTRIBUTE}]`));
    for (const element of this.#observed) {
      if (pins.has(element)) continue;
      observer.unobserve(element);
      this.#observed.delete(element);
    }
    for (const element of pins) {
      if (this.#observed.has(element)) continue;
      observer.observe(element);
      this.#observed.add(element);
    }
    // A removed pin needs no new layout: its stale height just goes away.
    const ids = new Set([...pins].map((element) => element.getAttribute(PIN_ATTRIBUTE)));
    if ([...this.#heights.keys()].some((id) => !ids.has(id))) {
      this.#heights = new Map([...this.#heights].filter(([id]) => ids.has(id)));
    }
  }

  hostDisconnected(): void {
    this.#observer?.disconnect();
    this.#observer = undefined;
    this.#observed.clear();
  }

  #onResize(entries: readonly ResizeObserverEntry[]): void {
    const next = new Map(this.#heights);
    for (const entry of entries) {
      const id = entry.target.getAttribute(PIN_ATTRIBUTE);
      // The border box ignores the pin's tilt, which the layout does too.
      const height = entry.borderBoxSize[0]?.blockSize;
      if (id === null || height === undefined || height === 0) continue;
      next.set(id, height);
    }
    if ([...next].every(([id, height]) => this.#heights.get(id) === height)) return;
    this.#heights = next;
    this.#host.requestUpdate();
  }
}
