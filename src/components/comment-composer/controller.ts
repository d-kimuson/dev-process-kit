import { html, nothing, type ReactiveController, type ReactiveControllerHost, type TemplateResult } from 'lit';
import { keyed } from 'lit/directives/keyed.js';

import type { ContextMenuMessages } from '../../core/context-menu/messages';
import type { ContextMenuGroup } from '../../core/context-menu/types';
import type { Locale } from '../../core/i18n';
import type { ActionTarget, CommentTargetOption } from '../../core/types';

import { PopoverController } from '../../core/popover-controller';
import { targetRef } from '../../core/target';
import { composerMessages } from './messages';
import { presentComposer } from './present';
import { renderComposer, type ComposerIntent } from './view';

/** `true` once the target's owner accepted the comment; `false` reopens the composer with an error. */
export type CommentPopoverSubmit = (target: string, body: string) => boolean;

/**
 * The tooltip-like comment composer shared by every element-comment surface
 * (diagrams, `dpk-formal-spec`, `dpk-commentable`): one target open at a
 * time, anchored at whatever DOM element the caller names, with its own
 * per-target draft so unsent text survives switching targets while the host
 * stays mounted. Submission semantics (board vs. host template vs. a plain
 * `dpk-comment-submit` event) stay with each host — this controller only
 * owns the composer's open/anchor/draft state and its rendering.
 */
export class CommentPopoverController implements ReactiveController {
  readonly #host: ReactiveControllerHost;
  readonly #popovers: PopoverController;
  #target: string | null = null;
  #previousTarget: string | null = null;
  #anchor: Element | null = null;
  #label: string | null = null;
  #drafts: ReadonlyMap<string, string> = new Map();
  #failedTarget: string | null = null;

  constructor(host: ReactiveControllerHost) {
    this.#host = host;
    this.#popovers = new PopoverController(host);
    host.addController(this);
  }

  get isOpen(): boolean {
    return this.#target !== null;
  }

  /** Opens (or re-anchors) the composer for `target`, anchored at `anchor`. */
  open(target: string, anchor: Element, label?: string): void {
    this.#target = target;
    this.#anchor = anchor;
    this.#label = label ?? null;
    this.#failedTarget = null;
    this.#host.requestUpdate();
  }

  close(): void {
    this.#target = null;
    this.#anchor = null;
    this.#label = null;
    this.#host.requestUpdate();
  }

  /** Drops the anchor so a disconnected host never re-syncs a stale popover. */
  hostDisconnected(): void {
    this.close();
  }

  /**
   * Call from the host's own `updated()`, with the `.comment-pop` surface
   * the host's `render()` just drew (or `null` while none is open) — mirrors
   * `PopoverController`'s own host-queries-the-DOM convention.
   */
  sync(surface: HTMLElement | null): void {
    const opened = this.#previousTarget !== this.#target;
    this.#previousTarget = this.#target;
    if (surface === null || this.#anchor === null || this.#target === null) return;
    this.#popovers.open(
      surface,
      this.#anchor,
      { width: 300, height: 280 },
      { placement: 'right-start', trackTransform: true },
    );
    if (opened) surface.querySelector('textarea')?.focus({ preventScroll: true });
  }

  /** Renders the open composer, or `nothing` while none is open. */
  render(options: {
    readonly locale: Locale;
    readonly errorMessage?: string;
    readonly submit: CommentPopoverSubmit;
  }): TemplateResult | typeof nothing {
    const ref = this.#target;
    if (ref === null) return nothing;
    const vm = presentComposer(this.#drafts.get(ref) ?? '', [], {
      ...(this.#label === null ? {} : { label: this.#label }),
      key: ref,
      ...(this.#failedTarget === ref && options.errorMessage !== undefined ? { error: options.errorMessage } : {}),
    });
    return html`${keyed(
      ref,
      renderComposer(composerMessages(options.locale), vm, (intent) => this.#intent(ref, options.submit, intent)),
    )}`;
  }

  #intent(ref: string, submit: CommentPopoverSubmit, intent: ComposerIntent): void {
    if (intent.kind === 'input') {
      this.#drafts = new Map(this.#drafts).set(ref, intent.body);
      this.#failedTarget = null;
      this.#host.requestUpdate();
      return;
    }
    if (intent.kind === 'comment') {
      const accepted = submit(ref, intent.body);
      if (!accepted) {
        this.#failedTarget = ref;
        this.#host.requestUpdate();
        return;
      }
      const drafts = new Map(this.#drafts);
      drafts.delete(ref);
      this.#drafts = drafts;
    }
    this.#failedTarget = null;
    this.close();
  }
}

/**
 * The generic "Review comment" right-click item: offered whenever the
 * resolved target (`ContextMenuRequest.target`) matches one of the host's
 * own `commentTargets`. A pure function so it needs no base class — any
 * duck-typed `ContextMenuProvider` (a custom component provider included)
 * can build its own group with it.
 */
export const reviewCommentMenuGroup = (
  target: ActionTarget | null,
  commentTargets: readonly CommentTargetOption[],
  messages: ContextMenuMessages,
  open: (ref: string, label: string) => void,
): ContextMenuGroup | null => {
  if (target === null) return null;
  const ref = targetRef(target);
  const option = commentTargets.find((candidate) => candidate.value === ref);
  if (option === undefined) return null;
  return {
    id: 'review-comment',
    entries: [
      { kind: 'item', id: 'review-comment', label: messages.reviewComment, run: () => open(ref, option.label) },
    ],
  };
};
