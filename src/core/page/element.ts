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
 * A page with no content, or with more than one, is an authoring mistake:
 * the app reports it in development and the page renders nothing.
 */
import { css, html, LitElement, type CSSResultGroup, type TemplateResult } from 'lit';

import type { AnyDefinition } from '../app/definition';
import type { ViewApi } from '../shell/contracts';
import type { ViewDefinition } from '../types';

import { APP_TAG, PAGE_HOST, type PageHost } from './host';

/** The content element a page holds: a view or a board. */
export type PageContentElement = HTMLElement & {
  readonly definition: AnyDefinition;
  readonly liveDefinition?: AnyDefinition;
  readonly api: ViewApi<unknown>;
  readonly controller: { replaceActions(actions: readonly unknown[]): void };
  /** Resolves once the content is upgraded and has read its own base. */
  readonly ready?: Promise<void>;
  /** A board's own reset/fit; a view has no such viewport. */
  readonly resetView?: () => void;
  requestUpdate(): void;
};

const isContent = (element: Element): element is PageContentElement =>
  element.localName.startsWith('dpk-view-') || element.localName.startsWith('dpk-board-');

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
`;

export class PageElement extends LitElement {
  static override styles: CSSResultGroup = pageStyles;

  static override properties = {
    name: { type: String },
    label: { type: String },
  };

  declare name: string | null;
  declare label: string | null;

  #content: PageContentElement | null = null;
  #ready: Promise<void>;
  #resolveReady!: () => void;

  constructor() {
    super();
    this.#ready = new Promise((resolve) => {
      this.#resolveReady = resolve;
    });
  }

  /** Resolves once the content is upgraded and has read its base. */
  get ready(): Promise<void> {
    return this.#ready;
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

  /** The app's host: the page and its content reach the app through this. */
  get [PAGE_HOST](): PageHost | null {
    const app = this.parentElement;
    if (app?.localName !== APP_TAG) return null;
    const host: unknown = Reflect.get(app, PAGE_HOST);
    return isPageHost(host) ? host : null;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#findContent();
  }

  /** Asks the content to render again; the app calls this instead of `requestUpdate`. */
  refreshContent(): void {
    this.#content?.requestUpdate();
  }

  protected override render(): TemplateResult {
    return html`<slot @slotchange=${() => this.#findContent()}></slot>`;
  }

  #findContent(): void {
    const contents = Array.from(this.children).filter(isContent);
    const content = contents[0] ?? null;
    if (content === this.#content) return;
    this.#content = content;
    if (content === null) {
      if (this.name !== null) console.warn(`[dev-process-kit] <dpk-page name="${this.name}"> holds no view or board`);
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
    // The content may still be an unupgraded element when the page connects: wait for
    // its definition before reading `ready`/`api`, so a board entry that arrives after
    // the page cannot strand the page's own ready promise.
    const ready =
      content.ready ?? customElements.whenDefined(content.localName).then(() => content.ready ?? content.api.ready);
    void ready.then(() => {
      this.#resolveReady();
      this.requestUpdate();
      // A page-content board opens fitted, the way entering fullscreen re-fits it.
      if (content.localName.startsWith('dpk-board-')) requestAnimationFrame(() => content.resetView?.());
    });
    this.requestUpdate();
  }
}

const isPageHost = (value: unknown): value is PageHost =>
  typeof value === 'object' && value !== null && 'dispatch' in value && 'navigation' in value;
