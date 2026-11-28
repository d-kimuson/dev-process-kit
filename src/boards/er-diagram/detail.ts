import { css, html, LitElement, nothing, type CSSResultGroup, type TemplateResult } from 'lit';

import type { ErDiagramMessages } from './messages';

import { iconDiamond, iconKey, iconLink, iconPencil, iconPlus, iconTrash } from '../../core/icons';
import { SelectController } from '../../core/select/controller';
import { controls, tokens } from '../../core/theme';
import { revealWithin } from '../../lib/dom/scroll';
import {
  CARDINALITIES,
  cardinalityText,
  constraintText,
  type ErFieldDiff,
  type ErRelation,
  type ErTableDiff,
} from './model';
import {
  columnIcon,
  editorVerdict,
  fieldDetail,
  typeMenu,
  type CardinalityEditor,
  type ColumnEditor,
  type ColumnIcon,
} from './view';

/** What the side panel shows for the ER board's selection. */
export type ErDetailView =
  | {
      readonly kind: 'table';
      readonly table: ErTableDiff;
      /** Whether a change can be recorded (the board has an id). */
      readonly recordable: boolean;
      /** The control to focus once drawn: the one whose column form was just closed. */
      readonly returnTo: string | null;
    }
  | {
      readonly kind: 'column';
      readonly table: ErTableDiff;
      readonly editor: ColumnEditor;
      readonly types: readonly string[];
      /** How many relations a delete takes with it; `null` when the column cannot be deleted. */
      readonly deleteRelations: number | null;
    }
  | {
      readonly kind: 'relation';
      readonly relation: ErRelation;
      /** `null` when the relation's cardinality cannot be recorded. */
      readonly cardinality: CardinalityEditor | null;
    };

/** What one input of the column form changes. */
export type ColumnPatch = {
  readonly name?: string;
  readonly type?: string;
  readonly nullable?: boolean;
  readonly description?: string;
};

/** What the detail asks of its board, which owns the draft and the column form's input. */
export type ErDetailActions = {
  openColumn(editor: ColumnEditor): void;
  /** Merged into the open form's input. */
  change(patch: ColumnPatch): void;
  submit(): void;
  /** Cancel throws the input away; Escape keeps it for the next time the same form opens. */
  close(discard: boolean): void;
  deleteColumn(table: string, field: string): void;
  pickCardinality(value: string): void;
};

const SYMBOLS = { same: '', added: '+', removed: '−', changed: '~' } as const;

const ICONS: Record<ColumnIcon, () => TemplateResult> = {
  primary: iconKey,
  foreign: iconLink,
  'not-null': iconDiamond,
  nullable: iconDiamond,
};

/** The control in a table's detail that opens a column form: `add`, or the column's id. */
export const columnControl = (editor: ColumnEditor): string => (editor.kind === 'add' ? 'add' : editor.field);

export const blankColumn = (table: string): ColumnEditor => ({
  kind: 'add',
  table,
  name: '',
  type: '',
  nullable: false,
  description: '',
  failed: false,
});

export const columnOf = (table: string, field: ErFieldDiff): ColumnEditor => ({
  kind: 'edit',
  table,
  field: field.id,
  type: field.type,
  nullable: field.nullable,
  description: field.description ?? '',
  failed: false,
});

