import { html, nothing, type TemplateResult } from 'lit';

import type { ComposerViewModel } from './present';

export type ComposerIntent =
  | { readonly kind: 'input'; readonly body: string }
  | { readonly kind: 'comment'; readonly body: string }
  | { readonly kind: 'dismiss' };

/** Shared light-weight view: deliberately stays inside the card's shadow root. */
export const renderComposer = (vm: ComposerViewModel, send: (intent: ComposerIntent) => void): TemplateResult => {
  const submit = (): void => {
    if (vm.submission !== null) send({ kind: 'comment', body: vm.submission });
  };
  return html`<div
    class="comment-pop"
    popover="manual"
    role="dialog"
    aria-label=${vm.label ? `${vm.label}へのコメント` : 'コメント'}
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
    ${
      vm.notes.length
        ? html`<ul class="comment-list">
            ${vm.notes.map((note) => html`<li>${note}</li>`)}
          </ul>`
        : nothing
    }
    <textarea
      class="dpk-textarea"
      aria-label="コメント"
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
        送信
      </button>
      <button class="dpk-btn" type="button" @click=${() => send({ kind: 'dismiss' })}>キャンセル</button>
    </div>
  </div>`;
};
