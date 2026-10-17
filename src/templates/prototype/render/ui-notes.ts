import { html, nothing, type TemplateResult } from 'lit';

import type { PrototypeMessages } from '../messages';
import type { UiNoteBadge } from '../present';

import { iconClose, iconNote, iconPencil, iconTrash } from '../../../core/icons';

/** The note being rewritten in the open list, with its unsaved text. */
export type UiNoteEdit = { readonly noteId: string; readonly body: string };

export type UiNotesView = {
  /** The notes kept on the elements on screen: none in the app view, which is the product alone. */
  readonly badges: readonly UiNoteBadge[];
  /** The badge whose notes are open. */
  readonly open: UiNoteBadge | null;
  readonly toggle: (badge: UiNoteBadge) => void;
  readonly close: () => void;
  readonly remove: (badge: UiNoteBadge, noteId: string) => void;
  readonly editing: UiNoteEdit | null;
  readonly edit: (noteId: string, body: string) => void;
  readonly input: (body: string) => void;
  readonly save: () => void;
  readonly cancel: () => void;
};

/** Which element a badge sits on: the same key names its open list. */
export const uiNoteBadgeKey = (badge: Pick<UiNoteBadge, 'previewId' | 'selector'>): string =>
  `${badge.previewId}/${badge.selector}`;

/**
 * A badge on the top-left corner of every element that has notes, drawn over
 * the canvas. The element positions them, since only it can measure the
 * author's markup; while the reader comments on the UI, the catcher sheet
 * lies over them, so a click picks the element instead.
 */
export const renderUiNoteBadges = (m: PrototypeMessages, view: UiNotesView): TemplateResult | typeof nothing => {
  if (view.badges.length === 0) return nothing;
  return html`<div class="ui-notes">
    ${view.badges.map((badge) => {
      const open = view.open !== null && uiNoteBadgeKey(view.open) === uiNoteBadgeKey(badge);
      return html`<button
        class="ui-note-badge"
        type="button"
        hidden
        data-preview=${badge.previewId}
        data-selector=${badge.selector}
        data-key=${uiNoteBadgeKey(badge)}
        aria-label=${m.uiNotesOn(badge.label)}
        aria-expanded=${open ? 'true' : 'false'}
        title=${m.uiNotes(badge.notes.length)}
        @click=${() => view.toggle(badge)}
      >
        ${iconNote()}<span>${badge.notes.length}</span>
      </button>`;
    })}
  </div>`;
};

/** The notes of the open badge, oldest first, each with when it was written and a way to rewrite or delete it. */
export const renderUiNotesPop = (m: PrototypeMessages, view: UiNotesView): TemplateResult | typeof nothing => {
  const badge = view.open;
  if (badge === null) return nothing;
  return html`<div
    class="comment-pop ui-notes-pop"
    popover="manual"
    role="dialog"
    aria-label=${m.uiNotesOn(badge.label)}
    data-key=${uiNoteBadgeKey(badge)}
  >
    <div class="ui-notes-head">
      ${iconNote()}
      <strong class="comment-target" title=${badge.label}>${badge.label}</strong>
      <button
        class="dpk-icon-btn"
        type="button"
        data-role="close-notes"
        aria-label=${m.closeUiNotes}
        @click=${view.close}
      >
        ${iconClose()}
      </button>
    </div>
    <ol class="ui-note-list">
      ${badge.notes.map((note) =>
        view.editing?.noteId === note.id
          ? html`<li data-id=${note.id}>${renderEditor(m, view, view.editing)}</li>`
          : html`<li data-id=${note.id}>
              <div class="ui-note-main">
                <p class="ui-note-body">${note.body}</p>
                ${
                  note.createdAt === undefined
                    ? nothing
                    : html`<time class="ui-note-time" datetime=${note.createdAt}>${m.uiNoteDate(note.createdAt)}</time>`
                }
              </div>
              <button
                class="dpk-icon-btn"
                type="button"
                data-role="edit-note"
                aria-label=${m.editUiNoteAria}
                title=${m.editUiNoteAria}
                @click=${() => view.edit(note.id, note.body)}
              >
                ${iconPencil()}
              </button>
              <button
                class="dpk-icon-btn"
                type="button"
                data-role="delete-note"
                aria-label=${m.deleteUiNoteAria}
                @click=${() => view.remove(badge, note.id)}
              >
                ${iconTrash()}
              </button>
            </li>`,
      )}
    </ol>
  </div>`;
};

const renderEditor = (m: PrototypeMessages, view: UiNotesView, edit: UiNoteEdit): TemplateResult => html`
  <div class="ui-note-editor">
    <textarea
      class="dpk-textarea"
      aria-label=${m.editUiNoteLabel}
      title=${m.editUiNoteHint}
      .value=${edit.body}
      @input=${(event: Event) => {
        if (event.currentTarget instanceof HTMLTextAreaElement) view.input(event.currentTarget.value);
      }}
      @keydown=${(event: KeyboardEvent) => {
        if (event.isComposing) return;
        if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
          event.preventDefault();
          view.save();
        } else if (event.key === 'Escape') {
          // The Escape is for the text: the list stays open.
          event.preventDefault();
          event.stopPropagation();
          view.cancel();
        }
      }}
    ></textarea>
    <div class="ui-note-editor-actions">
      <button class="dpk-btn dpk-btn--ghost" type="button" @click=${view.cancel}>${m.cancelUiNote}</button>
      <button
        class="dpk-btn dpk-btn--accent"
        type="button"
        data-role="save-note"
        ?disabled=${edit.body.trim() === ''}
        @click=${view.save}
      >
        ${m.saveUiNote}
      </button>
    </div>
  </div>
`;
