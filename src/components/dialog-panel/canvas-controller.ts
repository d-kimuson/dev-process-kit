/**
 * The effects behind a canvas panel's body: the pan/zoom controller on the
 * canvas, the measuring of its content, and the view it opens in. The view
 * math lives in `../diagram/viewport`.
 */
import type { ReactiveController, ReactiveControllerHost } from 'lit';

import {
  createViewport,
  type ViewportAlign,
  type ViewportController,
  type ViewportPoint,
  type ViewState,
} from '../diagram/viewport';

/** The view the content opens in: fitted, fitted to the width, at 100%, or left to the caller. */
export type CanvasInitial = 'fit' | 'fit-width' | 'actual' | 'none';

const INITIALS: readonly CanvasInitial[] = ['fit', 'fit-width', 'actual', 'none'];

export type CanvasOptions = {
  /** The canvas and its world, once rendered; `null` while the panel is not a canvas. */
  readonly elements: () => { readonly canvas: HTMLElement; readonly world: HTMLElement } | null;
  readonly align: () => ViewportAlign;
  readonly initial: () => CanvasInitial;
  /** The content box in world pixels; `null` measures the content. */
  readonly contentSize: () => { readonly width: number; readonly height: number } | null;
  /** Background click / Escape: `true` when something was cleared, so the key stops there. */
  readonly onDismiss: () => boolean;
  readonly onView: (view: ViewState) => void;
};

export class PanelCanvasController implements ReactiveController {
  readonly #options: CanvasOptions;
  #viewport: ViewportController | null = null;
  #measure: ResizeObserver | null = null;
  #opened = false;

  constructor(host: ReactiveControllerHost, options: CanvasOptions) {
    this.#options = options;
    host.addController(this);
  }

  hostDisconnected(): void {
    this.detach();
  }

  get attached(): boolean {
    return this.#viewport !== null;
  }

  get view(): ViewState {
    return this.#viewport?.view() ?? { x: 0, y: 0, scale: 1 };
  }

  /** Builds the controller on the rendered canvas; again after the alignment changed. */
  attach(): void {
    this.detach();
    const elements = this.#options.elements();
    if (elements === null) return;
    const { canvas, world } = elements;
    this.#viewport = createViewport({
      canvas,
      world,
      align: this.#options.align(),
      // Sized here, so content that measures itself keeps doing so.
      sizeWorld: false,
      onClearSelection: () => this.#options.onDismiss(),
      onView: (view) => this.#options.onView(view),
    });
    this.#measure = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => this.sync());
    this.#measure?.observe(world);
    this.sync();
  }

  detach(): void {
    this.#viewport?.destroy();
    this.#viewport = null;
    this.#measure?.disconnect();
    this.#measure = null;
  }

  /** Hands the content box to the controller; the first non-empty one opens the view. */
  sync(): void {
    const viewport = this.#viewport;
    const world = this.#options.elements()?.world;
    if (viewport === null || world === undefined) return;
    const given = this.#options.contentSize();
    world.style.width = given ? `${given.width}px` : '';
    world.style.height = given ? `${given.height}px` : '';
    const width = given?.width ?? world.offsetWidth;
    const height = given?.height ?? world.offsetHeight;
    viewport.setContent({ x: 0, y: 0, width, height });
    if (!this.#opened && width > 0 && height > 0) this.open();
  }

  /** The opening view, again. */
  open(): void {
    const viewport = this.#viewport;
    if (viewport === null) return;
    this.#opened = true;
    const initial = this.#options.initial();
    const chosen = INITIALS.includes(initial) ? initial : 'fit';
    if (chosen === 'fit') viewport.fit();
    else if (chosen === 'fit-width') viewport.fitWidth();
    else if (chosen === 'actual') viewport.reset();
  }

  fit(): void {
    this.#viewport?.fit();
  }

  fitWidth(): void {
    this.#viewport?.fitWidth();
  }

  reset(corner?: ViewportPoint): void {
    this.#viewport?.reset(corner);
  }

  zoom(factor: number): void {
    this.#viewport?.zoom(factor);
  }

  apply(): void {
    this.#viewport?.apply();
  }
}
