import { LitElement, html, nothing, type PropertyValues } from 'lit';
import { repeat } from 'lit/directives/repeat.js';

import type { ElementActionResult } from '../../core/element-actions';
import type { CommentTargetOption, DraftAction } from '../../core/types';

import { iconArrowDown, iconArrowUp, iconComment, iconGrip, iconTrash } from '../../core/icons';
import { LocaleController } from '../../core/locale-controller';
import { SelectController } from '../../core/select/controller';
import { createEntityId } from '../../core/target';
import { controls, tokens } from '../../core/theme';
import { observeJsonChild } from '../../lib/dom/base-data';
import { onInputChange } from '../../lib/dom/events';
import { tableMessages, type TableMessages } from './messages';
import {
  ADD_ROW,
  DELETE_ROW,
  emptyTableData,
  INITIAL_VIEW_STATE,
  parseTableData,
  reduceTableActions,
  REORDER_ROW,
  rowTarget,
  SET_CELL,
  tableRowsTarget,
  visibleGroups,
  type SortDirection,
  type TableColumn,
  type TableData,
  type TableGroup,
  type TableRow,
  type TableViewState,
} from './model';
import { tableStyles } from './styles';

const cls = (...entries: readonly (string | false | null | undefined)[]): string =>
  entries.filter((entry) => typeof entry === 'string' && entry.length > 0).join(' ');

/**
 * `<dpk-table>` — a generic table of records with typed columns.
 *
 * Reviewers sort, group and filter the rows in the browser (view-only, never
 * recorded), select a row (`dpk-table-select`), and add, edit, delete or
 * reorder rows: each is a `ADD_ROW` / `SET_CELL` / `DELETE_ROW` / `REORDER_ROW`
 * element action recorded by the hosting template, the same way
 * `dpk-kanban` records a move or a new card. A host template can
 * also drive the table reactively by setting `.data` instead of authoring a
 * JSON child (see `dpk-diagram`'s own `.data` property).
 */
export class DpkTable extends LitElement {
  static override styles = [tokens, controls, tableStyles];

  static override properties = {
    id: { type: String, reflect: true },
    heading: { type: String },
    readonly: { type: Boolean, reflect: true },
    data: { attribute: false },
  };

  declare heading: string | null;
  declare readonly: boolean;
  declare data: TableData | null;

  readonly #i18n = new LocaleController(this);
  readonly #groupBySelect = new SelectController(this);
  #disposeData: (() => void) | null = null;
  #authored: TableData | null = null;
  #error: string | null = null;
  #data: TableData = emptyTableData();
  #elementActions: readonly DraftAction[] = [];
  #results: readonly ElementActionResult[] = [];
  #view: TableViewState = INITIAL_VIEW_STATE;
  #selection: string | null = null;
  #editing: { readonly row: string; readonly column: string } | null = null;
  #dragging: string | null = null;
  #dropBefore: string | null = null;
  /** `'row'` when the last add could not be recorded. */
  #unrecorded: 'row' | null = null;

