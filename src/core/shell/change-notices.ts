/**
 * The change notices in the shell: the header bell with its unread badge, the
 * list it opens, and the toasts that announce what the reader has not seen.
 */
import { html, nothing, type TemplateResult } from 'lit';
import { repeat } from 'lit/directives/repeat.js';

import type { NoticeCard, NoticeViewModel, ToastHold } from '../changes';
import type { CoreMessages } from '../messages';

import { iconBell, iconClose } from '../icons';

export type NoticeIntents = {
  readonly toggleList: () => void;
  readonly openList: () => void;
  readonly show: (key: string) => void;
  readonly dismiss: (key: string) => void;
  readonly pause: (hold: ToastHold) => void;
  readonly resume: (hold: ToastHold) => void;
};

export const NOTICE_LIST_ID = 'dpk-changes';

export const renderNoticeBell = (vm: NoticeViewModel, m: CoreMessages, on: NoticeIntents): TemplateResult => {
  const label = vm.unread > 0 ? m.changesUnread(vm.unread) : m.changes;
  return html`<button
    class="dpk-bell"
    type="button"
    aria-controls=${NOTICE_LIST_ID}
    aria-expanded=${vm.open ? 'true' : 'false'}
    aria-label=${label}
    title=${label}
    @click=${on.toggleList}
  >
    ${iconBell()} ${vm.unread > 0 ? html`<span class="dpk-bell-badge" aria-hidden="true">${vm.unread}</span>` : nothing}
  </button>`;
};

const renderShow = (card: NoticeCard, m: CoreMessages, on: NoticeIntents): TemplateResult | typeof nothing =>
  card.jumpable
    ? html`<button class="dpk-btn dpk-btn--accent dpk-notice-show" type="button" @click=${() => on.show(card.key)}>
        ${m.changesShow}
      </button>`
    : nothing;

/** Rendered only while open; the shell lifts it to the top layer beside the bell. */
export const renderNoticeList = (
  vm: NoticeViewModel,
  revision: string,
  m: CoreMessages,
  on: NoticeIntents,
): TemplateResult | typeof nothing => {
  if (!vm.open) return nothing;
  return html`<div id=${NOTICE_LIST_ID} class="dpk-changes" popover="manual" role="dialog" aria-label=${m.changesTitle}>
    <p class="dpk-changes-head"><strong>${m.changesTitle}</strong> <span>${revision}</span></p>
    <ol class="dpk-changes-list">
      ${repeat(
        vm.cards,
        (card) => card.key,
        (card) => html`<li class="dpk-change" data-key=${card.key} ?data-fresh=${card.fresh}>
          <p class="dpk-change-title">
            ${card.fresh ? html`<span class="dpk-change-new">${m.changesNew}</span>` : nothing} ${card.title}
          </p>
          ${card.body === null ? nothing : html`<p class="dpk-change-body">${card.body}</p>`} ${renderShow(card, m, on)}
        </li>`,
      )}
    </ol>
  </div>`;
};

/** Always present, so a screen reader hears the toasts that appear in it. */
export const renderNoticeToasts = (vm: NoticeViewModel, m: CoreMessages, on: NoticeIntents): TemplateResult => {
  return html`<section
    class="dpk-toasts"
    aria-live="polite"
    aria-label=${m.changes}
    @pointerenter=${() => on.pause('pointer')}
    @pointerleave=${() => on.resume('pointer')}
    @focusin=${() => on.pause('focus')}
    @focusout=${() => on.resume('focus')}
  >
    ${repeat(
      vm.toasts,
      (toast) => toast.key,
      (toast) => html`<div class="dpk-toast" data-key=${toast.key}>
        <span class="dpk-toast-icon" aria-hidden="true">${iconBell()}</span>
        <div class="dpk-toast-text">
          <p class="dpk-change-title">${toast.title}</p>
          ${toast.body === null ? nothing : html`<p class="dpk-change-body">${toast.body}</p>`}
        </div>
        ${renderShow(toast, m, on)}
        <button
          class="dpk-toast-close"
          type="button"
          aria-label=${m.changesDismiss}
          title=${m.changesDismiss}
          @click=${() => on.dismiss(toast.key)}
        >
          ${iconClose()}
        </button>
      </div>`,
    )}
    ${
      vm.waiting > 0
        ? html`<button class="dpk-toast-more" type="button" @click=${on.openList}>
            ${m.changesWaiting(vm.waiting)} · ${m.changesSeeAll}
          </button>`
        : nothing
    }
  </section>`;
};
