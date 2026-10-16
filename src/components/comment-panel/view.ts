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
  ${embedded ? nothing : html`<header><h2>${headingOf(m, vm.section)}</h2></header>`}
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
  ${vm.composer ? renderComposer(m, vm, send) : nothing} ${renderGroups(m, vm, send)}
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
          : html`<button
              class=${vm.send === 'hidden' ? 'dpk-btn dpk-btn--accent' : 'dpk-btn'}
              type="button"
              title=${m.copyTitle}
              ?disabled=${!vm.hasDraft}
              @click=${() => send({ kind: 'copy' })}
            >
              ${m.copy}
            </button>`
      }
      <button
        class="dpk-btn dpk-btn--ghost"
        type="button"
        ?disabled=${!vm.hasDraft}
        @click=${() => send({ kind: 'clear' })}
      >
        ${m.clear}
      </button>
    </div>
    ${vm.flash ? html`<span class="flash" role="status">${vm.flash}</span>` : nothing}
  </footer>
`;

const headingOf = (m: PanelMessages, section: PanelViewModel['section']): string =>
  section === 'changes' ? m.changesHeading : section === 'comments' ? m.commentsHeading : m.heading;

const renderComposer = (m: PanelMessages, vm: PanelViewModel, send: PanelSend): TemplateResult => html`
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
`;

const renderEmpty = (text: string, hint: string): TemplateResult => html`<div class="empty">
  <div class="empty-box">
    ${iconComment()}
    <p>${text}</p>
    <p class="empty-hint">${hint}</p>
  </div>
</div>`;

const renderList = (m: PanelMessages, items: readonly PanelItem[], send: PanelSend): TemplateResult => html`<ul
  class="list"
>
  ${repeat(
    items,
    (item) => item.id,
    (item) => renderItem(m, item, send),
  )}
</ul>`;

/**
 * One section shows its own list (or why it is empty). Both together are
 * headed apart, review comments first: they are what the reader wrote to the agent.
 */
const renderGroups = (m: PanelMessages, vm: PanelViewModel, send: PanelSend): TemplateResult => {
  const [only] = vm.groups;
  if (vm.groups.length === 1 && only) {
    if (only.items.length > 0) return html`<div class="groups">${renderList(m, only.items, send)}</div>`;
    return only.kind === 'changes'
      ? renderEmpty(m.emptyChanges, m.emptyChangesHint)
      : renderEmpty(m.emptyComments, m.emptyCommentsHint);
  }
  if (!vm.hasDraft) return renderEmpty(m.empty, m.emptyHint);
  return html`<div class="groups">
    ${vm.groups
      .filter((group) => group.items.length > 0)
      .map(
        (group) => html`<section class="group" data-kind=${group.kind}>
          <h3 class="group-head">
            ${group.kind === 'changes' ? m.changesHeading : m.commentsHeading}
            <span class="group-count">${group.items.length}</span>
          </h3>
          ${renderList(m, group.items, send)}
        </section>`,
      )}
  </div>`;
};

const renderItem = (m: PanelMessages, item: PanelItem, send: PanelSend): TemplateResult => html`
  <li class="item" data-tone=${item.tone} data-stale=${String(item.stale !== null)} data-id=${item.id}>
    <div class="item-head">
      <span class="item-icon">${iconForTone(item.tone)}</span>
      <span class="item-title">${item.title}</span>
      ${item.stale ? html`<span class="stale-badge">${item.stale}</span>` : nothing}
      ${
        item.edit.kind === 'available'
          ? html`<button
              class="dpk-icon-btn item-edit"
              type="button"
              aria-label=${m.editComment}
              title=${m.editComment}
              @click=${() => send({ kind: 'edit-start', id: item.id, body: item.text.body })}
            >
              ${iconPencil()}
            </button>`
          : nothing
      }
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
      item.edit.kind === 'editing'
        ? renderEditor(m, item.edit, send)
        : item.text.kind === 'comment'
          ? html`<p class="item-body">${item.text.body}</p>`
          : item.text.body
            ? html`<div class="item-summary">${item.text.body}</div>`
            : nothing
    }
    ${item.code === null ? nothing : html`<code class="item-code">${item.code}</code>`}
  </li>
`;

const renderEditor = (
  m: PanelMessages,
  edit: { readonly body: string; readonly canSave: boolean },
  send: PanelSend,
): TemplateResult => html`
  <div class="item-editor">
    <textarea
      class="dpk-textarea"
      aria-label=${m.editLabel}
      title=${m.editHint}
      .value=${edit.body}
      @input=${(event: Event) => {
        if (event.currentTarget instanceof HTMLTextAreaElement)
          send({ kind: 'edit-input', body: event.currentTarget.value });
      }}
      @keydown=${(event: KeyboardEvent) => {
        if (event.isComposing) return;
        if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
          event.preventDefault();
          send({ kind: 'edit-save' });
        } else if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          send({ kind: 'edit-cancel' });
        }
      }}
    ></textarea>
    <div class="row item-editor-actions">
      <button class="dpk-btn dpk-btn--ghost" type="button" @click=${() => send({ kind: 'edit-cancel' })}>
        ${m.cancelEdit}
      </button>
      <button
        class="dpk-btn dpk-btn--accent"
        type="button"
        ?disabled=${!edit.canSave}
        @click=${() => send({ kind: 'edit-save' })}
      >
        ${m.saveEdit}
      </button>
    </div>
  </div>
`;
