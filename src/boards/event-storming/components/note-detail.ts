import { css, html, LitElement, nothing, type CSSResultGroup, type TemplateResult } from 'lit';

import type { EventStormingMessages } from '../messages';
import type { StickyNote } from '../model';

import { controls, tokens } from '../../../core/theme';
import { onCommit } from '../../../lib/dom/events';
import { notePaletteStyle } from './note-card';

/** What the detail asks of its board: each returns whether a template recorded it. */
export type NoteDetailActions = {
  rename(name: string): boolean;
  describe(description: string): boolean;
};

const detailStyles = css`
  :host {
    display: grid;
    align-content: start;
    gap: 18px;
  }
  .es-detail-field {
    display: grid;
    gap: 7px;
    min-width: 0;
  }
  .es-detail-field > dpk-inline-edit {
    display: block;
    margin: 0 -4px;
  }
  .es-detail-name {
    font-size: 17px;
    font-weight: 700;
    line-height: 1.35;
  }
  .es-detail-type {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 600;
  }
  .es-detail-swatch {
    flex: none;
    width: 16px;
    height: 16px;
    border-radius: 3px;
    background: var(--es-note-bg);
    box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.08);
  }
  .es-detail-value {
    margin: 0;
    font-size: 13px;
  }
  .es-detail-value[data-empty] {
    color: var(--dpk-ink-faint);
  }
  .es-detail-error {
    margin: 0;
    padding: 4px 7px;
    border-radius: var(--dpk-radius-xs);
    background: var(--dpk-accent-soft);
    color: var(--dpk-accent);
    font-size: 11.5px;
    line-height: 1.4;
  }
`;

/**
 * A sticky note's detail, drawn in the side panel: its type, its name and
 * description (edited in place through the board's element actions), and the
 * bounded context it belongs to. A context groups whole slices, so the detail
 * only reads it; the selection bar regroups slices.
 */
export class DpkInternalEventStormingNoteDetail extends LitElement {
  static override styles: CSSResultGroup = [tokens, controls, detailStyles];

  static override properties = {
    note: { attribute: false },
    contextName: { attribute: false },
    messages: { attribute: false },
    actions: { attribute: false },
    failed: { state: true },
  };

  declare note: StickyNote | null;
  /** The name of the bounded context the note belongs to, or `null` when it belongs to none. */
  declare contextName: string | null;
  declare messages: EventStormingMessages | null;
  declare actions: NoteDetailActions | null;
  /** An edit from here that no template recorded. */
  declare failed: boolean;

  constructor() {
    super();
    this.note = null;
    this.contextName = null;
    this.messages = null;
    this.actions = null;
    this.failed = false;
  }

  #record(accepted: boolean | undefined): void {
    this.failed = accepted !== true;
  }

  protected override render(): TemplateResult | typeof nothing {
    const note = this.note;
    const m = this.messages;
    if (note === null || m === null) return nothing;
    return html`
      <section class="es-detail-field">
        <span class="dpk-label">${m.noteTypeField}</span>
        <span class="es-detail-type" style=${notePaletteStyle(note.type)}
          ><span class="es-detail-swatch" aria-hidden="true"></span>${m.noteTypeLabel(note.type)}</span
        >
      </section>
      <section class="es-detail-field">
        <span class="dpk-label">${m.noteNameLabel}</span>
        <dpk-inline-edit
          class="es-detail-name"
          wrap
          .value=${note.name}
          .label=${m.noteNameLabel}
          @dpk-commit=${onCommit((name) => this.#record(this.actions?.rename(name)))}
        ></dpk-inline-edit>
      </section>
      <section class="es-detail-field">
        <span class="dpk-label">${m.noteDescriptionLabel}</span>
        <dpk-inline-edit
          multiline
          .value=${note.description ?? ''}
          .label=${m.noteDescriptionLabel}
          .placeholder=${m.noteDescriptionPlaceholder}
          @dpk-commit=${onCommit((description) => this.#record(this.actions?.describe(description)))}
        ></dpk-inline-edit>
      </section>
      <section class="es-detail-field">
        <span class="dpk-label">${m.noteContextField}</span>
        <p class="es-detail-value" ?data-empty=${this.contextName === null}>${this.contextName ?? m.noContext}</p>
      </section>
      ${this.failed ? html`<p class="es-detail-error" role="alert">${m.notRecorded}</p>` : nothing}
    `;
  }
}

export const defineEsNoteDetail = (): void => {
  if (!customElements.get('dpk-internal-event-storming-note-detail'))
    customElements.define('dpk-internal-event-storming-note-detail', DpkInternalEventStormingNoteDetail);
};
