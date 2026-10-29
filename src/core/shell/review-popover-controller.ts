import type { ReactiveController, ReactiveControllerHost } from 'lit';

import { closePopover, openPopover } from '../../lib/dom/popover';
import { reviewPlacementAt } from './review-popover';

/** As wide as a comment reads comfortably; as tall as the screen lets it, since a review runs long. */
const REVIEW_WIDTH = 440;

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
 * Floats the review in the top layer beside the floating menu its toggles are
 * in, so opening it never takes room from the main column. It opens on the
 * side of that menu which has the room for it (see `review-popover.ts`): the
 * menu docks anywhere on the screen, and a window sized by the room below a
 * bottom-docked menu would have none. It stays open while the reader works on
 * the page (a comment often points at what they click next) and closes from its
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
      // An anchor that is not in the document yet has no box to open beside: it floats below the top edge.
      const box = anchor instanceof Element ? anchor.getBoundingClientRect() : anchor;
      const { placement, height } = reviewPlacementAt(window.innerHeight, box);
      this.#stop = openPopover(surface, anchor, { width: REVIEW_WIDTH, height }, { placement });
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
