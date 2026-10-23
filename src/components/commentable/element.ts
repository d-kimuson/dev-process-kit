import { LitElement, css, html, type CSSResultGroup, type PropertyValues } from 'lit';

import type { ContextMenuGroup, ContextMenuRequest } from '../../core/context-menu/types';
import type { CommentTargetOption } from '../../core/types';

import { contextMenuMessages } from '../../core/context-menu/messages';
import { LocaleController } from '../../core/locale-controller';
import { controls, popoverSurface, tokens } from '../../core/theme';
import { CommentPopoverController, reviewCommentMenuGroup } from '../comment-composer/controller';
import { commentableMessages, type CommentableMessages } from './messages';
import { itemKey, itemLabel, itemTargetValue, parseItemRef, uniqueItems, type CommentableItem } from './model';

const ITEM_SELECTOR = '[data-dpk-item]';
const HEADING_SELECTOR = 'h1, h2, h3, h4, h5, h6, summary, caption, legend';

/**
 * `<dpk-commentable>` — wraps author markup to make its marked parts
 * ("data-dpk-item" elements) comment targets, without owning their layout:
 * the markup stays the author's, this element only slots it.
 *
 * Right-click a marked element and choose "Review comment", the same
 * tooltip-like composer every diagram and `dpk-formal-spec` opens — one
 * shared mechanism instead of a bar-style trigger button of its own.
 */
export class DpkCommentable extends LitElement {
  static override styles: CSSResultGroup = [
    tokens,
    controls,
    popoverSurface,
    css`
      :host {
        position: relative;
        display: block;
        font-size: inherit;
        line-height: inherit;
        color: inherit;
      }
      .comment-error {
        margin: 0;
        font-size: 11px;
        color: var(--dpk-accent);
      }
    `,
  ];

  static override properties = { id: { type: String, reflect: true }, heading: { type: String } };
  declare heading: string | null;

  readonly #i18n = new LocaleController(this);
  readonly #commentPopover = new CommentPopoverController(this);
  readonly #observer = new MutationObserver(() => {
    this.#collect();
  });
  #items: readonly (CommentableItem & { readonly element: Element })[] = [];
  #markedElements: ReadonlySet<Element> = new Set();
  #targetSignature = '';

  constructor() {
    super();
    this.id = this.getAttribute('id') ?? '';
    this.heading = null;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#observer.observe(this, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['data-dpk-item', 'data-dpk-label'],
    });
    this.#collect();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#observer.disconnect();
  }

  get commentTargets(): readonly CommentTargetOption[] {
    if (!this.id) return [];
    const group = `${this.heading ?? this.#m.heading} · ${this.id}`;
    return this.#items.map((item) => ({ value: itemTargetValue(this.id, item), label: item.label, group }));
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has('id')) this.#applyTargetAttributes();
    if (changed.has('id') || changed.has('heading')) this.#syncTargets();
  }

  protected override updated(): void {
    this.#commentPopover.sync(this.renderRoot.querySelector<HTMLElement>('.comment-pop'));
  }

  /**
   * The right-click menu's "Review comment" item: offered whenever the
   * resolved target matches one of this element's own `commentTargets`.
   */
  getContextMenuItems(request: ContextMenuRequest): readonly ContextMenuGroup[] | null {
    const group = reviewCommentMenuGroup(
      request.target,
      this.commentTargets,
      contextMenuMessages(this.#i18n.locale),
      (ref, label) => this.#openCommentPopover(ref, label),
    );
    return group === null ? null : [group];
  }

  /** Marked elements are the author's own light DOM, so the anchor is looked up there, not in the shadow root. */
  #openCommentPopover(ref: string, label: string): void {
    const anchor = this.querySelector<Element>(`[data-dpk-target="${CSS.escape(ref)}"]`);
    if (anchor === null) return;
    this.#commentPopover.open(ref, anchor, label);
  }

  /** There is no board here: an enclosing template saves the comment, cancelling the event once it has. */
  #submitComment(target: string, body: string): boolean {
    return !this.dispatchEvent(
      new CustomEvent('dpk-comment-submit', {
        detail: { target, body },
        bubbles: true,
        composed: true,
        cancelable: true,
      }),
    );
  }

  protected override render(): unknown {
    return html`<slot></slot>${this.#commentPopover.render({
        locale: this.#i18n.locale,
        errorMessage: this.#m.sendFailed,
        submit: (target, body) => this.#submitComment(target, body),
      })}`;
  }

  get #m(): CommentableMessages {
    return commentableMessages(this.#i18n.locale);
  }

  #collect(): void {
    const found = [...this.querySelectorAll(ITEM_SELECTOR)].flatMap((element) => {
      if (element.parentElement?.closest(this.localName) !== this) return [];
      const ref = parseItemRef(element.getAttribute('data-dpk-item'));
      if (ref === null) return [];
      const heading = element.querySelector(HEADING_SELECTOR)?.textContent ?? null;
      const label = itemLabel(element.getAttribute('data-dpk-label'), heading, element.textContent, this.#m.untitled);
      return [{ ...ref, label, element }];
    });
    const unique = uniqueItems(found);
    if (unique.length < found.length) {
      const kept = new Set(unique.map(itemKey));
      const dropped = [...new Set(found.map(itemKey).filter((key) => !kept.has(key)))];
      console.warn(`[dev-process-kit] ${this.localName}#${this.id}: ambiguous data-dpk-item ignored:`, dropped);
    }
    this.#items = unique;
    this.#applyTargetAttributes();
    this.#syncTargets();
  }

  /** Marks each item's own element with the attribute the context menu and the popover anchor lookup use. */
  #applyTargetAttributes(): void {
    const next = new Set(this.#items.map((item) => item.element));
    for (const element of this.#markedElements) if (!next.has(element)) element.removeAttribute('data-dpk-target');
    for (const item of this.#items) item.element.setAttribute('data-dpk-target', itemTargetValue(this.id, item));
    this.#markedElements = next;
  }

  #syncTargets(): void {
    const signature = JSON.stringify(this.commentTargets);
    if (signature === this.#targetSignature) return;
    this.#targetSignature = signature;
    this.dispatchEvent(new CustomEvent('dpk-comment-targets-change', { bubbles: true, composed: true }));
  }
}
