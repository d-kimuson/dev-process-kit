import type { ReactiveController, ReactiveControllerHost } from 'lit';

import { fitPriority } from '../layout/priority';

/**
 * Where the items of a "priority+" row are. The row is a flex box whose width
 * the items (in a box of their own) and the more button share, its gap apart;
 * the items stay laid out while hidden (`visibility: hidden`, out of the flow)
 * so they can still be measured, and so does the more button while unused.
 */
export type PriorityOverflowOptions = {
  readonly row: () => Element | null;
  /** The items, in order. */
  readonly items: (row: Element) => readonly Element[];
  readonly keyOf: (item: Element) => string;
  /** The item that stays shown however little room there is (the current one). */
  readonly kept: (item: Element) => boolean;
  readonly more: (row: Element) => Element | null;
};

const NOTHING_HIDDEN: ReadonlySet<string> = new Set();

/**
 * Measures a row of items after every update and whenever the row resizes,
 * and keeps which of them do not fit (`hidden`, by key) for the host to fold
 * behind a more button. The host re-renders only when that set changes, so
 * folding an item never measures differently and loops.
 */
export class PriorityOverflowController implements ReactiveController {
  readonly #host: ReactiveControllerHost;
  readonly #options: PriorityOverflowOptions;
  #hidden = NOTHING_HIDDEN;
  #minimum = 0;
  #observer: ResizeObserver | null = null;
  #observed: Element | null = null;

  constructor(host: ReactiveControllerHost, options: PriorityOverflowOptions) {
    this.#host = host;
    this.#options = options;
    host.addController(this);
  }

  /** The keys of the items that do not fit. */
  get hidden(): ReadonlySet<string> {
    return this.#hidden;
  }

  /** The least width the row needs: the kept item and the more button. */
  get minimum(): number {
    return this.#minimum;
  }

  hostConnected(): void {
    if (typeof ResizeObserver === 'undefined') return;
    this.#observer = new ResizeObserver(() => this.#measure());
  }

  hostUpdated(): void {
    const row = this.#options.row();
    if (row !== this.#observed) {
      if (this.#observed) this.#observer?.unobserve(this.#observed);
      if (row) this.#observer?.observe(row);
      this.#observed = row;
    }
    this.#measure();
  }

  hostDisconnected(): void {
    this.#observer?.disconnect();
    this.#observer = null;
    this.#observed = null;
  }

  #measure(): void {
    const row = this.#options.row();
    if (!row) return;
    const items = this.#options.items(row);
    const widths = items.map((item) => item.getBoundingClientRect().width);
    const keep = items.findIndex((item) => this.#options.kept(item));
    const parent = items[0]?.parentElement;
    const gap = parent ? columnGapOf(parent) : 0;
    const more = this.#options.more(row);
    const moreWidth = more ? more.getBoundingClientRect().width + columnGapOf(row) : 0;
    const hiddenIndexes = fitPriority({ widths, available: row.getBoundingClientRect().width, gap, moreWidth, keep });
    const hidden = new Set(
      hiddenIndexes.flatMap((index) => {
        const item = items[index];
        return item ? [this.#options.keyOf(item)] : [];
      }),
    );
    const minimum = Math.ceil((widths[keep] ?? 0) + moreWidth);
    if (sameKeys(hidden, this.#hidden) && minimum === this.#minimum) return;
    this.#hidden = hidden.size === 0 ? NOTHING_HIDDEN : hidden;
    this.#minimum = minimum;
    this.#host.requestUpdate();
  }
}

const columnGapOf = (element: Element): number => Number.parseFloat(getComputedStyle(element).columnGap) || 0;

const sameKeys = (a: ReadonlySet<string>, b: ReadonlySet<string>): boolean =>
  a.size === b.size && [...a].every((key) => b.has(key));
