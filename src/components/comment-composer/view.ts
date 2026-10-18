import { html, nothing, type TemplateResult } from 'lit';

import type { ComposerMessages } from './messages';
import type { ComposerChoice, ComposerViewModel } from './present';

export type ComposerIntent =
  | { readonly kind: 'input'; readonly body: string }
  | { readonly kind: 'comment'; readonly body: string }
  /** Sent only by a composer with a choice: the kind of comment picked. */
  | { readonly kind: 'choose'; readonly value: string }
  | { readonly kind: 'dismiss' };

/** Shared light-weight view: deliberately stays inside the card's shadow root. */
export const renderComposer = (
  m: ComposerMessages,
  vm: ComposerViewModel,
  send: (intent: ComposerIntent) => void,
): TemplateResult => {
  const submit = (): void => {
    if (vm.submission !== null) send({ kind: 'comment', body: vm.submission });
  };
  return html`<div
    class="comment-pop"
    popover="manual"
    role="dialog"
    aria-label=${vm.label ? m.commentOn(vm.label) : m.comment}
    @click=${(event: Event) => event.stopPropagation()}
    @keydown=${(event: KeyboardEvent) => {
      if (event.isComposing || event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      send({ kind: 'dismiss' });
    }}
  >
    ${vm.label ? html`<strong class="comment-target">${vm.label}</strong>` : nothing}
    ${vm.error ? html`<p class="comment-error" role="alert">${vm.error}</p>` : nothing}
    ${vm.choice ? renderChoice(vm.choice, send) : nothing}
    ${
      vm.notes.length
        ? html`<ul class="comment-list">
            ${vm.notes.map((note) => html`<li>${note}</li>`)}
          </ul>`
        : nothing
    }
    <textarea
      class="dpk-textarea"
      aria-label=${m.comment}
      data-dpk-text-key=${vm.key ?? nothing}
      .value=${vm.body}
      @input=${(event: Event) => {
        if (event.currentTarget instanceof HTMLTextAreaElement)
          send({ kind: 'input', body: event.currentTarget.value });
      }}
      @keydown=${(event: KeyboardEvent) => {
        if (event.isComposing) return;
        if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
          event.preventDefault();
          submit();
        }
      }}
    ></textarea>
    <div class="pop-actions">
      <button class="dpk-btn dpk-btn--accent" type="button" ?disabled=${vm.submission === null} @click=${submit}>
        ${vm.submitLabel ?? m.submit}
      </button>
      <button
        class="dpk-btn dpk-btn--ghost"
        type="button"
        data-dpk-text-discard
        @click=${() => send({ kind: 'dismiss' })}
      >
        ${m.cancel}
      </button>
    </div>
  </div>`;
};

/** Native radios, so the arrow keys move between the kinds; drawn as a segmented control. */
const renderChoice = (choice: ComposerChoice, send: (intent: ComposerIntent) => void): TemplateResult => {
  const hint = choice.options.find((option) => option.value === choice.value)?.hint;
  return html`<fieldset class="comment-kinds">
      <legend>${choice.label}</legend>
      ${choice.options.map(
        (option) =>
          html`<label class="comment-kind">
            <input
              type="radio"
              name="comment-kind"
              .value=${option.value}
              .checked=${option.value === choice.value}
              @change=${() => send({ kind: 'choose', value: option.value })}
            />
            <span>${option.label}</span>
          </label>`,
      )}
    </fieldset>
    ${hint === undefined ? nothing : html`<p class="comment-kind-hint">${hint}</p>`}`;
};
