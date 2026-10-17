import { html, nothing, type TemplateResult } from 'lit';

import type { PrototypeMessages } from '../messages';
import type { UiNoteBadge } from '../present';

import { iconClose, iconNote, iconTrash } from '../../../core/icons';

export type UiNotesView = {
  /** The notes kept on the elements on screen: none in the app view, which is the product alone. */
  readonly badges: readonly UiNoteBadge[];
  /** The badge whose notes are open. */
  readonly open: UiNoteBadge | null;
  readonly toggle: (badge: UiNoteBadge) => void;
  readonly close: () => void;
  readonly remove: (badge: UiNoteBadge, noteId: string) => void;
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

/** The notes of the open badge, oldest first, each with when it was written and a way to delete it. */
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
      ${badge.notes.map(
        (note) => html`<li data-id=${note.id}>
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