const detailStyles = css`
  :host {
    display: grid;
    align-content: start;
    gap: 16px;
    font-size: 12.5px;
  }
  .er-detail-meta {
    display: grid;
    grid-template-columns: max-content minmax(0, 1fr);
    gap: 6px 14px;
    margin: 0;
  }
  .er-detail-meta dt {
    color: var(--dpk-ink-faint);
    font-size: 11.5px;
  }
  .er-detail-meta dd {
    min-width: 0;
    margin: 0;
    overflow-wrap: anywhere;
  }
  .er-detail-meta del {
    color: var(--dpk-ink-faint);
  }
  .er-detail-section {
    display: grid;
    gap: 7px;
    min-width: 0;
  }
  .er-detail-list {
    display: grid;
    gap: 2px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .er-detail-column {
    display: grid;
    grid-template-columns: 12px 16px minmax(0, 1fr) auto 28px;
    align-items: center;
    gap: 6px;
    min-height: 30px;
    padding: 2px 4px 2px 6px;
    border-radius: var(--dpk-radius-xs);
  }
  .er-detail-column:hover {
    background: var(--dpk-paper-sunken);
  }
  .er-detail-column.is-added {
    background: color-mix(in srgb, var(--dpk-green) 9%, transparent);
  }
  .er-detail-column.is-removed {
    color: var(--dpk-ink-faint);
    text-decoration: line-through;
  }
  .er-detail-column.is-changed {
    background: color-mix(in srgb, var(--dpk-amber) 11%, transparent);
  }
  .er-detail-mark {
    color: var(--dpk-ink-faint);
    font-family: var(--dpk-mono);
    text-align: center;
  }
  .er-detail-name {
    min-width: 0;
    overflow-wrap: anywhere;
    font-family: var(--dpk-mono);
    font-size: 11.5px;
  }
  .er-detail-type {
    color: var(--dpk-ink-soft);
    font-family: var(--dpk-mono);
    font-size: 11px;
    text-align: right;
  }
  .er-detail-column .dpk-icon-btn {
    width: 26px;
    height: 26px;
  }
  .er-detail-description {
    grid-column: 3 / -1;
    margin: 0;
    color: var(--dpk-ink-soft);
    font-size: 11.5px;
  }
  .er-detail-constraints {
    display: grid;
    gap: 4px;
    margin: 0;
    padding: 0;
    list-style: none;
    font-family: var(--dpk-mono);
    font-size: 11px;
  }
  .er-detail-add {
    justify-self: start;
  }
  .er-icon {
    display: grid;
    place-items: center;
    width: 16px;
    color: var(--dpk-ink-faint);
  }
  .er-icon svg {
    width: 13px;
    height: 13px;
  }
  .er-icon:is([data-icon='primary'], [data-icon='foreign']) {
    color: var(--dpk-blue);
  }
  .er-icon[data-icon='not-null'] {
    color: var(--dpk-ink-soft);
  }
  .er-icon[data-icon='not-null'] svg {
    fill: currentColor;
  }
  .er-editor {
    display: grid;
    gap: 12px;
  }
  .er-editor-field {
    display: grid;
    gap: 4px;
    min-width: 0;
  }
  .er-editor-field .dpk-input {
    font-family: var(--dpk-mono);
    font-size: 12px;
  }
  .er-editor-field .dpk-input[aria-invalid='true'] {
    border-color: var(--dpk-accent);
  }
  .er-type-options {
    display: grid;
    gap: 1px;
    max-height: 200px;
    margin: 4px 0 0;
    padding: 4px;
    overflow-y: auto;
    overscroll-behavior: contain;
    border: 1px solid var(--dpk-rule-strong);
    border-radius: var(--dpk-radius-sm);
    background: var(--dpk-paper-raised);
    list-style: none;
  }
  .er-type-options [role='option'] {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    padding: 4px 8px;
    border-radius: var(--dpk-radius-xs);
    color: var(--dpk-ink-soft);
    font-size: 11.5px;
    cursor: pointer;
  }
  .er-type-options [role='option']:hover,
  .er-type-options [role='option'][aria-selected='true'] {
    background: var(--dpk-paper-sunken);
    color: var(--dpk-ink);
  }
  .er-type-options code {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: var(--dpk-mono);
  }
  .er-type-options [data-kind='new'] .er-icon {
    color: var(--dpk-green);
  }
  .er-type-option-hint {
    flex: none;
    margin-left: auto;
    padding-left: 8px;
    color: var(--dpk-ink-faint);
    font-size: 10.5px;
  }
  .er-editor-check {
    display: flex;
    align-items: center;
    gap: 6px;
    width: fit-content;
    color: var(--dpk-ink-soft);
    cursor: pointer;
  }
  .er-editor-check input {
    width: 14px;
    height: 14px;
    margin: 0;
    accent-color: var(--dpk-blue);
    cursor: pointer;
  }
  .er-editor-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
  }
  .er-editor-actions-right {
    display: flex;
    gap: 6px;
    margin-left: auto;
  }
  .er-editor-note,
  .er-error {
    margin: 0;
    font-size: 11.5px;
    line-height: 1.45;
  }
  .er-editor-note {
    color: var(--dpk-accent);
  }
  .er-error {
    padding: 5px 8px;
    border-radius: var(--dpk-radius-xs);
    background: var(--dpk-accent-soft);
    color: var(--dpk-accent);
  }
`;

