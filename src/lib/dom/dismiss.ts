import type { ReactiveController, ReactiveControllerHost } from 'lit';

/**
 * What a dismissable layer (a drawer, a menu) needs to know to close: whether
 * it is open, which presses land outside it and which Escapes are meant for it.
 * The layer itself decides both from the event's composed path, so a shadow
 * root never hides where a press landed.
 */
export type DismissOptions = {
  readonly open: () => boolean;
  /** A press with this path closes the layer (it landed outside, on nothing that keeps it open). */
  readonly closesOn: (path: readonly EventTarget[]) => boolean;
  /** An Escape with this path is for the layer (not for another part of the page). */
  readonly ownsEscape: (path: readonly EventTarget[]) => boolean;
  readonly dismiss: () => void;
};

/**
 * Closes a layer on Escape and on a press outside it, listening on the document
 * while the host is connected. An Escape something else already handled (an
 * editor cancelling its edit) is left alone, as is one typed into an IME.
 */
export class DismissController implements ReactiveController {
  readonly #options: DismissOptions;
  constructor(host: ReactiveControllerHost, options: DismissOptions) {
    this.#options = options;
    host.addController(this);
  }
  hostConnected(): void {
    document.addEventListener('pointerdown', this.#onPointerDown, true);
    document.addEventListener('keydown', this.#onKeyDown);
  }
  hostDisconnected(): void {
    document.removeEventListener('pointerdown', this.#onPointerDown, true);
    document.removeEventListener('keydown', this.#onKeyDown);
  }

  #onPointerDown = (event: MouseEvent): void => {
    if (event.button !== 0 || !this.#options.open()) return;
    if (this.#options.closesOn(event.composedPath())) this.#options.dismiss();
  };

  #onKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape' || event.isComposing || event.defaultPrevented || !this.#options.open()) return;
    if (!this.#options.ownsEscape(event.composedPath())) return;
    event.preventDefault();
    this.#options.dismiss();
  };
}
