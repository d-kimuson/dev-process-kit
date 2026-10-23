import type { ReactiveController, ReactiveControllerHost } from 'lit';

import { closePopover, openPopover } from '../../lib/dom/popover';

/** As wide as a comment reads comfortably; as tall as the screen lets it, since a review runs long. */
const REVIEW_WIDTH = 440;
/** The popover's offset from its anchor plus its margin to the screen edge. */
const REVIEW_GAP = 16;

export type ReviewPopoverOptions = {
  readonly surface: () => HTMLElement | null;
  readonly anchor: () => Element | null;
  /** The toggle buttons that open and switch sections; their own press already decides what it does. */
  readonly trigger: () => Element | null;
  readonly open: () => boolean;
  readonly close: () => void;
};

const containsNode = (path: readonly EventTarget[], node: Element | null): boolean =>
  node !== null && path.includes(node);

/**
 * Floats the review in the top layer below its toggles, so opening it never
 * takes room from the main column. It stays open while the reader works on the
 * page (a comment often points at what they click next) and closes from its
 * toggle, Escape, or a press outside it (the settings menu closes the same way).
 */
export class ReviewPopoverController implements ReactiveController {
  readonly #options: ReviewPopoverOptions;
  #stop: (() => void) | null = null;

  constructor(host: ReactiveControllerHost, options: ReviewPopoverOptions) {
    this.#options = options;
    host.addController(this);
  }

  hostConnected(): void {
    window.addEventListener('keydown', this.#onKeyDown);
    document.addEventListener('pointerdown', this.#onPointerDown, true);
  }

  hostUpdated(): void {
    const surface = this.#options.surface();
    const open = this.#options.open() && surface !== null;
    if (open === (this.#stop !== null)) return;
    if (open) {
      const anchor = this.#options.anchor() ?? { top: 0, bottom: 0, right: window.innerWidth };
      // Any taller and it would not fit below the anchor, and would flip aside.
      const bottom = anchor instanceof Element ? anchor.getBoundingClientRect().bottom : anchor.bottom;
      const height = Math.max(0, window.innerHeight - bottom - REVIEW_GAP);
      this.#stop = openPopover(surface, anchor, { width: REVIEW_WIDTH, height }, { placement: 'bottom-end' });
      return;
    }
    this.#release();
    closePopover(surface);
  }

  hostDisconnected(): void {
    window.removeEventListener('keydown', this.#onKeyDown);
    document.removeEventListener('pointerdown', this.#onPointerDown, true);
    this.#release();
  }

  #release(): void {
    this.#stop?.();
    this.#stop = null;
  }

  #onKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape' || event.defaultPrevented || event.isComposing || !this.#options.open()) return;
    this.#options.close();
  };

  #onPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0 || !this.#options.open()) return;
    const path = event.composedPath();
    if (containsNode(path, this.#options.surface()) || containsNode(path, this.#options.trigger())) return;
    this.#options.close();
  };
}
