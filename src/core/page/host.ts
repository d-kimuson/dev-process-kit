/**
 * What a board asks of the page it sits in.
 *
 * A board is any element — a `dpk-template-*`, or a diagram acting as its
 * own board (ADR 20261023_diagram-as-board) — with a `board="<id>"`
 * attribute directly inside `<dpk-page>`. It keeps rendering its regions but
 * leaves the draft, the hash and the review to the page: everything it would
 * have done to its own shell goes through this host, with targets and
 * navigation already in the page's terms.
 */
import type { Locale } from '../i18n';
import type { ActionInput, BatchDispatchOutcome, DispatchOutcome, Navigation, NavigationPatch } from '../types';

import { BOARD_ID_PATTERN } from './board-target';

export const PAGE_TAG = 'dpk-page';
export const BOARD_ATTRIBUTE = 'board';
/** Marks a board the page made for a board the draft added; its base JSON is not written yet. */
export const DRAFT_BOARD_ATTRIBUTE = 'data-dpk-draft-board';

/** The page publishes its host under this key, so a board can find it without importing the page. */
export const BOARD_HOST: unique symbol = Symbol.for('dev-process-kit.board-host');

export type BoardHost = {
  locale(): Locale;
  /** The resolved scheme the page stamped on itself; a board takes the same one. */
  theme(): string | undefined;
  /** The page's resolved navigation, every board's keys prefixed. */
  navigation(): Navigation;
  boardIds(): ReadonlySet<string>;
  dispatch(input: ActionInput): DispatchOutcome;
  dispatchBatch(inputs: readonly ActionInput[]): BatchDispatchOutcome;
  editComment(id: string, body: string): DispatchOutcome;
  removeAction(id: string): void;
  clearActions(): void;
  navigate(patch: NavigationPatch, options?: { replace?: boolean }): void;
  hashFor(patch: NavigationPatch): string;
  requestComment(target: string): void;
  /** Enters or leaves focus (present) mode: the page's own header hidden, a board's full area kept. */
  setFocus(active: boolean): void;
  focused(): boolean;
};

/**
 * The board id of an element directly inside `<dpk-page>`, read from the
 * markup alone: the page may not be upgraded yet when its boards connect.
 */
export const boardIdOf = (element: Element): string | null => {
  if (element.parentElement?.localName !== PAGE_TAG) return null;
  const id = element.getAttribute(BOARD_ATTRIBUTE);
  return id !== null && BOARD_ID_PATTERN.test(id) ? id : null;
};

/** The page's host, once the page is upgraded. */
export const boardHostOf = (element: Element): BoardHost | null => {
  const page = element.parentElement;
  if (page === null || !(BOARD_HOST in page)) return null;
  const host: unknown = page[BOARD_HOST];
  return isBoardHost(host) ? host : null;
};

const isBoardHost = (value: unknown): value is BoardHost =>
  typeof value === 'object' && value !== null && 'dispatch' in value && 'navigation' in value;