  constructor() {
    super();
    this.id = this.getAttribute('id') ?? '';
    this.heading = null;
    this.readonly = false;
    this.data = null;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#disposeData = observeJsonChild(this, parseTableData, (result) => {
      if (this.data !== null) return; // a reactive `.data` property wins over the JSON child.
      if (result.ok) {
        this.#authored = result.value;
        this.#error = null;
      } else {
        this.#authored = null;
        this.#error = result.error;
      }
      this.#replay();
      this.dispatchEvent(new CustomEvent('dpk-comment-targets-change', { bubbles: true, composed: true }));
    });
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#disposeData?.();
    this.#disposeData = null;
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has('data') && this.data !== null) {
      this.#authored = this.data;
      this.#error = null;
      this.#replay();
    }
  }

  get commentTargets(): readonly CommentTargetOption[] {
    if (!this.id) return [];
    const group = `${this.#heading} · ${this.id}`;
    return [
      // The table itself, so a hosting template can accept `ADD_ROW` (its target names this
      // collection, not a row — a new row has no target of its own until it exists), the same
      // way `dpk-kanban` lists each column so `ADD_CARD` can target one.
      { value: tableRowsTarget(this.id), label: this.#heading, group },
      ...this.#data.rows.map((row) => ({ value: rowTarget(this.id, row.id), label: this.#rowLabel(row), group })),
    ];
  }

  get elementActions(): readonly DraftAction[] {
    return this.#elementActions;
  }

  set elementActions(actions: readonly DraftAction[]) {
    this.#elementActions = actions;
    this.#replay();
  }

  get elementActionResults(): readonly ElementActionResult[] {
    return this.#results;
  }

  /** The selected row's id, or `null` when none is selected. */
  get selection(): string | null {
    return this.#selection;
  }

  protected override render(): unknown {
    const m = this.#m;
    if (this.#error !== null) return html`<p class="error">${this.#error}</p>`;
    const groups = visibleGroups(this.#data, this.#view);
    const total = this.#data.rows.length;
    const shown = groups.reduce((sum, group) => sum + group.rows.length, 0);
    const reorderable = this.#reorderable();
    return html`
      <div class="head">
        <span class="heading">${this.#heading}</span>
        <span class="count">${m.rowCount(shown, total)}</span>
      </div>
      <div class="toolbar">
        <input
          type="search"
          class="filter"
          placeholder=${m.filterPlaceholder}
          aria-label=${m.filterAriaLabel}
          .value=${this.#view.filter}
          @input=${onInputChange((value) => {
            this.#view = { ...this.#view, filter: value };
            this.requestUpdate();
          })}
        />
        ${
          this.#data.columns.length === 0
            ? nothing
            : html`<label class="group-by">
                <span>${m.groupByLabel}</span>
                ${this.#groupBySelect.render({
                  options: [
                    { value: '', label: m.groupByNone },
                    ...this.#data.columns.map((column) => ({ value: column.id, label: column.label })),
                  ],
                  value: this.#view.groupBy ?? '',
                  onChange: (value) => {
                    this.#view = { ...this.#view, groupBy: value === '' ? null : value };
                    this.requestUpdate();
                  },
                  ariaLabel: m.groupByLabel,
                })}
              </label>`
        }
        ${
          !this.readonly && this.id
            ? html`<button type="button" class="add-row" @click=${() => this.#addRow()}>${m.addRowButton}</button>`
            : nothing
        }
      </div>
      ${this.#unrecorded === 'row' ? html`<p class="error" role="alert">${m.notRecorded}</p>` : nothing}
      ${
        total === 0
          ? html`<p class="empty">${m.empty}</p>`
          : html`<div class="scroll">
              <table>
                <thead>
                  <tr>
                    ${reorderable ? html`<th class="handle-col"></th>` : nothing}
                    ${this.#data.columns.map((column) => this.#renderHeadCell(m, column))}
                    <th class="actions-col"></th>
                  </tr>
                </thead>
                ${groups.map((group) => this.#renderGroup(m, group, reorderable))}
              </table>
            </div>`
      }
    `;
  }

  get #m(): TableMessages {
    return tableMessages(this.#i18n.locale);
  }

  get #heading(): string {
    return this.heading ?? this.#m.heading;
  }

  #reorderable(): boolean {
    return !this.readonly && this.id.length > 0 && this.#view.sort === null && this.#view.groupBy === null;
  }

  #renderHeadCell(m: TableMessages, column: TableColumn): unknown {
    if (!column.sortable) return html`<th>${column.label}</th>`;
    const sort = this.#view.sort;
    const active = sort?.column === column.id;
    return html`<th>
      <button
        type="button"
        class="sort"
        aria-label=${m.sortButtonAriaLabel(column.label)}
        title=${active ? (sort?.direction === 'asc' ? m.sortAscending : m.sortDescending) : ''}
        @click=${() => this.#toggleSort(column.id)}
      >
        <span>${column.label}</span>
        ${active ? html`<span class="sort-icon">${sort?.direction === 'asc' ? iconArrowUp() : iconArrowDown()}</span>` : nothing}
      </button>
    </th>`;
  }

  #toggleSort(columnId: string): void {
    const current = this.#view.sort;
    if (current?.column === columnId && current.direction === 'desc') {
      this.#view = { ...this.#view, sort: null };
    } else {
      const direction: SortDirection = current?.column === columnId && current.direction === 'asc' ? 'desc' : 'asc';
      this.#view = { ...this.#view, sort: { column: columnId, direction } };
    }
    this.requestUpdate();
  }

  #renderGroup(m: TableMessages, group: TableGroup, reorderable: boolean): unknown {
    const span = this.#data.columns.length + 1 + (reorderable ? 1 : 0);
    return html`<tbody
      @dragover=${(event: DragEvent) => this.#onDragOver(event, reorderable)}
      @drop=${(event: DragEvent) => this.#onDrop(event, reorderable)}
    >
      ${
        this.#view.groupBy === null
          ? nothing
          : html`<tr class="group-head">
              <th colspan=${span}>${group.label === '' ? m.groupByNone : group.label} (${group.rows.length})</th>
            </tr>`
      }
      ${repeat(
        group.rows,
        (row) => row.id,
        (row) => this.#renderRow(m, row, reorderable),
      )}
    </tbody>`;
  }

  #renderRow(m: TableMessages, row: TableRow, reorderable: boolean): unknown {
    const selected = this.#selection === row.id;
    return html`<tr
      data-row=${row.id}
      data-grill-questions=${this.#questionsOf(row)}
      class=${cls(selected && 'is-selected', this.#dragging === row.id && 'is-dragging')}
      ?data-drop-before=${this.#dropBefore === row.id}
      tabindex="0"
      role="button"
      aria-pressed=${selected}
      @click=${() => this.#selectRow(row.id)}
      @keydown=${(event: KeyboardEvent) => this.#onRowKey(event, row.id)}
    >
      ${
        reorderable
          ? html`<td
              class="handle"
              draggable="true"
              @click=${(event: Event) => event.stopPropagation()}
              @dragstart=${(event: DragEvent) => this.#onDragStart(event, row.id)}
              @dragend=${() => this.#endDrag()}
            >
              ${iconGrip()}
            </td>`
          : nothing
      }
      ${this.#data.columns.map((column) => this.#renderCell(row, column))}
      <td class="row-actions">
        ${
          this.id
            ? html`<button
                type="button"
                class="comment"
                aria-label=${m.commentAriaLabel(this.#rowLabel(row))}
                title=${m.commentAriaLabel(this.#rowLabel(row))}
                @click=${(event: Event) => {
                  event.stopPropagation();
                  this.#requestComment(row.id);
                }}
              >
                ${iconComment()}
              </button>`
            : nothing
        }
        ${
          !this.readonly && this.id
            ? html`<button
                type="button"
                class="delete"
                aria-label=${m.deleteRowAriaLabel(this.#rowLabel(row))}
                title=${m.deleteRowAriaLabel(this.#rowLabel(row))}
                @click=${(event: Event) => {
                  event.stopPropagation();
                  this.#deleteRow(row);
                }}
              >
                ${iconTrash()}
              </button>`
            : nothing
        }
      </td>
    </tr>`;
  }

  #renderCell(row: TableRow, column: TableColumn): unknown {
    const cell = row.cells[column.id];
    if (cell === undefined) return html`<td></td>`;
    switch (cell.type) {
      case 'text':
        return this.#renderEditableCell(row, column, cell.value ?? '');
      case 'number':
        return this.#renderEditableCell(row, column, cell.value === null ? '' : String(cell.value));
      case 'tag':
        return html`<td>
          <div class="tags">${cell.value.map((tag) => html`<span class="tag">${tag}</span>`)}</div>
        </td>`;
      case 'status':
        return html`<td>
          ${cell.value ? html`<span class="status" data-tone=${cell.value.tone}>${cell.value.label}</span>` : nothing}
        </td>`;
      case 'person':
        return html`<td>${cell.value ? html`<span class="person">${cell.value}</span>` : nothing}</td>`;
    }
  }

  #renderEditableCell(row: TableRow, column: TableColumn, text: string): unknown {
    if (this.readonly || !this.id) return html`<td>${text}</td>`;
    const editing = this.#editing?.row === row.id && this.#editing.column === column.id;
    if (!editing) {
      return html`<td @dblclick=${() => this.#startEditing(row.id, column.id)}>${text}</td>`;
    }
    return html`<td class="editing" @click=${(event: Event) => event.stopPropagation()}>
      <input
        class="cell-input"
        type=${column.type === 'number' ? 'number' : 'text'}
        .value=${text}
        @keydown=${(event: KeyboardEvent) => this.#onCellKey(event)}
        @blur=${(event: Event) => this.#commitCell(row, column, event)}
      />
    </td>`;
  }

  #startEditing(rowId: string, columnId: string): void {
    this.#editing = { row: rowId, column: columnId };
    this.requestUpdate();
    void this.updateComplete.then(() => {
      const input = this.renderRoot.querySelector<HTMLInputElement>('.cell-input');
      input?.focus();
      input?.select();
    });
  }

  #onCellKey(event: KeyboardEvent): void {
    if (event.isComposing) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      this.#editing = null;
      this.requestUpdate();
    } else if (event.key === 'Enter' && event.currentTarget instanceof HTMLInputElement) {
      event.preventDefault();
      event.currentTarget.blur();
    }
  }

  #commitCell(row: TableRow, column: TableColumn, event: Event): void {
    if (!(event.target instanceof HTMLInputElement)) return;
    this.#editing = null;
    const raw = event.target.value;
    if (column.type === 'number') {
      const value = raw.trim() === '' ? null : Number(raw);
      if (value !== null && Number.isNaN(value)) {
        this.requestUpdate();
        return;
      }
      this.#dispatch(SET_CELL, rowTarget(this.id, row.id), { column: column.id, value });
    } else {
      this.#dispatch(SET_CELL, rowTarget(this.id, row.id), { column: column.id, value: raw });
    }
    this.requestUpdate();
  }

  #addRow(): void {
    if (!this.id) return;
    const existing = new Set(this.#data.rows.map((row) => row.id));
    const id = createEntityId('row', existing);
    const accepted = this.#dispatch(ADD_ROW, tableRowsTarget(this.id), { id, cells: {} });
    this.#unrecorded = accepted ? null : 'row';
    if (accepted) this.#selection = id;
    this.requestUpdate();
  }

  #deleteRow(row: TableRow): void {
    if (!this.id) return;
    this.#dispatch(DELETE_ROW, rowTarget(this.id, row.id), {});
    if (this.#selection === row.id) this.#selection = null;
  }

  #selectRow(rowId: string): void {
    this.#selection = rowId;
    this.requestUpdate();
    this.dispatchEvent(new CustomEvent('dpk-table-select', { detail: { id: rowId }, bubbles: true, composed: true }));
  }

  #onRowKey(event: KeyboardEvent, rowId: string): void {
    if (event.target !== event.currentTarget) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.#selectRow(rowId);
    }
  }

  #requestComment(rowId: string): void {
    this.dispatchEvent(
      new CustomEvent('dpk-comment-request', {
        detail: { target: rowTarget(this.id, rowId) },
        bubbles: true,
        composed: true,
      }),
    );
  }

  #onDragStart(event: DragEvent, rowId: string): void {
    if (!this.#reorderable()) return;
    this.#dragging = rowId;
    event.dataTransfer?.setData('text/plain', rowId);
  }

  #onDragOver(event: DragEvent, reorderable: boolean): void {
    if (!reorderable || this.#dragging === null) return;
    event.preventDefault();
    const before = this.#dropBeforeAt(event);
    if (before === this.#dropBefore) return;
    this.#dropBefore = before;
    this.requestUpdate();
  }

  #onDrop(event: DragEvent, reorderable: boolean): void {
    const id = this.#dragging;
    if (!reorderable || id === null || !this.id) return;
    event.preventDefault();
    const before = this.#dropBeforeAt(event);
    this.#endDrag();
    if (before === id) return;
    const rows = this.#data.rows;
    const currentIndex = rows.findIndex((row) => row.id === id);
    const beforeIndex = before === null ? rows.length : rows.findIndex((row) => row.id === before);
    if (currentIndex === beforeIndex || currentIndex + 1 === beforeIndex) return;
    this.#dispatch(REORDER_ROW, rowTarget(this.id, id), { before });
  }

  #endDrag(): void {
    if (this.#dragging === null && this.#dropBefore === null) return;
    this.#dragging = null;
    this.#dropBefore = null;
    this.requestUpdate();
  }

  #dropBeforeAt(event: DragEvent): string | null {
    const list = event.currentTarget;
    const rows = list instanceof HTMLElement ? [...list.querySelectorAll<HTMLElement>('[data-row]')] : [];
    const below = rows.find((rowElement) => {
      if (rowElement.dataset['row'] === this.#dragging) return false;
      const box = rowElement.getBoundingClientRect();
      return event.clientY < box.top + box.height / 2;
    });
    return below?.dataset['row'] ?? null;
  }

  #rowLabel(row: TableRow): string {
    for (const column of this.#data.columns) {
      const cell = row.cells[column.id];
      if (cell?.type === 'text' && cell.value) return cell.value;
      if (cell?.type === 'person' && cell.value) return cell.value;
    }
    return row.id;
  }

  /**
   * `data-grill-questions` for a rendered row, or `nothing` when it carries no
   * references. The shell's grill (ADR 20261016_grill-in-core) places a badge
   * per reference; it reaches into this shadow root to find them.
   */
  #questionsOf(row: TableRow): string | typeof nothing {
    const value = row.questions?.trim();
    return value === undefined || value === '' ? nothing : value;
  }

  #dispatch(type: string, target: string, payload: unknown): boolean {
    const event = new CustomEvent('dpk-element-action', {
      detail: { type, target, payload },
      bubbles: true,
      composed: true,
      cancelable: true,
    });
    this.dispatchEvent(event);
    return event.defaultPrevented;
  }

  #replay(): void {
    if (this.#authored === null) {
      this.#data = emptyTableData();
      this.#results = this.#elementActions.map((action) => ({
        id: action.id,
        title: action.type,
        stale: 'target-missing',
      }));
    } else {
      const replayed = reduceTableActions(this.#m, this.#authored, this.#elementActions);
      this.#data = replayed.data;
      this.#results = replayed.results;
    }
    if (this.#selection !== null && !this.#data.rows.some((row) => row.id === this.#selection)) {
      this.#selection = null;
    }
    this.requestUpdate();
  }
}
