import type { ReactiveController, ReactiveControllerHost } from 'lit';

/**
 * Native HTML5 drag & drop as a ReactiveController.
 *
 * The controller owns the two pieces of ephemeral state every drag needs — what
 * is being dragged and which drop target is under the pointer — and turns the
 * seven DOM events into two sets of handlers a template binds with `@event`.
 * A host uses one controller for all its draggable kinds; each target says
 * which kind it accepts, so a milestone row never lights up for a story.
 *
 * Everything that decides *where* the drop lands (`hoveredId` + `place`) is
 * handed to the target's `onDrop`; the controller never dispatches anything.
 */
export type DragItem<T extends string = string> = {
  readonly type: T;
  readonly id: string;
};

export type DropPlace = 'before' | 'after' | 'end';

export type DragState<T extends string = string> =
  | { readonly kind: 'idle' }
  /** Picked up inside this host: the item is known from `dragstart`. */
  | { readonly kind: 'dragging'; readonly item: DragItem<T>; readonly over: string | null }
  /** Started elsewhere (another host, a synthetic event): only the highlight is known. */
  | { readonly kind: 'receiving'; readonly over: string };

const IDLE: DragState<never> = { kind: 'idle' };

const MIME = 'text/plain';

/** `story:u1` — the transfer payload also travels between documents. */
export const formatDragData = (item: DragItem): string => {
  return `${item.type}:${item.id}`;
};

/**
 * Inverse of `formatDragData`. A bare string (no `type:` prefix) is read as an
 * id of `fallbackType`, so a drop synthesized without a typed payload still
 * lands. Ids never contain `:` (see `entityIdSchema`).
 */
export const parseDragData = (raw: string | null | undefined, fallbackType: string): DragItem<string> | null => {
  const text = (raw ?? '').trim();
  if (text.length === 0) return null;
  const separator = text.indexOf(':');
  if (separator < 0) return { type: fallbackType, id: text };
  const type = text.slice(0, separator);
  const id = text.slice(separator + 1);
  if (type.length === 0 || id.length === 0) return null;
  return { type, id };
};

/** Above or below the vertical midpoint of the hovered element. */
export const placeWithin = (rect: { readonly top: number; readonly height: number }, clientY: number): DropPlace => {
  return clientY <= rect.top + rect.height / 2 ? 'before' : 'after';
};

export type Drop<T extends string> = {
  readonly item: DragItem<T>;
  /** Id of the element under the pointer (`null` = dropped on empty space). */
  readonly hoveredId: string | null;
  readonly place: DropPlace;
  readonly event: DragEvent;
};

export type DropTargetOptions<T extends string> = {
  /** Identifies the target for the `isOver` highlight. */
  readonly key: string;
  readonly accepts: T;
  /**
   * The element under the pointer that decides `before` / `after`. Returning
   * `null` means the drop landed on empty space (`place: 'end'`).
   */
  readonly hovered?: (event: DragEvent) => { readonly id: string | null; readonly element: Element } | null;
  readonly onDrop: (drop: Drop<T>) => void;
};

export type DragSourceHandlers = {
  readonly dragstart: (event: DragEvent) => void;
  readonly dragend: () => void;
};

export type DropTargetHandlers = {
  readonly dragenter: (event: DragEvent) => void;
  readonly dragover: (event: DragEvent) => void;
  readonly dragleave: () => void;
  readonly drop: (event: DragEvent) => void;
};

export class DragController<T extends string = string> implements ReactiveController {
  readonly #host: ReactiveControllerHost;
  #state: DragState<T> = IDLE;
  #pendingStart: ReturnType<typeof setTimeout> | undefined;

  constructor(host: ReactiveControllerHost) {
    this.#host = host;
    host.addController(this);
  }

  hostDisconnected(): void {
    this.reset();
  }

  get state(): DragState<T> {
    return this.#state;
  }

  get item(): DragItem<T> | null {
    return this.#state.kind === 'dragging' ? this.#state.item : null;
  }

  isDragging(type: T, id: string): boolean {
    const item = this.item;
    return item !== null && item.type === type && item.id === id;
  }

  isOver(key: string): boolean {
    return this.#state.kind !== 'idle' && this.#state.over === key;
  }

  reset(): void {
    clearTimeout(this.#pendingStart);
    this.#pendingStart = undefined;
    this.#set(IDLE);
  }

  /**
   * Handlers for the element that can be picked up (also give it `draggable="true"`).
   *
   * The `dragging` state is applied a task later, not inside `dragstart`: the
   * browser snapshots the drag image and re-hit-tests the source only after
   * the handler (and Lit's microtask re-render) ran, so a synchronous
   * re-render would bake the faded source into the ghost — or, if it hides
   * the source from hit testing, cancel the drag outright.
   */
  source(item: DragItem<T>): DragSourceHandlers {
    return {
      dragstart: (event) => {
        if (event.dataTransfer) {
          event.dataTransfer.setData(MIME, formatDragData(item));
          event.dataTransfer.effectAllowed = 'move';
        }
        clearTimeout(this.#pendingStart);
        this.#pendingStart = setTimeout(() => {
          this.#pendingStart = undefined;
          this.#set({ kind: 'dragging', item, over: null });
        }, 0);
      },
      dragend: () => this.reset(),
    };
  }

  /** Handlers for an element things can be dropped on. */
  target<A extends T>(options: DropTargetOptions<A>): DropTargetHandlers {
    const enter = (event: DragEvent): void => {
      if (!this.#mayAccept(options.accepts)) return;
      event.preventDefault();
      this.#setOver(options.key);
    };
    return {
      dragenter: enter,
      dragover: (event) => {
        if (!this.#mayAccept(options.accepts)) return;
        event.preventDefault();
        if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
        this.#setOver(options.key);
      },
      dragleave: () => {
        if (this.isOver(options.key)) this.#setOver(null);
      },
      drop: (event) => {
        event.preventDefault();
        const item = parseDragData(event.dataTransfer?.getData(MIME), options.accepts) ?? this.item;
        this.#set(IDLE);
        if (!item || item.type !== options.accepts) return;
        const hovered = options.hovered?.(event) ?? null;
        options.onDrop({
          // `accepts` is the typed side of the comparison above; rebuilding the
          // item from it keeps the accepted kind without a type assertion.
          item: { type: options.accepts, id: item.id },
          hoveredId: hovered?.id ?? null,
          place: hovered ? placeWithin(hovered.element.getBoundingClientRect(), event.clientY) : 'end',
          event,
        });
      },
    };
  }

  /**
   * A drag that started elsewhere (another host, or a synthetic event) has no
   * known item yet; it is accepted until the drop reveals its type.
   */
  #mayAccept(type: T): boolean {
    const item = this.item;
    return item === null || item.type === type;
  }

  #setOver(key: string | null): void {
    const state = this.#state;
    if (state.kind === 'dragging') {
      if (state.over !== key) this.#set({ ...state, over: key });
      return;
    }
    if (key === null) {
      if (state.kind === 'receiving') this.#set(IDLE);
      return;
    }
    if (state.kind === 'idle' || state.over !== key) this.#set({ kind: 'receiving', over: key });
  }

  #set(next: DragState<T>): void {
    if (this.#state === next) return;
    this.#state = next;
    this.#host.requestUpdate();
  }
}
