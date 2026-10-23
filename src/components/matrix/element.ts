import { LitElement, html, type PropertyValues } from 'lit';
import { repeat } from 'lit/directives/repeat.js';

import { iconGrip } from '../../core/icons';
import { tokens } from '../../core/theme';
import { placeWithin, type DropPlace } from '../../lib/dom/drag';
import { setCompositeDragImage } from '../../lib/dom/drag-image';
import { reorderAnchor } from '../../lib/reorder';
import {
  allLeaves,
  cellSlot,
  columnHeadSlot,
  CORNER_SLOT,
  CORNER_SUB_SLOT,
  hasSubColumns,
  rowHeadSlot,
  spanOf,
  subColumnEdgeOf,
  subColumnHeadSlot,
  MATRIX_REORDER_COLUMN_EVENT,
  MATRIX_REORDER_ROW_EVENT,
  MATRIX_REORDER_SUB_COLUMN_EVENT,
  type MatrixColumn,
  type MatrixLeaf,
  type MatrixRow,
} from './model';
import { matrixStyles } from './styles';

/** The one drag in flight inside this matrix, as a discriminated union; matrix owns this state itself, so a drag it never started (another host's) is never mistaken for one of its own kinds. */
type InternalDrag =
  | { readonly kind: 'row'; readonly id: string }
  | { readonly kind: 'column'; readonly id: string }
  | { readonly kind: 'subColumn'; readonly columnId: string; readonly id: string };

/**
 * `<dpk-matrix>` — a grid of rows and columns (optionally two-level columns,
 * for a banded group/sub-group header) whose rows, columns and sub-columns
 * can each be dragged to reorder. Every head and cell is the host's own
 * content, placed through a named slot, so it keeps the host's CSS scope and
 * markup; this element only lays the grid out and runs the drag mechanics.
 *
 * Slot names: `corner`, `corner-sub` (only read with two-level columns),
 * `row-head:<rowId>`, `col-head:<columnId>`, `sub-head:<columnId>:<subColumnId>`,
 * `cell:<rowId>:<columnId>` (a plain column) or `cell:<rowId>:<columnId>:<subColumnId>`.
 *
 * A reorder fires its event instead of moving anything itself (`rows`/`columns`
 * stay the host's own data): `dpk-matrix-reorder-row` / `-column` /
 * `-sub-column`, each cancelable, with an `after` anchor (the sibling id it
 * should land after, `null` = first).
 */
export class DpkMatrix extends LitElement {
  static override styles = [tokens, matrixStyles];

  static override properties = {
    rows: { attribute: false },
    columns: { attribute: false },
  };

  declare rows: readonly MatrixRow[];
  declare columns: readonly MatrixColumn[];

  #dragging: InternalDrag | null = null;
  #over: string | null = null;

  constructor() {
    super();
    this.rows = [];
    this.columns = [];
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    // Dragged or hovered ids that no longer exist (the host re-rendered under
    // the drag) drop the stale state rather than keep showing it.
    if (!changed.has('rows') && !changed.has('columns')) return;
    if (this.#dragging && !this.#dragStillExists()) {
      this.#dragging = null;
      this.#over = null;
    }
  }

