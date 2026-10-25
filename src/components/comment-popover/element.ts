import { LitElement, css, html, type CSSResultGroup, type PropertyValues } from 'lit';

import type { CommentTargetOption } from '../../core/types';

import { LocaleController } from '../../core/locale-controller';
import { controls, popoverSurface, tokens } from '../../core/theme';
import { CommentPopoverController } from '../comment-composer/controller';
import { commentPopoverMessages } from './messages';

/**
 * `<dpk-comment-popover>` — the tooltip-like review-comment composer every
 * diagram, `dpk-formal-spec` and `dpk-commentable` already open from their
 * own right-click menu, exposed on its own so any other author markup can
 * open the same UI without building a context menu first.
 *
 * It wraps its slotted trigger (a button, an icon, anything clickable) and
 * anchors the popover at itself. Opening and closing is the `open` property
 * — settable by clicking the trigger, by the host, or by the popover itself
 * (Escape, Cancel, a successful submit) — so it composes like any other
 * piece of markup: toggle `open`, the popover follows.
 *
 * It also registers `target` as a `commentTargets` entry, the same browser-native
 * provider contract diagrams, `dpk-formal-spec` and `dpk-commentable` already use
 * (`findComponentProviders`, duck-typed on the property existing). The enclosing
 * template discovers it the same way, so `dpk-comment-submit` validates and is
 * accepted without the host hand-registering this element's target anywhere else.
 * It mirrors `target` onto its own `data-dpk-target` attribute too, the anchor
 * marker those same components use, so the review rail can find and highlight it.
 */
export class DpkCommentPopover extends LitElement {
  static override styles: CSSResultGroup = [
    tokens,
    controls,
    popoverSurface,
    css`
      :host {
        position: relative;
        display: inline-block;
      }
      .comment-error {
        margin: 0;
        font-size: 11px;
        color: var(--dpk-accent);
        /* A refusal lands under the composer it belongs to, rather than
           simply being there when the reader looks back. */
        animation: dpk-rise-in var(--dpk-dur-fast) var(--dpk-ease-out);
      }
    `,
  ];

  static override properties = {
    target: { type: String },
    label: { type: String },
    open: { type: Boolean, reflect: true },
  };

  /** Carried verbatim into `dpk-comment-submit`'s detail; this element does not interpret it. */
  declare target: string;
  /** Shown atop the composer, e.g. what the comment is about. */
  declare label: string | null;
  /** Whether the popover is shown. Toggled by the trigger, or settable directly. */
  declare open: boolean;

  readonly #i18n = new LocaleController(this);
  readonly #popover = new CommentPopoverController(this);

  constructor() {
    super();
    this.target = '';
    this.label = null;
    this.open = false;
    // A plain light-DOM listener, not a shadow-root one: it sees every click
    // that bubbles through the host, including a slotted trigger's — no
    // reliance on how a given DOM implementation retargets slotted clicks.
    this.addEventListener('click', this.#onTriggerClick);
  }

  #onTriggerClick = (): void => {
    this.open = true;
  };

  /** The one target this element submits against; empty while `target` is unset. */
  get commentTargets(): readonly CommentTargetOption[] {
    if (this.target.length === 0) return [];
    return [{ value: this.target, label: this.label ?? this.target }];
  }

  /** Before `render()`, so the composer it draws already reflects a just-set `open`. */
  protected override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has('target')) {
      // The same anchor attribute `dpk-commentable` and the diagrams mark their targets with
      // (`[data-dpk-target]`), so the review rail can find and highlight this element too —
      // here the host itself is the one thing there is to anchor on.
      if (this.target.length === 0) this.removeAttribute('data-dpk-target');
      else this.setAttribute('data-dpk-target', this.target);
    }
    if (!changed.has('open')) return;
    if (this.open && !this.#popover.isOpen) this.#popover.open(this.target, this, this.label ?? undefined);
    else if (!this.open && this.#popover.isOpen) this.#popover.close();
  }

  protected override updated(): void {
    this.#popover.sync(this.renderRoot.querySelector<HTMLElement>('.comment-pop'));
    // The popover can close itself (Escape, Cancel, a successful submit); mirror that back onto `open`.
    if (this.open !== this.#popover.isOpen) this.open = this.#popover.isOpen;
  }

  protected override render(): unknown {
    return html`<slot></slot>${this.#popover.render({
        locale: this.#i18n.locale,
        errorMessage: commentPopoverMessages(this.#i18n.locale).sendFailed,
        submit: (target, body) => this.#submit(target, body),
      })}`;
  }

  /** There is no board here: an enclosing template saves the comment, cancelling the event once it has. */
  #submit(target: string, body: string): boolean {
    return !this.dispatchEvent(
      new CustomEvent('dpk-comment-submit', {
        detail: { target, body },
        bubbles: true,
        composed: true,
        cancelable: true,
      }),
    );
  }
}
