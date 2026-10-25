/**
 * Check Mode's badges: every element already marked `data-dpk-target` (the
 * same marker the change notices' "Show" already reveals) gets a badge at
 * its top-right corner while Check Mode is on, showing whether the reader
 * has checked it off, and turning into a "needs another look" mark once the
 * change log records something about it afterwards (`../check-mode`).
 */
import type { ReactiveController, ReactiveControllerHost } from 'lit';

import type { ChangeLog } from '../changes';

import { queryAllDeep } from '../../lib/dom/deep';
import { statusOf, type CheckState, type CheckStatus } from '../check-mode';
import { positionBadges as positionBadgesOn } from './badge-dom';
import { TARGET_ATTRIBUTE } from './reveal';

/**
 * Opts a subtree out of Check Mode: `data-dpk-check="off"` on, or above, an
 * element that carries `data-dpk-target`. Check Mode tallies the things a
 * reader works through — cards, nodes, participants — so a relation line, a
 * link or a message that is marked for the change log's "Show" must say it is
 * not one of them rather than lose the target marker "Show" depends on.
 */
export const CHECK_ATTRIBUTE = 'data-dpk-check';

/** The one value `CHECK_ATTRIBUTE` reads: not a checkable target. */
export const CHECK_OFF = 'off';

const isCheckable = (target: Element): boolean => target.closest(`[${CHECK_ATTRIBUTE}="${CHECK_OFF}"]`) === null;

export type CheckBadgeBinding = {
  /** Index into the rendered badges, which is also the render order. */
  readonly index: number;
  readonly target: Element;
  readonly ref: string;
  readonly status: CheckStatus;
};

/**
 * Every checkable `data-dpk-target` element under `host` (its own light DOM,
 * its shadow root, and any nested shadow roots): part of a subtree opted out
 * with `CHECK_ATTRIBUTE` is skipped.
 */
export const collectCheckBindings = (
  host: HTMLElement,
  state: CheckState,
  log: ChangeLog | null,
): readonly CheckBadgeBinding[] => {
  if (!state.enabled) return [];
  const bindings: CheckBadgeBinding[] = [];
  for (const target of queryAllDeep(host, `[${TARGET_ATTRIBUTE}]`)) {
    const ref = target.getAttribute(TARGET_ATTRIBUTE);
    if (ref === null || ref === '' || !isCheckable(target)) continue;
    bindings.push({ index: bindings.length, target, ref, status: statusOf(state, ref, log) });
  }
  return bindings;
};

/**
 * The shadow roots a scroll can happen inside around `host` without ever
 * reaching the document: every shadow root the host renders, and every one
 * between it and the document. A `scroll` event is not composed, so one
 * raised inside a shadow root stops at that root — and the shell's own
 * scrolling column can live in an app's shadow root, above the page and view
 * hosts it holds, where no listener under those hosts would ever see it.
 */
export const scrollRootsAround = (host: Element): readonly ShadowRoot[] => {
  const roots = new Set<ShadowRoot>();
  // What the host renders, and what its own shadow root renders, however deeply nested.
  for (const element of [host, ...host.querySelectorAll('*'), ...(host.shadowRoot?.querySelectorAll('*') ?? [])]) {
    if (element.shadowRoot !== null) roots.add(element.shadowRoot);
  }
  // Every shadow root above the host, including a host rendered in an outer
  // shadow tree (a view slotted into an app whose scrolling column lives in
  // that app's shadow root). A scroll there never crosses down to the view.
  let node: Node | null = host;
  while (node !== null) {
    if (node instanceof Element && node.shadowRoot !== null) roots.add(node.shadowRoot);
    if (node.parentNode !== null) node = node.parentNode;
    else if (node instanceof ShadowRoot) node = node.host;
    else break;
  }
  return [...roots];
};

/** Always the target's corner: unlike the grill's Q badges, Check Mode never uses the author's-markup gutter. */
export const positionCheckBadges = (layer: HTMLElement, bindings: readonly CheckBadgeBinding[]): void => {
  positionBadgesOn(layer, bindings, { gutterOf: () => false });
};

