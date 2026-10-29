import { html, type TemplateResult } from 'lit';

import type { SlidesMessages } from '../messages';
import type { Slide } from '../model';

export type NotesOptions = {
  /** The unsent text of this slide's notes, or the slide's own notes when nothing is pending. */
  readonly textFor: (slide: Slide) => string;
  readonly onDraft: (slide: Slide, text: string) => void;
  readonly onSave: (slideId: string) => void;
};

/**
 * The speaker notes of the slide on screen, under the stage and outside the
 * slide: what the presenter says is written here and is never projected.
 *
 * It is a place to write, so it submits explicitly — the Save button or ⌘/Ctrl +
 * Enter — rather than entering the draft on every keystroke. The field carries
 * `data-dpk-text-key`, so the text the reader has not sent yet comes back after a
 * reload, like any other field the kit renders (`data-dpk-text-key`).
 */
export const renderNotes = (m: SlidesMessages, slide: Slide, options: NotesOptions): TemplateResult => {
  const text = options.textFor(slide);
  const canSave = text.trim() !== slide.notes;
  return html`<section class="slide-notes" aria-label=${m.speakerNotes}>
    <div class="slide-notes-head">
      <span class="dpk-label">${m.speakerNotes}</span>
      <span class="slide-notes-hint">${m.speakerNotesHint}</span>
    </div>
    <textarea
      class="dpk-textarea slide-notes-input"
      data-dpk-text-key=${`slide:${slide.id}`}
      aria-label=${m.speakerNotes}
      placeholder=${m.speakerNotesPlaceholder}
      .value=${text}
      @input=${(event: Event) => {
        if (event.currentTarget instanceof HTMLTextAreaElement) options.onDraft(slide, event.currentTarget.value);
      }}
      @keydown=${(event: KeyboardEvent) => {
        if (event.isComposing || event.key !== 'Enter' || !(event.metaKey || event.ctrlKey)) return;
        event.preventDefault();
        if (canSave) options.onSave(slide.id);
      }}
    ></textarea>
    <div class="slide-notes-actions">
      <span class="slide-notes-submit-hint">${m.submitHint}</span>
      <button
        class="dpk-btn dpk-btn--accent slide-notes-save"
        type="button"
        ?disabled=${!canSave}
        @click=${() => options.onSave(slide.id)}
      >
        ${m.saveNotes}
      </button>
    </div>
  </section>`;
};
