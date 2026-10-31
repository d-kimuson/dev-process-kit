/**
 * What a page asks of the app it sits in.
 *
 * A page is a direct child of `<dpk-app>` with a `name="<id>"` attribute. It
 * holds exactly one view (`dpk-view-*`) or board (`dpk-board-*`) as its
 * content, proxies that content's definition, api and controller, and leaves
 * the draft, the hash and the review to the app: everything the content would
 * have done to its own shell goes through this host, with targets and
 * navigation already in the app's terms.
 */
import type { Locale } from '../i18n';
import type { ActionInput, BatchDispatchOutcome, DispatchOutcome, Navigation, NavigationPatch } from '../types';

import { PAGE_NAME_PATTERN } from './page-target';

export const PAGE_TAG = 'dpk-page';
export const APP_TAG = 'dpk-app';
export const PAGE_NAME_ATTRIBUTE = 'name';
/** Names the page the draft added, for as long as the page is in the draft rather than the markup. */
export const DRAFT_PAGE_ATTRIBUTE = 'data-dpk-draft-page';

/**
 * Whether the element is a page the draft added, or the view or board that page
 * holds. The page owns the mark; its content reads it to know that it may
 * start without a base JSON, which the agent writes from the draft.
 */
export const inDraftPage = (element: Element): boolean =>
  element.hasAttribute(DRAFT_PAGE_ATTRIBUTE) || element.parentElement?.hasAttribute(DRAFT_PAGE_ATTRIBUTE) === true;

/** The app publishes its host under this key, so a page can find it without importing the app. */
export const PAGE_HOST: unique symbol = Symbol.for('dev-process-kit.page-host');

export type PageHost = {
  locale(): Locale;
  /** The resolved scheme the app stamped on itself; a page takes the same one. */
  theme(): string | undefined;
  /** The app's resolved navigation, every page's keys prefixed. */
  navigation(): Navigation;
  pageNames(): ReadonlySet<string>;
  dispatch(input: ActionInput): DispatchOutcome;
  dispatchBatch(inputs: readonly ActionInput[]): BatchDispatchOutcome;
  editComment(id: string, body: string): DispatchOutcome;
  removeAction(id: string): void;
  clearActions(): void;
  navigate(patch: NavigationPatch, options?: { replace?: boolean }): void;
  hashFor(patch: NavigationPatch): string;
  requestComment(target: string): void;
};

const readName = (element: Element): string | null => {
  const name = element.getAttribute(PAGE_NAME_ATTRIBUTE);
  return name !== null && PAGE_NAME_PATTERN.test(name) ? name : null;
};

/** An element that publishes a host under `PAGE_HOST`, whatever entry defined it. */
type PageHostHolder = Element & { readonly [PAGE_HOST]?: unknown };

const holdsPageHost = (element: Element): element is PageHostHolder => PAGE_HOST in element;

/** The host an element publishes, read structurally: a page may not share the app's class. */
const publishedHost = (element: Element): PageHost | null => {
  if (!holdsPageHost(element)) return null;
  const host = element[PAGE_HOST];
  return isPageHost(host) ? host : null;
};

/**
 * The name of the page a content element belongs to, read from the markup
 * alone: the page may not be upgraded yet when its content connects.
 */
export const pageNameOf = (element: Element): string | null => {
  const parent = element.parentElement;
  return parent?.localName === PAGE_TAG ? readName(parent) : null;
};

/** The name of a page element directly inside the app, read from its own `name` attribute. */
export const appPageNameOf = (element: Element): string | null =>
  element.parentElement?.localName === APP_TAG ? readName(element) : null;

/** The page's host, once the page is upgraded. */
export const pageHostOf = (element: Element): PageHost | null => {
  const page = element.parentElement;
  if (page === null || page.localName !== PAGE_TAG) return null;
  return publishedHost(page);
};

/**
 * The delivery signal of the page that holds this content: resolves once the
 * app has handed the page its part of the draft and its navigation, which is
 * what a page content's `api.ready` waits for. `null` outside a page.
 */
export const pageDeliveryOf = (element: Element): Promise<void> | null => {
  const page = element.parentElement;
  if (page === null || page.localName !== PAGE_TAG) return null;
  const delivered: unknown = Reflect.get(page, 'delivered');
  return delivered instanceof Promise ? delivered : null;
};

/** The app's host, for a page (or a content element that sits directly inside the app). */
export const appHostOf = (element: Element): PageHost | null => {
  const app = element.parentElement;
  if (app === null || app.localName !== APP_TAG) return null;
  return publishedHost(app);
};

const isPageHost = (value: unknown): value is PageHost =>
  typeof value === 'object' && value !== null && 'dispatch' in value && 'navigation' in value;