/**
 * The ER board's selection in the side panel: a table with its columns, a
 * column's form (new or existing), or a relation with its cardinality. The
 * board holds the form's input, so what is half typed survives a selection
 * that moves away and back; the type list is this element's own.
 */
export class DpkInternalErDiagramDetail extends LitElement {
  static override styles: CSSResultGroup = [tokens, controls, detailStyles];

  static override properties = {
    view: { attribute: false },
    messages: { attribute: false },
    actions: { attribute: false },
    typeList: { state: true },
  };

  declare view: ErDetailView | null;
  declare messages: ErDiagramMessages | null;
  declare actions: ErDetailActions | null;
  /** The type input's list: null while closed; else where the arrow keys moved the highlight ({@link typeMenu}). */
  declare typeList: { readonly moved: number | null } | null;

  readonly #cardinalitySelect = new SelectController(this);

  constructor() {
    super();
    this.view = null;
    this.messages = null;
    this.actions = null;
    this.typeList = null;
  }

  protected override firstUpdated(): void {
    const view = this.view;
    if (view?.kind === 'column') {
      const input = this.renderRoot.querySelector<HTMLInputElement>(
        `[data-input="${view.editor.kind === 'add' ? 'add-name' : 'edit-type'}"]`,
      );
      input?.focus({ preventScroll: true });
      input?.select();
    } else if (view?.kind === 'table' && view.returnTo !== null) {
      this.renderRoot
        .querySelector<HTMLElement>(`[data-column-control="${CSS.escape(view.returnTo)}"]`)
        ?.focus({ preventScroll: true });
    }
  }

  protected override render(): TemplateResult | typeof nothing {
    const view = this.view;
    const m = this.messages;
    if (view === null || m === null) return nothing;
    switch (view.kind) {
      case 'table':
        return this.#renderTable(view.table, view.recordable, m);
      case 'column':
        return this.#renderColumn(view, m);
      case 'relation':
        return this.#renderRelation(view.relation, view.cardinality, m);
    }
  }

