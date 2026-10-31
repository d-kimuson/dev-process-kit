/**
 * `<dpk-page>`: one switchable subject of an app.
 *
 * A page is a thin host for exactly one view (`dpk-view-*`) or board
 * (`dpk-board-*`). It owns the page's name and label, and it is the board
 * contract the app sees: `definition`, `api` and `controller` are the
 * content's, proxied, and `PAGE_HOST` delegates to the app. The content
 * keeps rendering its own regions; it finds the page through `pageNameOf`
 * and `pageHostOf` and hands its draft, navigation and review to it.
 *
 * A page with no content, or with more than one, is an authoring mistake; so
 * is a content tag no loaded entry defines. Each is answered (the page's
 * `ready` resolves and the page says what is wrong where its content would
 * be) rather than waited on: the app starts for the pages that can render,
 * and a definition that still arrives later moves the page to `ready`.
 */
import { css, html, LitElement, nothing, type CSSResultGroup, type TemplateResult } from 'lit';

import type { AnyDefinition } from '../app/definition';
import type { ComponentSnapshot } from '../element-actions';
import type { ViewApi } from '../shell/contracts';
import type { ViewDefinition } from '../types';

import { LocaleController } from '../locale-controller';
import { coreMessages } from '../messages';
import { appHostOf, PAGE_HOST, type PageHost } from './host';

/** The content element a page holds: a view or a board. */
export type PageContentElement = HTMLElement & {
  readonly definition: AnyDefinition;
  readonly liveDefinition?: AnyDefinition;
  readonly api: ViewApi<unknown>;
  readonly controller: { replaceActions(actions: readonly unknown[]): void };
  /** Resolves once the content has read its own base and owns its controller, before the page hands it its draft. */
  readonly started?: Promise<void>;
  /** What the content's components registered, for the page's own derivation. */
  readonly componentSnapshot?: ComponentSnapshot | null;
  /** Resolves once the content is upgraded and has read its own base. */
  readonly ready?: Promise<void>;
  /** A board's own reset/fit; a view has no such viewport. */
  readonly resetView?: () => void;
  /** Present once Lit upgrades the content; an unupgraded element has nothing to render again. */
  requestUpdate?(): void;
};

/**
 * What a page found where its content belongs. `empty` and `unavailable` are
 * answers too: the app starts from them (with what it can render) and the page
 * reports the problem where its content would have been.
 */
export type PageContentState =
  | { readonly status: 'ready' }
  | { readonly status: 'empty' }
  | { readonly status: 'unavailable'; readonly tag: string };

/** Fired on the page whenever its content state settles, or changes after settling. */
export const PAGE_STATE_EVENT = 'dpk-page-state';

/**
 * How long a page waits for an entry that loads with the document before it
 * answers. The entries of the document are evaluated within it; the wait is
 * only a bound for a tag nothing will define (or a resource that never loads).
 */
const CONTENT_DEFINITION_GRACE_MS = 1_000;

const isContent = (element: Element): element is PageContentElement =>
  element.localName.startsWith('dpk-view-') || element.localName.startsWith('dpk-board-');

export const isPageContentState = (value: unknown): value is PageContentState => {
  if (typeof value !== 'object' || value === null || !('status' in value)) return false;
  if (value.status === 'ready' || value.status === 'empty') return true;
  return value.status === 'unavailable' && 'tag' in value && typeof value.tag === 'string';
};

/** What a page answers before its content upgrades; never a page that is actually in use. */
const EMPTY_DEFINITION: ViewDefinition<Record<string, never>> = {
  kind: 'view',
  name: 'page',
  label: 'Page',
  addable: false,
  parseBase: () => ({}),
  emptyBase: () => ({}),
  actions: {},
  apply: () => null,
  hasTarget: () => false,
  describe: (action) => ({ title: action.type, targetLabel: '', tone: 'meta' }),
  serialize: (action) => action.type,
  resolveNavigation: () => ({}),
  commentTargets: () => [],
  title: () => '',
};

