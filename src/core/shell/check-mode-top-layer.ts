/**
 * Check Mode's badges over a maximized diagram panel.
 *
 * A maximized `<dpk-dialog-panel>` lifts its frame into the top layer with the
 * Popover API (`src/components/dialog-panel/element.ts`'s `#syncTopLayer`), and
 * a top-layer box paints over everything that is not in the top layer itself:
 * the ordinary badge layers inside the view's shadow root end up behind it,
 * invisible however high their `z-index`. So while a panel is maximized the
 * view draws the badges into a layer of its own and shows that layer as a
 * manual popover too, after the panel's — the top layer orders by the order
 * boxes were shown, and the last one is on top. Restoring the panel takes the
 * layer out again (`#hide`), and the ordinary layers take back over, so no
 * badge is ever drawn twice.
 *
 * The layer covers the viewport (`position: fixed; inset: 0`), which is the box
 * `positionCheckBadges` measures against, so the badges keep the same viewport
 * coordinates they use everywhere else. Without the Popover API the panel is
 * only a fixed box with a very high `z-index` (its own fallback), and the layer
 * stacks just above that instead (see `styles.ts`).
 *
 * The event is read from `composedPath()` rather than `event.target`: a panel a
 * board renders sits in the board's own shadow root, so by the time the event
 * reaches the view that hosts the board, `target` has been retargeted to the
 * board element.
 */
import type { ReactiveController, ReactiveControllerHost } from 'lit';

/** The element whose maximize state decides whether the badges need the top layer. */
const PANEL_TAG = 'dpk-dialog-panel';

/** What `<dpk-dialog-panel>` dispatches when it is maximized or restored. */
export const MAXIMIZE_EVENT = 'dpk-maximize-change';

export type CheckTopLayerOptions = {
  /** Check Mode is on: without badges there is no layer to lift. */
  readonly active: () => boolean;
  /** The layer the last render drew, or `null` while no panel is maximized. */
  readonly layer: () => HTMLElement | null;
  /** Called once the layer is in place, so its badges can be measured and placed. */
  readonly placed: () => void;
};

/** The panel a maximize event came from, whichever shadow root it is rendered in. */
export const maximizedPanelOf = (event: Event): Element | null => {
  const panel = event.composedPath().find((node) => node instanceof Element && node.localName === PANEL_TAG);
  return panel instanceof Element ? panel : null;
};

/** A layer that has just been shown, or an already-open one it replaces. */
const isOpen = (layer: HTMLElement): boolean => {
  try {
    return layer.matches(':popover-open');
  } catch {
    // A browser with `showPopover` but no selector support: assume it took.
    return true;
  }
};

/**
 * Keeps the top-layer badge layer in step with the maximized panels under the
 * host: shown over the first one, hidden again when the last one is restored.
 */
export class CheckModeTopLayerController implements ReactiveController {
  readonly #host: ReactiveControllerHost & HTMLElement;
  readonly #options: CheckTopLayerOptions;
  /** The panels currently maximized, in the order they were maximized. */
  readonly #panels = new Set<Element>();
  /** The layer that was shown, so a re-render that replaces it is noticed. */
  #shown: HTMLElement | null = null;
  /** A maximize event arrived: the layer must be shown again to land above the panel. */
  #reorder = false;

  constructor(host: ReactiveControllerHost & HTMLElement, options: CheckTopLayerOptions) {
    this.#host = host;
    this.#options = options;
    host.addController(this);
  }

  /** The panels a top-layer badge layer is drawn over; empty when none is maximized. */
  get panels(): readonly Element[] {
    return [...this.#panels];
  }

  /** Whether any panel under this host is maximized right now. */
  get maximized(): boolean {
    return this.#panels.size > 0;
  }

  hostConnected(): void {
    this.#host.addEventListener(MAXIMIZE_EVENT, this.#onMaximize);
  }

  hostDisconnected(): void {
    this.#host.removeEventListener(MAXIMIZE_EVENT, this.#onMaximize);
    this.#panels.clear();
    this.#hide();
  }

  hostUpdated(): void {
    this.#apply();
  }

  readonly #onMaximize = (event: Event): void => {
    const panel = maximizedPanelOf(event);
    if (panel === null) return;
    const detail: unknown = event instanceof CustomEvent ? event.detail : null;
    const maximized =
      typeof detail === 'object' && detail !== null && 'maximized' in detail ? detail.maximized === true : false;
    if (maximized) {
      // Only one panel is maximized at a time; a re-render may replace its element.
      this.#panels.clear();
      this.#panels.add(panel);
    } else {
      this.#panels.clear();
    }
    this.#reorder = true;
    // The layer only exists while a panel is maximized: the render that draws it follows.
    this.#host.requestUpdate();
  };

  #apply(): void {
    const layer = this.#options.active() && this.#panels.size > 0 ? this.#options.layer() : null;
    if (layer === null) {
      this.#hide();
      return;
    }
    if (layer !== this.#shown || this.#reorder) {
      this.#hide();
      this.#show(layer);
    }
    this.#reorder = false;
    this.#options.placed();
  }

  #show(layer: HTMLElement): void {
    this.#shown = layer;
    if (typeof layer.showPopover !== 'function') return;
    try {
      // Already in the top layer (a panel maximized twice): take it out and back in,
      // so it lands above the panel the same way a first show does.
      if (isOpen(layer)) layer.hidePopover();
      layer.showPopover();
    } catch {
      /* Not in the document yet: the next render tries again. */
    }
  }

  #hide(): void {
    const layer = this.#shown;
    this.#shown = null;
    if (layer === null || typeof layer.hidePopover !== 'function') return;
    try {
      if (isOpen(layer)) layer.hidePopover();
    } catch {
      /* Already gone with the render that removed it. */
    }
  }
}