  #dragStillExists(): boolean {
    const dragging = this.#dragging;
    if (!dragging) return true;
    if (dragging.kind === 'row') return this.rows.some((row) => row.id === dragging.id);
    if (dragging.kind === 'column') return this.columns.some((column) => column.id === dragging.id);
    const column = this.columns.find((candidate) => candidate.id === dragging.columnId);
    return (column?.subColumns ?? []).some((sub) => sub.id === dragging.id);
  }

  /**
   * Native drag-and-drop's "nearest draggable ancestor" search walks the
   * light DOM, not the flattened (slot-including) tree: a pointer-down on a
   * head's slotted content never sees this shadow root's own
   * `draggable="true"` wrapper, so a drag the host's own content should
   * start never does. Every head's actual `draggable` state is mirrored onto
   * whatever the host assigned to that slot instead, kept in sync here
   * (every update) and on `slotchange` (the host swaps its own content
   * without necessarily changing `rows`/`columns`).
   */
  protected override updated(): void {
    this.#syncSlotDraggable();
  }

  #syncSlotDraggable(): void {
    for (const row of this.rows) this.#setSlotDraggable(rowHeadSlot(row.id), row.draggable !== false);
    for (const column of this.columns) {
      this.#setSlotDraggable(columnHeadSlot(column.id), column.draggable !== false);
      for (const sub of column.subColumns ?? []) {
        this.#setSlotDraggable(subColumnHeadSlot(column.id, sub.id), sub.draggable !== false);
      }
    }
  }

  #setSlotDraggable(name: string, draggable: boolean): void {
    const slot = this.renderRoot.querySelector(`slot[name="${name}"]`);
    if (!(slot instanceof HTMLSlotElement)) return;
    for (const assigned of slot.assignedElements({ flatten: true })) {
      if (assigned instanceof HTMLElement) assigned.draggable = draggable;
    }
  }

  /** The grip every draggable row, column and sub-column head shows, so the affordance lives with the mechanics instead of each host drawing its own; a non-draggable head gets none. */
  #renderGrip(draggable: boolean): unknown {
    if (!draggable) return '';
    return html`<span class="matrix-grip" aria-hidden="true">${iconGrip()}</span>`;
  }

  protected override render(): unknown {
    const twoLevel = hasSubColumns(this.columns);
    const leafCount = allLeaves(this.columns).length;
    return html`
      <div class="matrix-scroll">
        <div class="matrix-grid" style=${`--matrix-cols:${leafCount}`}>
          <div class="matrix-head">
            <div class="matrix-row">
              <div class="matrix-corner"><slot name=${CORNER_SLOT}></slot></div>
              ${repeat(
                this.columns,
                (column) => column.id,
                (column) => this.#renderColumnHead(column),
              )}
            </div>
            ${
              twoLevel
                ? html`<div class="matrix-row">
                    <div class="matrix-corner"><slot name=${CORNER_SUB_SLOT}></slot></div>
                    ${repeat(
                      this.columns,
                      (column) => column.id,
                      (column) => this.#renderSubColumnHeadRow(column),
                    )}
                  </div>`
                : ''
            }
          </div>
          ${repeat(
            this.rows,
            (row) => row.id,
            (row) => this.#renderRow(row),
          )}
        </div>
      </div>
    `;
  }

  #renderColumnHead(column: MatrixColumn): unknown {
    const draggable = column.draggable !== false;
    return html`
      <div
        class="matrix-col-head"
        style=${`grid-column: span ${spanOf(column)}`}
        data-column=${column.id}
        draggable=${draggable ? 'true' : 'false'}
        data-col-dragging=${String(this.#columnDragging({ columnId: column.id }))}
        data-col-drop=${this.#columnDrop({ columnId: column.id })}
        @dragstart=${(event: DragEvent) => this.#onColumnDragStart(event, column)}
        @dragend=${() => this.#endDrag()}
        @dragenter=${(event: DragEvent) => this.#onColumnDragOver(event, column)}
        @dragover=${(event: DragEvent) => this.#onColumnDragOver(event, column)}
        @dragleave=${() => this.#onLeave(`column:${column.id}`)}
        @drop=${(event: DragEvent) => this.#onColumnDrop(event, column)}
      >
        ${this.#renderGrip(draggable)}
        <slot name=${columnHeadSlot(column.id)} @slotchange=${() => this.#syncSlotDraggable()}></slot>
      </div>
    `;
  }

  /**
   * A plain column (no `subColumns`) still owns one leaf-wide cell in the
   * sub-head row: without it, CSS Grid auto-placement packs the next
   * column's real sub-heads into this column's slot instead, shifting every
   * sub-head one leaf to the left of where its column actually sits.
   */
  #renderSubColumnHeadRow(column: MatrixColumn): unknown {
    const subs = column.subColumns ?? [];
    if (subs.length === 0) {
      const leaf: MatrixLeaf = { columnId: column.id };
      return html`<div
        class="matrix-sub-head matrix-sub-head-spacer"
        data-column=${column.id}
        data-col-dragging=${String(this.#columnDragging(leaf))}
        data-col-drop=${this.#columnDrop(leaf)}
      ></div>`;
    }
    return html`${repeat(
      subs,
      (sub) => sub.id,
      (sub) => this.#renderSubColumnHead(column, sub),
    )}`;
  }

  #renderSubColumnHead(column: MatrixColumn, sub: { readonly id: string; readonly draggable?: boolean }): unknown {
    const draggable = sub.draggable !== false;
    const leaf: MatrixLeaf = { columnId: column.id, subColumnId: sub.id };
    return html`
      <div
        class="matrix-sub-head"
        data-column=${column.id}
        data-sub-column=${sub.id}
        data-sub-edge=${subColumnEdgeOf(column, sub.id)}
        draggable=${draggable ? 'true' : 'false'}
        data-col-dragging=${String(this.#columnDragging(leaf))}
        data-col-drop=${this.#columnDrop(leaf)}
        @dragstart=${(event: DragEvent) => this.#onSubColumnDragStart(event, column, sub.id)}
        @dragend=${() => this.#endDrag()}
        @dragenter=${(event: DragEvent) => this.#onSubColumnDragOver(event, column, sub.id)}
        @dragover=${(event: DragEvent) => this.#onSubColumnDragOver(event, column, sub.id)}
        @dragleave=${() => this.#onLeave(`sub:${column.id}:${sub.id}`)}
        @drop=${(event: DragEvent) => this.#onSubColumnDrop(event, column, sub.id)}
      >
        ${this.#renderGrip(draggable)}
        <slot name=${subColumnHeadSlot(column.id, sub.id)} @slotchange=${() => this.#syncSlotDraggable()}></slot>
      </div>
    `;
  }

  #renderRow(row: MatrixRow): unknown {
    const draggable = row.draggable !== false;
    return html`
      <div
        class="matrix-row"
        data-row=${row.id}
        data-draggable=${String(draggable)}
        data-row-dragging=${String(this.#dragging?.kind === 'row' && this.#dragging.id === row.id)}
        data-row-drop=${String(this.#over === `row:${row.id}`)}
        @dragenter=${(event: DragEvent) => this.#onRowDragOver(event, row)}
        @dragover=${(event: DragEvent) => this.#onRowDragOver(event, row)}
        @dragleave=${() => this.#onLeave(`row:${row.id}`)}
        @drop=${(event: DragEvent) => this.#onRowDrop(event, row)}
      >
        <div
          class="matrix-row-head"
          draggable=${draggable ? 'true' : 'false'}
          @dragstart=${(event: DragEvent) => this.#onRowDragStart(event, row)}
          @dragend=${() => this.#endDrag()}
        >
          ${this.#renderGrip(draggable)}
          <slot name=${rowHeadSlot(row.id)} @slotchange=${() => this.#syncSlotDraggable()}></slot>
        </div>
        ${repeat(
          allLeaves(this.columns),
          (leaf) => (leaf.subColumnId === undefined ? leaf.columnId : `${leaf.columnId}:${leaf.subColumnId}`),
          (leaf) => this.#renderCell(row, leaf),
        )}
      </div>
    `;
  }

  #renderCell(row: MatrixRow, leaf: MatrixLeaf): unknown {
    return html`
      <div
        class="matrix-cell"
        data-row=${row.id}
        data-column=${leaf.columnId}
        data-sub-column=${leaf.subColumnId ?? ''}
        data-col-dragging=${String(this.#columnDragging(leaf))}
        data-col-drop=${this.#columnDrop(leaf)}
        data-sub-edge=${this.#subEdge(leaf)}
        @dragenter=${(event: DragEvent) => this.#onCellDragOver(event, leaf)}
        @dragover=${(event: DragEvent) => this.#onCellDragOver(event, leaf)}
        @dragleave=${() => this.#onCellDragLeave(leaf)}
        @drop=${(event: DragEvent) => this.#onCellDrop(event, leaf)}
      >
        <slot name=${cellSlot(row.id, leaf)}></slot>
      </div>
    `;
  }

  #subEdge(leaf: MatrixLeaf): string {
    if (leaf.subColumnId === undefined) return '';
    const column = this.columns.find((candidate) => candidate.id === leaf.columnId);
    return column ? subColumnEdgeOf(column, leaf.subColumnId) : '';
  }

  #columnDragging(leaf: MatrixLeaf): boolean {
    const dragging = this.#dragging;
    if (!dragging) return false;
    if (dragging.kind === 'column') return dragging.id === leaf.columnId;
    if (dragging.kind === 'subColumn') return dragging.columnId === leaf.columnId && dragging.id === leaf.subColumnId;
    return false;
  }

  #columnDrop(leaf: MatrixLeaf): 'column' | 'subColumn' | 'none' {
    if (this.#over === `column:${leaf.columnId}`) return 'column';
    if (leaf.subColumnId !== undefined && this.#over === `sub:${leaf.columnId}:${leaf.subColumnId}`) return 'subColumn';
    return 'none';
  }

  #setOver(key: string): void {
    if (this.#over === key) return;
    this.#over = key;
    this.requestUpdate();
  }

  #onLeave(key: string): void {
    if (this.#over !== key) return;
    this.#over = null;
    this.requestUpdate();
  }

  #endDrag(): void {
    if (this.#dragging === null && this.#over === null) return;
    this.#dragging = null;
    this.#over = null;
    this.requestUpdate();
  }

  #emit(type: string, detail: unknown): void {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true, cancelable: true }));
  }

  #placeOf(event: DragEvent): DropPlace {
    const target = event.currentTarget;
    if (!(target instanceof Element)) return 'end';
    return placeWithin(target.getBoundingClientRect(), event.clientY);
  }

  // ------------------------------------------------------------------ row

  #onRowDragStart(event: DragEvent, row: MatrixRow): void {
    if (row.draggable === false) return;
    this.#dragging = { kind: 'row', id: row.id };
    event.dataTransfer?.setData('text/plain', `row:${row.id}`);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
    const head = event.currentTarget instanceof Element ? event.currentTarget : null;
    const rowElement = head?.closest('.matrix-row');
    if (rowElement && event.dataTransfer) {
      const rect = rowElement.getBoundingClientRect();
      event.dataTransfer.setDragImage(rowElement, event.clientX - rect.left, event.clientY - rect.top);
    }
    this.requestUpdate();
  }

  #onRowDragOver(event: DragEvent, row: MatrixRow): void {
    if (row.draggable === false || this.#dragging?.kind !== 'row') return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    this.#setOver(`row:${row.id}`);
  }

  #onRowDrop(event: DragEvent, row: MatrixRow): void {
    const dragging = this.#dragging;
    if (row.draggable === false || dragging?.kind !== 'row') return;
    event.preventDefault();
    const place = this.#placeOf(event);
    const after = reorderAnchor(
      this.rows.map((candidate) => candidate.id),
      dragging.id,
      row.id,
      place,
    );
    this.#endDrag();
    this.#emit(MATRIX_REORDER_ROW_EVENT, { rowId: dragging.id, after });
  }

  // --------------------------------------------------------------- column

  #onColumnDragStart(event: DragEvent, column: MatrixColumn): void {
    if (column.draggable === false) return;
    this.#dragging = { kind: 'column', id: column.id };
    event.dataTransfer?.setData('text/plain', `column:${column.id}`);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
    this.#liftColumn(event, (part) => part.getAttribute('data-column') === column.id);
    this.requestUpdate();
  }

  #onColumnDragOver(event: DragEvent, column: MatrixColumn): void {
    if (column.draggable === false || this.#dragging?.kind !== 'column') return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    this.#setOver(`column:${column.id}`);
  }

  #onColumnDrop(event: DragEvent, column: MatrixColumn): void {
    const dragging = this.#dragging;
    if (column.draggable === false || dragging?.kind !== 'column') return;
    event.preventDefault();
    const place = this.#placeOf(event);
    const after = reorderAnchor(
      this.columns.map((candidate) => candidate.id),
      dragging.id,
      column.id,
      place,
    );
    this.#endDrag();
    this.#emit(MATRIX_REORDER_COLUMN_EVENT, { columnId: dragging.id, after });
  }

  // ----------------------------------------------------------- sub-column

  #onSubColumnDragStart(event: DragEvent, column: MatrixColumn, subColumnId: string): void {
    const sub = (column.subColumns ?? []).find((candidate) => candidate.id === subColumnId);
    if (sub?.draggable === false) return;
    this.#dragging = { kind: 'subColumn', columnId: column.id, id: subColumnId };
    event.dataTransfer?.setData('text/plain', `sub-column:${column.id}:${subColumnId}`);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
    this.#liftColumn(
      event,
      (part) => part.getAttribute('data-column') === column.id && part.getAttribute('data-sub-column') === subColumnId,
    );
    this.requestUpdate();
  }

  #onSubColumnDragOver(event: DragEvent, column: MatrixColumn, subColumnId: string): void {
    const dragging = this.#dragging;
    if (dragging?.kind !== 'subColumn' || dragging.columnId !== column.id) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    this.#setOver(`sub:${column.id}:${subColumnId}`);
  }

  #onSubColumnDrop(event: DragEvent, column: MatrixColumn, subColumnId: string): void {
    const dragging = this.#dragging;
    if (dragging?.kind !== 'subColumn' || dragging.columnId !== column.id) return;
    event.preventDefault();
    const place = this.#placeOf(event);
    const ids = (column.subColumns ?? []).map((sub) => sub.id);
    const after = reorderAnchor(ids, dragging.id, subColumnId, place);
    this.#endDrag();
    this.#emit(MATRIX_REORDER_SUB_COLUMN_EVENT, { columnId: column.id, subColumnId: dragging.id, after });
  }

  // ------------------------------------------------------------------ cell

  /** A cell is both a column's and (when it has one) a sub-column's drop anchor, as every one of its parts stands for the same slot. */
  #onCellDragOver(event: DragEvent, leaf: MatrixLeaf): void {
    const dragging = this.#dragging;
    if (!dragging) return;
    if (dragging.kind === 'column') {
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
      this.#setOver(`column:${leaf.columnId}`);
      return;
    }
    if (dragging.kind === 'subColumn' && leaf.subColumnId !== undefined && dragging.columnId === leaf.columnId) {
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
      this.#setOver(`sub:${leaf.columnId}:${leaf.subColumnId}`);
    }
  }

  #onCellDragLeave(leaf: MatrixLeaf): void {
    this.#onLeave(`column:${leaf.columnId}`);
    if (leaf.subColumnId !== undefined) this.#onLeave(`sub:${leaf.columnId}:${leaf.subColumnId}`);
  }

  #onCellDrop(event: DragEvent, leaf: MatrixLeaf): void {
    const dragging = this.#dragging;
    if (!dragging) return;
    if (dragging.kind === 'column') {
      const column = this.columns.find((candidate) => candidate.id === leaf.columnId);
      if (column) this.#onColumnDrop(event, column);
      return;
    }
    if (dragging.kind === 'subColumn' && leaf.subColumnId !== undefined && dragging.columnId === leaf.columnId) {
      const column = this.columns.find((candidate) => candidate.id === leaf.columnId);
      if (column) this.#onSubColumnDrop(event, column, leaf.subColumnId);
    }
  }

  /**
   * Lifts a whole column (or sub-column) as the drag image, the way a row
   * lifts: every part matching `match` within this matrix's own scroll
   * frame — its heads and every cell under them. The sticky heads go last
   * so they paint over the cells scrolled under them.
   */
  #liftColumn(event: DragEvent, match: (part: Element) => boolean): void {
    const frame = this.renderRoot.querySelector('.matrix-scroll');
    if (!frame) return;
    const parts = [...frame.querySelectorAll('[data-column]')].filter(match);
    const heads = parts.filter(
      (part) => part.classList.contains('matrix-col-head') || part.classList.contains('matrix-sub-head'),
    );
    const cells = parts.filter((part) => !heads.includes(part));
    setCompositeDragImage(event, [...cells, ...heads], frame);
  }
}