export type CheckModeBadgeOptions = {
  readonly active: () => boolean;
  /** The layers the badges are drawn on: the main column's, and the sidebar's when it has marks. */
  readonly layers: () => readonly HTMLElement[];
  readonly bindings: () => readonly CheckBadgeBinding[];
};

const OBSERVED: MutationObserverInit = {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: [TARGET_ATTRIBUTE],
};

/**
 * Keeps the badges on their marks, mirroring `GrillBadgeController`: bindings
 * are collected by the render that draws them; this re-renders when marks
 * change, and moves the badges when the page scrolls, resizes, or a diagram
 * pans.
 */
export class CheckModeBadgeController implements ReactiveController {
  readonly #host: ReactiveControllerHost & HTMLElement;
  readonly #options: CheckModeBadgeOptions;
  #observer: MutationObserver | null = null;
  #pending = false;
  /** The marks of the host's own shadow root at the last update. */
  #ownMarks = '';
  /** Shadow roots listened to for scrolls: a scroll inside one never reaches the document. */
  readonly #scrollRoots = new Set<ShadowRoot>();

  constructor(host: ReactiveControllerHost & HTMLElement, options: CheckModeBadgeOptions) {
    this.#host = host;
    this.#options = options;
    host.addController(this);
  }

  hostConnected(): void {
    document.addEventListener('scroll', this.#schedule, true);
    window.addEventListener('resize', this.#schedule);
    this.#host.addEventListener('dpk-diagram-view', this.#schedule);
    this.#host.addEventListener('dpk-canvas-change', this.#schedule);
  }

  hostDisconnected(): void {
    document.removeEventListener('scroll', this.#schedule, true);
    window.removeEventListener('resize', this.#schedule);
    this.#host.removeEventListener('dpk-diagram-view', this.#schedule);
    this.#host.removeEventListener('dpk-canvas-change', this.#schedule);
    this.#observer?.disconnect();
    this.#observer = null;
    for (const root of this.#scrollRoots) root.removeEventListener('scroll', this.#schedule, true);
    this.#scrollRoots.clear();
  }

  hostUpdated(): void {
    this.#observer?.disconnect();
    if (!this.#options.active()) return;
    const ownMarks = this.#ownMarksOf();
    if (ownMarks !== this.#ownMarks) {
      this.#ownMarks = ownMarks;
      this.#host.requestUpdate();
    }
    this.#observer ??= new MutationObserver(() => {
      this.#host.requestUpdate();
      this.#schedule();
    });
    this.#observer.observe(this.#host, OBSERVED);
    for (const element of this.#host.querySelectorAll('*')) {
      if (element.shadowRoot) this.#observer.observe(element.shadowRoot, OBSERVED);
    }
    this.#listenForScrolls();
    this.#schedule();
  }

  /** Places every badge again now, e.g. as soon as a top-layer layer has been shown (`./check-mode-top-layer`). */
  refresh(): void {
    this.#schedule();
  }

  #listenForScrolls(): void {
    for (const root of scrollRootsAround(this.#host)) {
      if (this.#scrollRoots.has(root)) continue;
      root.addEventListener('scroll', this.#schedule, true);
      this.#scrollRoots.add(root);
    }
  }

  #ownMarksOf(): string {
    const marks = this.#host.shadowRoot?.querySelectorAll(`[${TARGET_ATTRIBUTE}]`) ?? [];
    return Array.from(marks, (mark) => mark.getAttribute(TARGET_ATTRIBUTE) ?? '').join('|');
  }

  #schedule = (): void => {
    if (this.#pending || !this.#options.active()) return;
    this.#pending = true;
    requestAnimationFrame(() => {
      this.#pending = false;
      const bindings = this.#options.bindings();
      for (const layer of this.#options.layers()) positionCheckBadges(layer, bindings);
    });
  };
}
