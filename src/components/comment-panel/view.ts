import { html, nothing, type TemplateResult } from 'lit';
import { repeat } from 'lit/directives/repeat.js';

import type { PanelIntent } from './model';
import type { PanelItem, PanelViewModel } from './present';

import { iconClose } from '../../core/icons';

export type PanelSend = (intent: PanelIntent) => void;

/** Renders plain view data and translates DOM events into typed intents. */
export const renderPanel = (vm: PanelViewModel, send: PanelSend, embedded = false): TemplateResult => html`
  ${embedded ? nothing : html`<header><h2>Review notes</h2></header>`}
  ${
    vm.issues.length > 0
      ? html`<div class="issues" role="alert">
          <strong>Action rejected.</strong>
          <ul>
            ${vm.issues.map((issue) => html`<li>${issue}</li>`)}
          </ul>
        </div>`
      : nothing
  }
  <div class="composer">
    <textarea
      class="dpk-textarea"
      aria-label="レビューコメント"
      placeholder="変更したいこと / 気づきを書く（Agent への指示として渡る）"
      .value=${vm.body}
      @input=${(event: Event) => {
        if (event.currentTarget instanceof HTMLTextAreaElement)
          send({ kind: 'input', body: event.currentTarget.value });
      }}
      @keydown=${(event: KeyboardEvent) => {
        if (!event.isComposing && event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
          event.preventDefault();
          send({ kind: 'submit' });
        }
      }}
    ></textarea>
    ${
      vm.attachment.kind === 'explicit'
        ? html`<div class="row">
            <button class="chip" type="button" aria-label="紐づけを解除" @click=${() => send({ kind: 'clear-target' })}>
              ${vm.target.label} ${iconClose()}
            </button>
          </div>`
        : vm.attachment.kind === 'checkbox'
          ? html`<div class="row">
              <label class="attach">
                <input
                  type="checkbox"
                  .checked=${vm.attachment.checked}
                  @change=${(event: Event) => {
                    if (event.currentTarget instanceof HTMLInputElement)
                      send({ kind: 'attach', current: event.currentTarget.checked });
                  }}
                />
                <span>この ${vm.attachment.group} に紐づける</span>
              </label>
            </div>`
          : nothing
    }
    <div class="row">
      <span class="target-line">→ ${vm.target.label}</span>
      <button
        class="dpk-btn dpk-btn--accent"
        type="button"
        ?disabled=${!vm.canSubmit}
        @click=${() => send({ kind: 'submit' })}
      >
        Add note
      </button>
    </div>
  </div>
  <ul class="list">
    ${
      vm.items.length === 0
        ? html`<li class="empty">
            No draft actions yet.<br />
            Comments and structural patches both land here, and survive reload via LocalStorage.
          </li>`
        : repeat(
            vm.items,
            (item) => item.id,
            (item) => renderItem(item, send),
          )
    }
  </ul>
  <footer>
    ${
      embedded
        ? nothing
        : html`
            ${
              vm.send === 'hidden'
                ? nothing
                : html`<button
                    class="dpk-btn dpk-btn--accent"
                    type="button"
                    ?disabled=${vm.send === 'disabled'}
                    @click=${() => send({ kind: 'send' })}
                  >
                    Claude に送る
                  </button>`
            }
            <button class="dpk-btn" type="button" @click=${() => send({ kind: 'copy', format: 'json' })}>
              Copy JSON
            </button>
            <button class="dpk-btn" type="button" @click=${() => send({ kind: 'copy', format: 'brief' })}>
              Copy brief
            </button>
          `
    }
    <button
      class="dpk-btn dpk-btn--ghost"
      type="button"
      ?disabled=${vm.items.length === 0}
      @click=${() => send({ kind: 'clear' })}
    >
      Clear
    </button>
    ${vm.flash ? html`<span class="flash" role="status">${vm.flash}</span>` : nothing}
  </footer>
`;

const renderItem = (item: PanelItem, send: PanelSend): TemplateResult => html`
  <li class="item" data-tone=${item.tone} data-stale=${String(item.stale !== null)}>
    <div class="item-head">
      <span class="item-title">${item.title}</span>
      ${item.stale ? html`<span class="stale-badge">${item.stale}</span>` : nothing}
      <button
        class="dpk-icon-btn"
        type="button"
        aria-label="この draft action を削除"
        @click=${() => send({ kind: 'delete', id: item.id })}
      >
        ${iconClose()}
      </button>
    </div>
    <div class="item-target">${item.targetLabel}</div>
    ${
      item.text.kind === 'comment'
        ? html`<p class="item-body">${item.text.body}</p>`
        : item.text.body
          ? html`<div class="item-summary">${item.text.body}</div>`
          : nothing
    }
    <code class="item-code">${item.code}</code>
  </li>
`;
