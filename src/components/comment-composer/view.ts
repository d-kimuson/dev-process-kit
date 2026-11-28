import { css, html, nothing, type TemplateResult } from 'lit';

import type { ComposerMessages } from './messages';
import type { ComposerChoice, ComposerViewModel } from './present';

import { iconArrowUp } from '../../core/icons';

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

/**
 * A composer that stays in its surface (a side panel, a chat column): the kind of comment above, one growing text box
 * with the send button beside it. Ctrl/Cmd+Enter sends; Enter alone starts a new line.
 */
export const renderInlineComposer = (
  m: ComposerMessages,
  vm: ComposerViewModel,
  send: (intent: ComposerIntent) => void,
): TemplateResult => {
  const submit = (): void => {
    if (vm.submission !== null) send({ kind: 'comment', body: vm.submission });
  };
  const submitLabel = vm.submitLabel ?? m.submit;
  return html`<form
    class="inline-composer"
    @submit=${(event: Event) => {
      event.preventDefault();
      submit();
    }}
  >
    ${
      vm.choice
        ? html`<div
            class="inline-composer-kinds"
            @keydown=${(event: KeyboardEvent) => {
              if (event.key === 'Enter') event.preventDefault();
            }}
          >
            ${renderChoice(vm.choice, send)}
          </div>`
        : nothing
    }
    ${vm.error ? html`<p class="comment-error" role="alert">${vm.error}</p>` : nothing}
    <div class="inline-composer-box">
      <textarea
        rows="1"
        aria-label=${vm.label ?? vm.placeholder ?? m.comment}
        placeholder=${vm.placeholder ?? nothing}
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
      <button
        class="dpk-btn dpk-btn--accent inline-composer-send"
        type="submit"
        aria-label=${submitLabel}
        title=${submitLabel}
        ?disabled=${vm.submission === null}
      >
        ${iconArrowUp()}
      </button>
    </div>
  </form>`;
};

export const inlineComposerCss = css`
  .inline-composer {
    display: grid;
    gap: 8px;
  }

  .inline-composer .comment-kinds {
    font-size: var(--dpk-text-2xs);
  }

  .inline-composer .comment-error {
    margin: 0;
    color: var(--dpk-danger);
    font-size: var(--dpk-text-2xs);
  }

  .inline-composer-box {
    display: flex;
    align-items: flex-end;
    gap: 6px;
    padding: 4px 4px 4px 10px;
    border: 1px solid var(--dpk-rule-strong);
    border-radius: var(--dpk-radius-md);
    background: var(--dpk-paper-raised);
    box-shadow: inset 0 1px 2px var(--dpk-shade-1);
    transition:
      border-color var(--dpk-dur) var(--dpk-ease),
      box-shadow var(--dpk-dur) var(--dpk-ease);
  }

  .inline-composer-box:hover {
    border-color: var(--dpk-rule-hover);
  }

  .inline-composer-box:focus-within {
    border-color: var(--dpk-blue);
    box-shadow: var(--dpk-focus);
    transition-duration: var(--dpk-dur-fast);
  }

  .inline-composer-box textarea {
    flex: 1;
    min-width: 0;
    min-height: 26px;
    max-height: calc(1.5em * 8 + 8px);
    padding: 4px 0;
    border: 0;
    outline: none;
    background: transparent;
    color: var(--dpk-ink);
    font: inherit;
    font-size: var(--dpk-text-sm);
    line-height: 1.5;
    resize: none;
    field-sizing: content;
  }

  .inline-composer-box textarea::placeholder {
    color: var(--dpk-ink-faint);
  }

  .inline-composer-send {
    flex: none;
    display: inline-grid;
    place-items: center;
    width: 28px;
    height: 28px;
    padding: 0;
    min-height: 0;
  }

  .inline-composer-send svg {
    width: 16px;
    height: 16px;
  }
`;
