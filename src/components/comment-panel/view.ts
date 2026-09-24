import { html, nothing, type TemplateResult } from 'lit';
import { repeat } from 'lit/directives/repeat.js';

import type { PanelMessages } from './messages';
import type { PanelIntent } from './model';
import type { PanelItem, PanelViewModel } from './present';

import { iconClose, iconComment, iconLink, iconMove, iconPencil, iconPlus, iconTrash } from '../../core/icons';

export type PanelSend = (intent: PanelIntent) => void;

/** A small colored glyph so a draft action's kind reads at a glance, before its title. */
const iconForTone = (tone: PanelItem['tone']): TemplateResult => {
  switch (tone) {
    case 'comment':
      return iconComment();
    case 'create':
      return iconPlus();
    case 'update':
      return iconPencil();
    case 'delete':
      return iconTrash();
    case 'move':
      return iconMove();
    default:
      return iconLink();
  }
};

/** Renders plain view data and translates DOM events into typed intents. */
export const renderPanel = (
  m: PanelMessages,
  vm: PanelViewModel,
  send: PanelSend,
  embedded = false,
): TemplateResult => html`
  ${embedded ? nothing : html`<header><h2>${m.heading}</h2></header>`}
  ${
    vm.issues.length > 0
      ? html`<div class="issues" role="alert">
          <strong>${m.rejected}</strong>
          <ul>
            ${vm.issues.map((issue) => html`<li>${issue}</li>`)}
          </ul>
        </div>`
      : nothing
  }
  <div class="composer">
    <textarea
      class="dpk-textarea"
      aria-label=${m.commentLabel}
      placeholder=${m.commentPlaceholder}
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
            <button class="chip" type="button" aria-label=${m.detach} @click=${() => send({ kind: 'clear-target' })}>
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
                <span>${m.attachTo(vm.attachment.group)}</span>
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
        ${m.addNote}
      </button>
    </div>
  </div>
  <ul class="list">
    ${
      vm.items.length === 0
        ? html`<li class="empty">
            <div class="empty-box">
              ${iconComment()}
              <p>${m.empty}</p>
              <p class="empty-hint">${m.emptyHint}</p>
            </div>
          </li>`
        : repeat(
            vm.items,
            (item) => item.id,
            (item) => renderItem(m, item, send),
          )
    }
  </ul>
  <footer>
    ${
      embedded || vm.send === 'hidden'
        ? nothing
        : html`<button
            class="dpk-btn dpk-btn--accent"
            type="button"
            ?disabled=${vm.send === 'disabled'}
            @click=${() => send({ kind: 'send' })}
          >
            ${m.sendToClaude}
          </button>`
    }
    <div class="footer-actions">
      ${
        embedded
          ? nothing
          : html`
              <button class="dpk-btn" type="button" @click=${() => send({ kind: 'copy', format: 'json' })}>
                ${m.copyJson}
              </button>
              <button class="dpk-btn" type="button" @click=${() => send({ kind: 'copy', format: 'brief' })}>
                ${m.copyBrief}
              </button>
            `
      }
      <button
        class="dpk-btn dpk-btn--ghost"
        type="button"
        ?disabled=${vm.items.length === 0}
        @click=${() => send({ kind: 'clear' })}
      >
        ${m.clear}
      </button>
    </div>
    ${vm.flash ? html`<span class="flash" role="status">${vm.flash}</span>` : nothing}
  </footer>
`;

const renderItem = (m: PanelMessages, item: PanelItem, send: PanelSend): TemplateResult => html`
  <li class="item" data-tone=${item.tone} data-stale=${String(item.stale !== null)}>
    <div class="item-head">
      <span class="item-icon">${iconForTone(item.tone)}</span>
      <span class="item-title">${item.title}</span>
      ${item.stale ? html`<span class="stale-badge">${item.stale}</span>` : nothing}
      <button
        class="dpk-icon-btn"
        type="button"
        aria-label=${m.deleteAction}
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
