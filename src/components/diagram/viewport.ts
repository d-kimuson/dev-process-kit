import { clamp } from 'es-toolkit/math';

/**
 * Pan / zoom for a diagram canvas.
 *
 * The world element is transformed imperatively (a Lit re-render must not fight
 * the gesture), and panning is constrained to the content box grown by 10% per
 * side so the diagram can never be dragged out of sight.
 */

export type ViewState = { readonly x: number; readonly y: number; readonly scale: number };

export type ViewportBounds = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

export type ViewportBox = { readonly x: number; readonly y: number; readonly width: number; readonly height: number };

export const MIN_SCALE = 0.08;
export const MAX_SCALE = 1.8;

export const expandedBounds = (boxes: readonly ViewportBox[]): ViewportBounds => {
  if (boxes.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
  const x = Math.min(...boxes.map((box) => box.x));
  const y = Math.min(...boxes.map((box) => box.y));
  const width = Math.max(...boxes.map((box) => box.x + box.width)) - x;
  const height = Math.max(...boxes.map((box) => box.y + box.height)) - y;
  return { x: x - width * 0.1, y: y - height * 0.1, width: width * 1.2, height: height * 1.2 };
};

/** Where the content begins inside a box grown by `expandedBounds`, along one axis. */
const contentStart = (start: number, size: number): number => start + size / 12;

/** Gap between the canvas edge and content opened at, or pinned to, its start. */
const START_MARGIN = 16;

/**
 * Where content that fits in the canvas sits: `center` in the middle, `start`
 * at the top-left corner (for content read from there, like a board).
 */
export type ViewportAlign = 'center' | 'start';

export const constrainView = (
  candidate: ViewState,
  area: ViewportBounds,
  width: number,
  height: number,
  align: ViewportAlign = 'center',
): ViewState => {
  if (area.width === 0 || area.height === 0) return { ...candidate, x: 0, y: 0 };
  const axis = (offset: number, start: number, size: number, viewport: number): number => {
    const scaled = size * candidate.scale;
    if (scaled <= viewport) {
      return align === 'start'
        ? START_MARGIN - contentStart(start, size) * candidate.scale
        : (viewport - scaled) / 2 - start * candidate.scale;
    }
    return Math.min(-start * candidate.scale, Math.max(viewport - (start + size) * candidate.scale, offset));
  };
  return {
    ...candidate,
    x: axis(candidate.x, area.x, area.width, width),
    y: axis(candidate.y, area.y, area.height, height),
  };
};

/**
 * The view a plain wheel scroll moves to, or `null` when the diagram is already
 * at the edge a vertical scroll heads for (or fits vertically): the scroll then
 * belongs to the page, so reading carries on past the diagram. A horizontal
 * scroll always stays in the diagram, so it never turns into history navigation.
 */
export const wheelPan = (
  view: ViewState,
  area: ViewportBounds,
  width: number,
  height: number,
  deltaX: number,
  deltaY: number,
  align: ViewportAlign = 'center',
): ViewState | null => {
  const next = constrainView({ ...view, x: view.x - deltaX, y: view.y - deltaY }, area, width, height, align);
  const vertical = Math.abs(deltaY) > Math.abs(deltaX);
  return vertical && next.y === view.y ? null : next;
};

export type ViewportOptions = {
  readonly canvas: HTMLElement;
  readonly world: HTMLElement;
  /** Background click / Escape: the component clears its selection. */
  readonly onClearSelection: () => void;
  readonly onView?: (view: ViewState) => void;
  /** Where content that fits sits; `center` by default. */
  readonly align?: ViewportAlign;
};

export type ViewportController = {
  /** World-space content box; drives the pan limits and the fit. */
  setContent(bounds: ViewportBounds): void;
  apply(): void;
  fit(): void;
  fitWidth(): void;
  /** 100% scale, anchored to the content origin: the view a diagram opens in. */
  reset(): void;
  zoom(factor: number, x?: number, y?: number): void;
  view(): ViewState;
  destroy(): void;
};

/**
 * Anything focusable or clickable inside the canvas keeps its own gestures; the
 * canvas only pans when the gesture starts on empty space or a node card.
 */
const INTERACTIVE = 'button,[role="button"],a,input,textarea,select';

export const createViewport = (options: ViewportOptions): ViewportController => {
  const { canvas, world, onClearSelection, onView, align = 'center' } = options;
  let area: ViewportBounds = { x: 0, y: 0, width: 0, height: 0 };
  let view: ViewState = { x: 0, y: 0, scale: 1 };

  const size = (): { width: number; height: number } => ({
    width: canvas.clientWidth || 1000,
    height: canvas.clientHeight || 560,
  });

  const apply = (): void => {
    const { width, height } = size();
    view = constrainView(view, area, width, height, align);
    world.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.scale})`;
    onView?.(view);
  };

  const fit = (): void => {
    const { width, height } = size();
    // `area` is the content grown by 10%; undo that so fit means "content fits".
    const contentWidth = area.width / 1.2 || 1;
    const contentHeight = area.height / 1.2 || 1;
    view = {
      ...view,
      scale: clamp(Math.min((width - 24) / contentWidth, (height - 40) / contentHeight), MIN_SCALE, 1),
    };
    view = {
      ...view,
      x: (width - area.width * view.scale) / 2 - area.x * view.scale,
      y: (height - area.height * view.scale) / 2 - area.y * view.scale,
    };
    apply();
  };

  /** Width-fit and top-aligned: for tall content that is read by scrolling. */
  const fitWidth = (): void => {
    const { width } = size();
    const contentWidth = area.width / 1.2 || 1;
    const scale = clamp((width - 24) / contentWidth, MIN_SCALE, 1);
    view = { scale, x: (width - area.width * scale) / 2 - area.x * scale, y: 16 };
    apply();
  };

  const reset = (): void => {
    view = {
      scale: 1,
      x: START_MARGIN - contentStart(area.x, area.width),
      y: START_MARGIN - contentStart(area.y, area.height),
    };
    apply();
  };

  const zoom = (factor: number, x = size().width / 2, y = size().height / 2): void => {
    const previous = view.scale;
    const scale = clamp(previous * factor, MIN_SCALE, MAX_SCALE);
    if (scale === previous) return;
    view = {
      scale,
      x: x - ((x - view.x) * scale) / previous,
      y: y - ((y - view.y) * scale) / previous,
    };
    apply();
  };

  const onWheel = (event: WheelEvent): void => {
    if (event.target instanceof Element && event.target.closest('.diagram-zoom')) return;
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? size().height : 1;
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      const rect = canvas.getBoundingClientRect();
      zoom(
        Math.exp(-clamp(event.deltaY * unit, -60, 60) * 0.0012),
        event.clientX - rect.left,
        event.clientY - rect.top,
      );
      return;
    }
    const { width, height } = size();
    const next = wheelPan(view, area, width, height, event.deltaX * unit, event.deltaY * unit, align);
    if (next === null) return;
    event.preventDefault();
    view = next;
    apply();
  };

  const pointers = new Map<number, { x: number; y: number }>();
  let gesture: { x: number; y: number; distance: number } | null = null;
  let moved = false;

  const geometry = (): { x: number; y: number; distance: number } | null => {
    const points = [...pointers.values()];
    const first = points[0];
    if (!first) return null;
    const second = points[1];
    if (!second) return { ...first, distance: 0 };
    return {
      x: (first.x + second.x) / 2,
      y: (first.y + second.y) / 2,
      distance: Math.hypot(second.x - first.x, second.y - first.y),
    };
  };

  const onPointerDown = (event: PointerEvent): void => {
    if (pointers.size === 0) moved = false;
    const target = event.target instanceof Element ? event.target : null;
    const interactive = target?.closest(INTERACTIVE) ?? null;
    if (event.button !== 0 || (event.pointerType !== 'touch' && interactive !== null)) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    gesture = geometry();
    if (interactive === null) canvas.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent): void => {
    if (!pointers.has(event.pointerId) || gesture === null) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const next = geometry();
    if (next === null) return;
    const dx = next.x - gesture.x;
    const dy = next.y - gesture.y;
    if (Math.abs(dx) + Math.abs(dy) > 1 || Math.abs(next.distance - gesture.distance) > 1) moved = true;
    if (next.distance > 0 && gesture.distance > 0) {
      const rect = canvas.getBoundingClientRect();
      zoom(Math.pow(next.distance / gesture.distance, 0.45), gesture.x - rect.left, gesture.y - rect.top);
    }
    view = { ...view, x: view.x + dx, y: view.y + dy };
    apply();
    gesture = next;
    canvas.classList.toggle('is-panning', moved);
  };

  const endPointer = (event: PointerEvent): void => {
    pointers.delete(event.pointerId);
    gesture = geometry();
    if (pointers.size > 0) return;
    canvas.classList.remove('is-panning');
    // A cancelled gesture must not swallow the next, unrelated click.
    if (event.type === 'pointercancel') moved = false;
  };

  const onPointerUp = (event: PointerEvent): void => {
    if (moved) {
      event.preventDefault();
      event.stopPropagation();
      // Keep the drag marker until the ensuing click so panning does not deselect.
    }
    endPointer(event);
  };

  const onClickCapture = (event: MouseEvent): void => {
    if (moved) {
      event.preventDefault();
      event.stopPropagation();
      moved = false;
      return;
    }
    const target = event.target instanceof Element ? event.target : null;
    if (target === null || target.closest(INTERACTIVE) !== null) return;
    onClearSelection();
  };

  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.target !== canvas) return;
    const step = 30;
    if (event.key === '+' || event.key === '=') zoom(1.1);
    else if (event.key === '-') zoom(1 / 1.1);
    else if (event.key === '0') fit();
    else if (event.key === 'Escape') onClearSelection();
    else if (
      event.key === 'ArrowLeft' ||
      event.key === 'ArrowRight' ||
      event.key === 'ArrowUp' ||
      event.key === 'ArrowDown'
    ) {
      view = {
        ...view,
        x: view.x + (event.key === 'ArrowLeft' ? step : event.key === 'ArrowRight' ? -step : 0),
        y: view.y + (event.key === 'ArrowUp' ? step : event.key === 'ArrowDown' ? -step : 0),
      };
      apply();
    } else return;
    event.preventDefault();
  };

  /** Keep a keyboard-focused card inside the viewport. */
  const onFocusIn = (event: FocusEvent): void => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (target === null || !world.contains(target)) return;
    const rect = target.getBoundingClientRect();
    const box = canvas.getBoundingClientRect();
    let dx = 0;
    let dy = 0;
    if (rect.left < box.left + 12) dx = box.left + 12 - rect.left;
    else if (rect.right > box.right - 12) dx = box.right - 12 - rect.right;
    if (rect.top < box.top + 12) dy = box.top + 12 - rect.top;
    else if (rect.bottom > box.bottom - 40) dy = box.bottom - 40 - rect.bottom;
    if (dx === 0 && dy === 0) return;
    view = { ...view, x: view.x + dx, y: view.y + dy };
    apply();
  };

  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', endPointer);
  canvas.addEventListener('lostpointercapture', endPointer);
  canvas.addEventListener('click', onClickCapture, true);
  canvas.addEventListener('keydown', onKeyDown);
  canvas.addEventListener('focusin', onFocusIn);
  const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => apply());
  observer?.observe(canvas);

  return {
    setContent(bounds) {
      area = expandedBounds(bounds.width === 0 && bounds.height === 0 ? [] : [bounds]);
      world.style.width = `${bounds.width}px`;
      world.style.height = `${bounds.height}px`;
      apply();
    },
    apply,
    fit,
    fitWidth,
    reset,
    zoom,
    view: () => ({ ...view }),
    destroy() {
      observer?.disconnect();
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', endPointer);
      canvas.removeEventListener('lostpointercapture', endPointer);
      canvas.removeEventListener('click', onClickCapture, true);
      canvas.removeEventListener('keydown', onKeyDown);
      canvas.removeEventListener('focusin', onFocusIn);
    },
  };
};