  #renderIcon(icon: ColumnIcon, m: ErDiagramMessages): TemplateResult {
    return html`<span class="er-icon" data-icon=${icon} role="img" aria-label=${m.columnRole(icon)}
      >${ICONS[icon]()}</span
    >`;
  }

  #renderTable(table: ErTableDiff, recordable: boolean, m: ErDiagramMessages): TemplateResult {
    const editable = recordable && table.status !== 'removed';
    return html`
      <dl class="er-detail-meta">
        <dt>${m.tableNameLabel}</dt>
        <dd>${table.name}</dd>
        <dt>${m.statusHeading}</dt>
        <dd>${m.statusLabel(table.status)}</dd>
        ${
          table.boundedContext === null
            ? nothing
            : html`<dt>${m.boundedContextLabel}</dt>
                <dd>${table.boundedContext}</dd>`
        }
        ${
          table.aggregate === null
            ? nothing
            : html`<dt>${m.aggregateLabel}</dt>
                <dd>${table.aggregate}</dd>`
        }
        ${
          table.pattern === null
            ? nothing
            : html`<dt>${m.patternHeading}</dt>
                <dd>${m.patternLabel(table.pattern)}</dd>`
        }
      </dl>
      <section class="er-detail-section">
        <span class="dpk-label">${m.columnsLabel}</span>
        <ul class="er-detail-list">
          ${table.fields.map((field) => this.#renderColumnRow(table, field, editable, m))}
        </ul>
        ${
          editable
            ? html`<button
                type="button"
                class="dpk-btn er-detail-add"
                data-action="add-field"
                data-column-control="add"
                @click=${() => this.actions?.openColumn(blankColumn(table.id))}
              >
                ${iconPlus()}<span>${m.addFieldButton}</span>
              </button>`
            : nothing
        }
      </section>
      ${
        table.constraints.length === 0
          ? nothing
          : html`<section class="er-detail-section">
              <span class="dpk-label">${m.tableConstraintsLabel}</span>
              <ul class="er-detail-constraints">
                ${table.constraints.map((constraint) => html`<li>${constraintText(constraint)}</li>`)}
              </ul>
            </section>`
      }
    `;
  }

  #renderColumnRow(table: ErTableDiff, field: ErFieldDiff, editable: boolean, m: ErDiagramMessages): TemplateResult {
    return html`<li
      class="er-detail-column is-${field.status}"
      data-field=${field.id}
      title=${[m.statusLabel(field.status), fieldDetail(field, m, true)].join(' / ')}
    >
      <span class="er-detail-mark" aria-hidden="true">${SYMBOLS[field.status]}</span>
      ${this.#renderIcon(columnIcon(field), m)}
      <span class="er-detail-name">${field.id}</span>
      <span class="er-detail-type">${field.type}</span>
      ${
        editable && field.status !== 'removed'
          ? html`<button
              type="button"
              class="dpk-icon-btn"
              data-action="edit-field"
              data-field=${field.id}
              data-column-control=${field.id}
              aria-label=${m.editFieldButton(field.id)}
              title=${m.editFieldButton(field.id)}
              @click=${() => this.actions?.openColumn(columnOf(table.id, field))}
            >
              ${iconPencil()}
            </button>`
          : html`<span></span>`
      }
      ${field.description === null ? nothing : html`<p class="er-detail-description">${field.description}</p>`}
    </li>`;
  }

  #renderColumn(view: Extract<ErDetailView, { kind: 'column' }>, m: ErDiagramMessages): TemplateResult {
    const { editor, table, deleteRelations } = view;
    const verdict = editorVerdict(editor, table);
    return html`<div
      class="er-editor"
      data-kind=${editor.kind}
      @keydown=${(event: KeyboardEvent) => this.#onKey(event)}
    >
      ${
        editor.kind === 'add'
          ? html`<label class="er-editor-field">
              <span class="dpk-label">${m.columnNameLabel}</span>
              <input
                class="dpk-input"
                data-input="add-name"
                autocomplete="off"
                spellcheck="false"
                aria-invalid=${verdict.issue === 'name-taken' ? 'true' : 'false'}
                placeholder=${m.columnNamePlaceholder}
                .value=${editor.name}
                @input=${(event: Event) => {
                  const input = event.currentTarget;
                  if (input instanceof HTMLInputElement) this.actions?.change({ name: input.value });
                }}
              />
            </label>`
          : nothing
      }
      ${this.#renderTypeField(view, m)}
      <label class="er-editor-field">
        <span class="dpk-label">${m.columnDescriptionLabel}</span>
        <input
          class="dpk-input"
          data-input="description"
          autocomplete="off"
          spellcheck="false"
          placeholder=${m.columnDescriptionPlaceholder}
          .value=${editor.description}
          @input=${(event: Event) => {
            const input = event.currentTarget;
            if (input instanceof HTMLInputElement) this.actions?.change({ description: input.value });
          }}
        />
      </label>
      <label class="er-editor-check">
        <input
          type="checkbox"
          data-input="nullable"
          .checked=${editor.nullable}
          @change=${(event: Event) => {
            const input = event.currentTarget;
            if (input instanceof HTMLInputElement) this.actions?.change({ nullable: input.checked });
          }}
        />
        <span>${m.columnNullable}</span>
      </label>
      ${verdict.issue === 'name-taken' ? html`<p class="er-editor-note" role="status">${m.columnNameTaken}</p>` : nothing}
      ${
        deleteRelations === null || deleteRelations === 0
          ? nothing
          : html`<p class="er-editor-note" role="status">${m.deleteFieldRelationsNote(deleteRelations)}</p>`
      }
      ${editor.failed ? html`<p class="er-error" role="alert">${m.notRecorded}</p>` : nothing}
      <div class="er-editor-actions">
        ${
          editor.kind === 'edit' && deleteRelations !== null
            ? html`<button
                type="button"
                class="dpk-btn dpk-btn--danger"
                data-action="delete-column"
                @click=${() => this.actions?.deleteColumn(editor.table, editor.field)}
              >
                ${iconTrash()}<span>${m.deleteFieldTitle}</span>
              </button>`
            : nothing
        }
        <div class="er-editor-actions-right">
          <button
            type="button"
            class="dpk-btn dpk-btn--ghost"
            data-action="cancel-column"
            data-dpk-text-discard
            @click=${() => this.actions?.close(true)}
          >
            ${m.cancel}
          </button>
          <button
            type="button"
            class="dpk-btn dpk-btn--accent"
            data-action="submit-column"
            ?disabled=${!verdict.ready}
            @click=${() => this.actions?.submit()}
          >
            ${editor.kind === 'add' ? m.columnAdd : m.columnSave}
          </button>
        </div>
      </div>
    </div>`;
  }

  /**
   * The type input as a combobox: a click, typing or an arrow key opens its
   * list of the schema's types, narrowed as it is typed, with what was typed
   * offered as a new type. Enter or a click takes one; Enter on the type
   * already in the input confirms the form instead. Escape closes the list
   * before the form.
   */
  #renderTypeField(view: Extract<ErDetailView, { kind: 'column' }>, m: ErDiagramMessages): TemplateResult {
    const { editor } = view;
    const list = this.typeList;
    const menu = list === null ? null : typeMenu(view.types, editor.type, list.moved);
    const expanded = menu !== null && menu.options.length > 0;
    const optionId = (index: number): string => `er-type-option-${index}`;
    return html`<div>
      <label class="er-editor-field">
        <span class="dpk-label">${m.addFieldType}</span>
        <input
          class="dpk-input"
          data-input=${editor.kind === 'add' ? 'add-type' : 'edit-type'}
          role="combobox"
          aria-autocomplete="list"
          aria-controls="er-type-options"
          aria-expanded=${String(expanded)}
          aria-activedescendant=${expanded ? optionId(menu.active) : nothing}
          autocomplete="off"
          spellcheck="false"
          placeholder=${m.columnTypePlaceholder}
          .value=${editor.type}
          @click=${() => {
            this.typeList ??= { moved: null };
          }}
          @blur=${() => {
            this.typeList = null;
          }}
          @input=${(event: Event) => {
            const input = event.currentTarget;
            if (!(input instanceof HTMLInputElement)) return;
            this.typeList = { moved: null };
            this.actions?.change({ type: input.value });
          }}
          @keydown=${(event: KeyboardEvent) => this.#onTypeKey(event, view)}
        />
      </label>
      ${
        expanded
          ? html`<ul id="er-type-options" class="er-type-options" role="listbox" aria-label=${m.columnTypeChoices}>
              ${menu.options.map(
                (option, index) =>
                  html`<li
                    id=${optionId(index)}
                    role="option"
                    data-type=${option.type}
                    data-kind=${option.kind}
                    aria-selected=${String(index === menu.active)}
                    @pointerdown=${(event: PointerEvent) => event.preventDefault()}
                    @click=${() => this.#pickType(option.type)}
                  >
                    ${option.kind === 'new' ? html`<span class="er-icon" aria-hidden="true">${iconPlus()}</span>` : nothing}
                    <code>${option.type}</code>
                    ${option.kind === 'new' ? html`<span class="er-type-option-hint">${m.columnTypeNew}</span>` : nothing}
                  </li>`,
              )}
            </ul>`
          : nothing
      }
    </div>`;
  }

  #onTypeKey(event: KeyboardEvent, view: Extract<ErDetailView, { kind: 'column' }>): void {
    const { editor } = view;
    const list = this.typeList;
    if (event.isComposing) return;
    const menu = list === null ? null : typeMenu(view.types, editor.type, list.moved);
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp':
        event.preventDefault();
        this.typeList =
          menu === null || menu.options.length === 0
            ? { moved: null }
            : { moved: menu.active + (event.key === 'ArrowDown' ? 1 : -1) };
        void this.updateComplete.then(() => {
          const options = this.renderRoot.querySelector('.er-type-options');
          const active = options?.querySelector('[aria-selected="true"]');
          if (options && active) revealWithin(options, active);
        });
        return;
      case 'Enter': {
        const option = menu?.options[menu.active];
        // The type already in the input: Enter goes on to confirm the form.
        if (option === undefined || option.type === editor.type.trim()) {
          this.typeList = null;
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        this.#pickType(option.type);
        return;
      }
      case 'Escape':
        if (list === null) return;
        event.preventDefault();
        event.stopPropagation();
        this.typeList = null;
        return;
    }
  }

  #pickType(type: string): void {
    this.typeList = null;
    this.actions?.change({ type });
  }

  #onKey(event: KeyboardEvent): void {
    if (event.isComposing || this.view?.kind !== 'column') return;
    const editor = this.view.editor;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.actions?.close(false);
      return;
    }
    if (event.key !== 'Enter' || !(event.target instanceof HTMLInputElement) || event.target.type === 'checkbox')
      return;
    event.preventDefault();
    // Enter on a new column's name moves on to its type until one is typed.
    if (editor.kind === 'add' && event.target.dataset['input'] === 'add-name' && editor.type.trim() === '') {
      this.renderRoot.querySelector<HTMLInputElement>('[data-input="add-type"]')?.focus();
      return;
    }
    this.actions?.submit();
  }

  #renderRelation(relation: ErRelation, cardinality: CardinalityEditor | null, m: ErDiagramMessages): TemplateResult {
    const before = relation.before;
    return html`
      <dl class="er-detail-meta">
        <dt>${m.relationFromLabel}</dt>
        <dd><code>${relation.from}.${relation.sourceField}</code></dd>
        <dt>${m.relationToLabel}</dt>
        <dd><code>${relation.to}.${relation.targetField}</code></dd>
        <dt>${m.statusHeading}</dt>
        <dd>${m.statusLabel(relation.status)}</dd>
        ${
          relation.label === null && (before?.label ?? null) === null
            ? nothing
            : html`<dt>${m.relationLabelHeading}</dt>
                <dd>
                  ${
                    before !== null && before.label !== relation.label && before.label !== null
                      ? html`<del>${before.label}</del> `
                      : nothing
                  }${relation.label ?? ''}
                </dd>`
        }
        ${
          cardinality === null
            ? html`<dt>${m.cardinalityLabel}</dt>
                <dd>${cardinalityText(relation.cardinality)}</dd>`
            : nothing
        }
        ${
          before !== null && cardinalityText(before.cardinality) !== cardinalityText(relation.cardinality)
            ? html`<dt>${m.previousCardinalityLabel}</dt>
                <dd>${cardinalityText(before.cardinality)}</dd>`
            : nothing
        }
      </dl>
      ${
        cardinality === null
          ? nothing
          : html`<label class="er-editor-field er-cardinality-field">
                <span class="dpk-label">${m.cardinalityLabel}</span>
                ${this.#cardinalitySelect.render({
                  options: CARDINALITIES.map((value) => ({ value, label: value.replace(':', ' : ') })),
                  value: cardinality.cardinality,
                  ariaLabel: m.cardinalityLabel,
                  onChange: (value) => this.actions?.pickCardinality(value),
                })}
              </label>
              ${cardinality.failed ? html`<p class="er-error" role="alert">${m.notRecorded}</p>` : nothing}`
      }
    `;
  }
}

export const defineErDetail = (): void => {
  if (!customElements.get('dpk-internal-er-diagram-detail'))
    customElements.define('dpk-internal-er-diagram-detail', DpkInternalErDiagramDetail);
};
