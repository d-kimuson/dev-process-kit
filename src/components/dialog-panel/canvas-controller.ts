/**
 * The effects behind a canvas panel's body: the pan/zoom controller on the
 * canvas, the measuring of its content, and the view it opens in. The view
 * math lives in `../base/viewport`.
 */
import type { ReactiveController, ReactiveControllerHost } from 'lit';

import {
  createViewport,
  MIN_SCALE,
  type ViewportAlign,
  type ViewportBox,
  type ViewportController,
  type ViewportPoint,
  type ViewState,
} from '../../boards/base/viewport';
import { EMPTY_STATIC_CANVAS, naturalCanvasHeight, resolveStaticCanvasSize, type StaticCanvasState } from './model';

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
  /**
   * Whether the canvas sizes itself to its whole content instead of panning
   * and zooming it: a figure in the page's flow. While true the canvas takes
   * no gestures and the frame gets its natural height.
   */
  readonly staticSize: () => boolean;
};

export class PanelCanvasController implements ReactiveController {
  readonly #options: CanvasOptions;
  #viewport: ViewportController | null = null;
  #measure: ResizeObserver | null = null;
  /** Watches the static canvas's width, the only thing its natural height depends on. */
  #staticMeasure: ResizeObserver | null = null;
  /** Widths already measured in this content's current size, for the oscillation guard. */
  #static: StaticCanvasState = EMPTY_STATIC_CANVAS;
  /** The width the frame was last laid out at, including a settled pair's width. */
  #staticObserved = -1;
  /** Identifies what the measured widths belong to; a content change starts over. */
  #staticContent = '';
  #staticFrame: number | null = null;
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

  /** Builds the controller on the rendered canvas; again after the alignment or the chrome changed. */
  attach(): void {
    this.detach();
    this.#opened = false;
    const elements = this.#options.elements();
    if (elements === null) return;
    const { canvas, world } = elements;
    this.#viewport = createViewport({
      canvas,
      world,
      align: this.#options.align(),
      // Sized here, so content that measures itself keeps doing so.
      sizeWorld: false,
      interactive: !this.#options.staticSize(),
      onClearSelection: () => this.#options.onDismiss(),
      onView: (view) => this.#options.onView(view),
    });
    this.#measure = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => this.sync());
    this.#measure?.observe(world);
    if (this.#options.staticSize() && typeof ResizeObserver !== 'undefined') {
      this.#staticMeasure = new ResizeObserver(() => this.#scheduleStaticSync());
      this.#staticMeasure.observe(canvas);
    }
    this.sync();
  }

  detach(): void {
    if (this.#staticFrame !== null && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(this.#staticFrame);
    }
    this.#staticFrame = null;
    this.#static = EMPTY_STATIC_CANVAS;
    this.#staticObserved = -1;
    this.#staticContent = '';
    this.#staticMeasure?.disconnect();
    this.#staticMeasure = null;
    const frame = this.#options.elements()?.canvas.parentElement;
    if (frame !== null && frame !== undefined) frame.style.height = '';
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
    if (this.#options.staticSize()) {
      this.#layoutStatic(width, height);
      return;
    }
    if (!this.#opened && width > 0 && height > 0) this.open();
  }

  /**
   * A static canvas gets the height its whole content needs at a scale of at
   * most 100%, and is fitted into it. The height is written on the frame (the
   * canvas fills it absolutely), so it never becomes a second source of truth
   * for the content's own box.
   */
  #layoutStatic(contentWidth: number, contentHeight: number): void {
    const canvas = this.#options.elements()?.canvas;
    const frame = canvas?.parentElement;
    if (canvas === undefined || frame === null || frame === undefined) return;
    const content = contentWidth > 0 && contentHeight > 0 ? { width: contentWidth, height: contentHeight } : null;
    const key = content === null ? 'empty' : `${content.width}x${content.height}`;
    if (key !== this.#staticContent) {
      this.#staticContent = key;
      this.#static = EMPTY_STATIC_CANVAS;
    }
    const width = canvas.clientWidth;
    this.#staticObserved = width;
    const resolved = resolveStaticCanvasSize(this.#static, width, naturalCanvasHeight(width, content, MIN_SCALE));
    this.#static = resolved.state;
    const style = `${resolved.height}px`;
    if (frame.style.height !== style) frame.style.height = style;
    this.#viewport?.fit();
  }

  /**
   * A resize can follow from the height this very controller wrote: a classic
   * scrollbar appearing or disappearing changes the width, which changes the
   * fitted scale and therefore the height that decides the scrollbar. Only a
   * real width change is worth re-measuring, once per frame, and
   * `resolveStaticCanvasSize` then freezes the larger height once the width
   * has alternated back to its value from two syncs ago.
   */
  #scheduleStaticSync(): void {
    if (this.#staticFrame !== null || typeof requestAnimationFrame === 'undefined') return;
    this.#staticFrame = requestAnimationFrame(() => {
      this.#staticFrame = null;
      const canvas = this.#options.elements()?.canvas;
      if (canvas === undefined || Math.abs(canvas.clientWidth - this.#staticObserved) <= 1) return;
      this.sync();
    });
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

  fitTo(box: ViewportBox): void {
    this.#viewport?.fitTo(box);
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