const pageStyles = css`
  :host {
    display: block;
    height: 100%;
    min-width: 0;
    min-height: 0;
  }

  :host([hidden]) {
    display: none !important;
  }

  ::slotted(*) {
    height: 100%;
    min-width: 0;
    min-height: 0;
  }

  .dpk-page-notice {
    max-width: 46rem;
    margin: 24px;
    padding: 14px 16px;
    border: 1px solid var(--dpk-danger-rule, #c0483f);
    border-radius: 10px;
    background: var(--dpk-paper, #fff);
    color: var(--dpk-ink, #1a1a1a);
    font: 13px/1.5 var(--dpk-ui, system-ui, sans-serif);
  }

  .dpk-page-notice strong {
    display: block;
    margin-bottom: 4px;
  }

  .dpk-page-notice code {
    font-family: var(--dpk-mono, ui-monospace, monospace);
    font-size: 11px;
  }
`;

export class PageElement extends LitElement {
  static override styles: CSSResultGroup = pageStyles;

  static override properties = {
    name: { type: String },
    label: { type: String },
  };

  declare name: string | null;
  declare label: string | null;

  readonly #locale = new LocaleController(this);
  #content: PageContentElement | null = null;
  /** Whether `#content` has been read, so an empty page (`null`) is not re-inspected as unchanged. */
  #contentKnown = false;
  #contentState: PageContentState | null = null;
  #ready: Promise<void>;
  #resolveReady!: () => void;
  #resolveDelivered: (() => void) | undefined;
  readonly #deliveredPromise: Promise<void> = new Promise<void>((resolve) => {
    this.#resolveDelivered = resolve;
  });

  constructor() {
    super();
    this.#ready = new Promise((resolve) => {
      this.#resolveReady = resolve;
    });
  }

  /**
   * Resolves once the page knows what its content is: ready, empty, or a tag
   * nothing defines. Never waits for a definition that may not come, so the
   * app cannot be held up by one page's authoring mistake.
   */
  get ready(): Promise<void> {
    return this.#ready;
  }

  /** What the page found; `null` until its content has been inspected. */
  get contentState(): PageContentState | null {
    return this.#contentState;
  }

  /** The view or board this page holds, once it is there. */
  get content(): PageContentElement | null {
    return this.#content;
  }

  get definition(): AnyDefinition {
    return this.#content?.definition ?? EMPTY_DEFINITION;
  }

  get liveDefinition(): AnyDefinition {
    return this.#content?.liveDefinition ?? this.definition;
  }

  get api(): ViewApi<unknown> {
    if (this.#content === null) throw new Error('<dpk-page> has no view or board content');
    return this.#content.api;
  }

  get controller(): { replaceActions(actions: readonly unknown[]): void } {
    if (this.#content === null) throw new Error('<dpk-page> has no view or board content');
    return this.#content.controller;
  }

  /** What the content's components registered; the app derives with the same element action results. */
  get componentSnapshot(): ComponentSnapshot | null {
    return this.#content?.componentSnapshot ?? null;
  }

  /** Resolves once the app has handed this page's content its part of the draft and its navigation. */
  get delivered(): Promise<void> {
    return this.#deliveredPromise;
  }

  /** The app calls this once it has handed the content its state; idempotent. */
  deliver(): void {
    this.#resolveDelivered?.();
  }

  /** The app's host: the page and its content reach the app through this. */
  get [PAGE_HOST](): PageHost | null {
    return appHostOf(this);
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#findContent();
  }

  /** Asks the content to render again; the app calls this instead of `requestUpdate`. */
  refreshContent(): void {
    this.#content?.requestUpdate?.();
  }

  protected override render(): TemplateResult {
    return html`${this.#renderContentState()}<slot @slotchange=${() => this.#findContent()}></slot>`;
  }

  /** What the page says where its content would be, when it has none to show. */
  #renderContentState(): TemplateResult | typeof nothing {
    const state = this.#contentState;
    const messages = coreMessages(this.#locale.locale);
    if (state?.status === 'empty') {
      return html`<div class="dpk-page-notice" role="alert">
        <strong>${messages.pageEmpty}</strong>
        <span>${messages.pageEmptyHint}</span>
      </div>`;
    }
    if (state?.status === 'unavailable') {
      return html`<div class="dpk-page-notice" role="alert">
        <strong>${messages.pageUnavailable}</strong>
        <code>${messages.pageUnavailableHint(state.tag)}</code>
      </div>`;
    }
    return nothing;
  }

  #findContent(): void {
    const contents = Array.from(this.children).filter(isContent);
    const content = contents[0] ?? null;
    if (this.#contentKnown && content === this.#content) return;
    this.#contentKnown = true;
    this.#content = content;
    this.#contentState = null;
    if (content === null) {
      if (this.name !== null) console.warn(`[dev-process-kit] <dpk-page name="${this.name}"> holds no view or board`);
      this.#settle({ status: 'empty' });
      return;
    }
    // A board that is a page's whole subject fills the page's box; it does not
    // carry the marker itself (a view sets its own).
    if (content.localName.startsWith('dpk-board-')) content.setAttribute('data-dpk-page-content', '');
    if (contents.length > 1) {
      console.warn(
        `[dev-process-kit] <dpk-page name="${this.name}"> holds ${contents.length} views or boards; only the first is used`,
      );
    }
    void this.#inspect(content).then((state) => this.#applyContentState(content, state));
    // A definition may still arrive after the page answered `unavailable`
    // (an entry the URL asks for loads later, say); the page recovers on its own.
    void customElements.whenDefined(content.localName).then(() => {
      if (this.#content !== content || this.#contentState?.status !== 'unavailable') return;
      void this.#inspect(content).then((state) => this.#applyContentState(content, state));
    });
    this.requestUpdate();
  }

  #applyContentState(content: PageContentElement, state: PageContentState): void {
    // The content may have been replaced while its definition was pending.
    if (this.#content !== content) return;
    this.#settle(state);
    if (state.status !== 'ready') return;
    this.requestUpdate();
    // A page-content board opens fitted, the way entering fullscreen re-fits it.
    if (content.localName.startsWith('dpk-board-')) requestAnimationFrame(() => content.resetView?.());
  }

  async #inspect(content: PageContentElement): Promise<PageContentState> {
    const tag = content.localName;
    if (!(await this.#defined(tag))) {
      console.error(`[dev-process-kit] <dpk-page name="${this.name}"> holds <${tag}>, which no loaded entry defines`);
      return { status: 'unavailable', tag };
    }
    // A page waits for the content's base, not for its `api.ready`: a page's
    // content resolves that only after this page has handed it its draft.
    // A board has no `started` of its own; its api is ready as soon as it is defined.
    const ready = content.started ?? content.ready ?? content.api?.ready;
    if (ready !== undefined) await ready;
    return { status: 'ready' };
  }

  /**
   * Whether the content's tag is defined, waiting for an entry that loads with
   * the document (a module script that registers it, whatever the order of the
   * page and the entry). The wait is bounded: once the document has loaded, or
   * after a grace period (a resource that never loads keeps `load` pending),
   * the page answers `false` and shows why. A definition that still arrives
   * later is caught by `customElements.whenDefined` in `#findContent`.
   */
  async #defined(tag: string): Promise<boolean> {
    if (customElements.get(tag) !== undefined) return true;
    if (document.readyState === 'complete') return false;
    return new Promise<boolean>((resolve) => {
      const finish = (defined: boolean): void => {
        clearTimeout(timeout);
        window.removeEventListener('load', onLoad);
        resolve(defined);
      };
      const onLoad = (): void => finish(customElements.get(tag) !== undefined);
      const timeout = setTimeout(() => finish(customElements.get(tag) !== undefined), CONTENT_DEFINITION_GRACE_MS);
      window.addEventListener('load', onLoad, { once: true });
      // A definition that arrives before the bound answers at once, however slowly the document loads.
      void customElements.whenDefined(tag).then(() => finish(true));
    });
  }

  #settle(state: PageContentState): void {
    const previous = this.#contentState;
    const changed =
      previous === null ||
      previous.status !== state.status ||
      (state.status === 'unavailable' && previous.status === 'unavailable' && previous.tag !== state.tag);
    this.#contentState = state;
    this.#resolveReady();
    if (changed) {
      this.dispatchEvent(
        new CustomEvent<PageContentState>(PAGE_STATE_EVENT, { detail: state, bubbles: true, composed: true }),
      );
    }
    this.requestUpdate();
  }
}
