/**
 * Reader-local drag state for one diagram instance: tracks the nodes the reader
 * moved, persists them as absolute positions keyed by board/diagram/node id (see
 * `../../core/layout-position`), and reacts to other diagram instances writing
 * the same storage. Never part of the draft or the hand-off.
 */
import type { ReactiveController, ReactiveControllerHost } from 'lit';

import type { JsonStore } from '../../lib/dom/json-store';
import type { LayoutPoint } from '../../lib/layout/layered';

import {
  EMPTY_POSITION_STATE,
  LAYOUT_CHANGE_EVENT,
  hasOverridesFor,
  positionsFor,
  pruneMissingNodes,
  resetDiagram,
  setPosition,
  setPositions,
  type PositionOverride,
  type PositionState,
} from '../../core/layout-position';
import {
  currentPositionStorageKey,
  defaultPositionStore,
  memoryPositionStore,
} from '../../core/layout-position-storage';
import { BOARD_ATTRIBUTE } from '../../core/page/host';

/** The nearest board id an element sits in; `''` outside any `board="…"` ancestor (a standalone template). */
export const nearestBoardId = (element: Element): string =>
  element.closest(`[${BOARD_ATTRIBUTE}]`)?.getAttribute(BOARD_ATTRIBUTE) ?? '';

export type PositionControllerOptions = {
  /** The element whose nearest board this diagram belongs to. */
  readonly host: () => Element;
  readonly diagram: () => string;
  /** `false` keeps overrides in memory for this page load only (tests). Default: persisted. */
  readonly persist?: boolean;
};

export class PositionController implements ReactiveController {
  readonly #host: ReactiveControllerHost;
  readonly #options: PositionControllerOptions;
  #store: JsonStore<PositionState> | null = null;
  #key = '';
  #state: PositionState = EMPTY_POSITION_STATE;
  readonly #onChange = (): void => this.#handleChange();

  constructor(host: ReactiveControllerHost, options: PositionControllerOptions) {
    this.#host = host;
    this.#options = options;
    host.addController(this);
  }

  hostConnected(): void {
    this.#store = this.#options.persist === false ? memoryPositionStore() : defaultPositionStore();
    this.#key = currentPositionStorageKey();
    this.#state = this.#store.read(this.#key) ?? EMPTY_POSITION_STATE;
    window.addEventListener(LAYOUT_CHANGE_EVENT, this.#onChange);
  }

  hostDisconnected(): void {
    window.removeEventListener(LAYOUT_CHANGE_EVENT, this.#onChange);
  }

  get #board(): string {
    return nearestBoardId(this.#options.host());
  }

  get #diagram(): string {
    return this.#options.diagram();
  }

  /** This diagram's overrides, keyed by node id, ready to merge into its layout. */
  overrides(): ReadonlyMap<string, LayoutPoint> {
    return positionsFor(this.#state, this.#board, this.#diagram);
  }

  hasOverrides(): boolean {
    return hasOverridesFor(this.#state, this.#board, this.#diagram);
  }

  /** Records where the reader dropped a node, as an absolute position. */
  commit(node: string, position: LayoutPoint): void {
    this.#state = setPosition(this.#state, { board: this.#board, diagram: this.#diagram, node }, position);
    this.#persist();
  }

  /** Records where the reader dropped several nodes at once (dragging an aggregate group by its outline). */
  commitMany(positions: ReadonlyMap<string, LayoutPoint>): void {
    if (positions.size === 0) return;
    const entries: PositionOverride[] = [...positions].map(([node, position]) => ({
      board: this.#board,
      diagram: this.#diagram,
      node,
      position,
    }));
    this.#state = setPositions(this.#state, entries);
    this.#persist();
  }

  /** Drops overrides for nodes no longer present in this diagram's current data. */
  prune(existingNodeIds: ReadonlySet<string>): void {
    const next = pruneMissingNodes(this.#state, this.#board, this.#diagram, existingNodeIds);
    if (next === this.#state) return;
    this.#state = next;
    this.#persist();
  }

  /** Drops every override for this diagram (the board's "reset positions" context-menu item). */
  reset(): void {
    const next = resetDiagram(this.#state, this.#board, this.#diagram);
    if (next === this.#state) return;
    this.#state = next;
    this.#persist();
  }

  #persist(): void {
    this.#store?.write(this.#key, this.#state);
    this.#host.requestUpdate();
    window.dispatchEvent(new CustomEvent(LAYOUT_CHANGE_EVENT));
  }

  /** Another diagram instance (or tab) persisted a change: re-read so overrides stay current. */
  #handleChange(): void {
    this.#state = this.#store?.read(this.#key) ?? this.#state;
    this.#host.requestUpdate();
  }
}
