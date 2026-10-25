/**
 * Check Mode's badges: every element already marked `data-dpk-target` (the
 * same marker the change notices' "Show" already reveals) gets a badge at
 * its top-right corner while Check Mode is on, showing whether the reader
 * has checked it off, and turning into a "needs another look" mark once the
 * change log records something about it afterwards (`../check-mode`).
 */
import { render, type ReactiveController, type ReactiveControllerHost } from 'lit';

import type { ChangeLog } from '../changes';

import { queryAllDeep } from '../../lib/dom/deep';
import { statusOf, type CheckState, type CheckStatus } from '../check-mode';
import { iconCheck, iconQuestion } from '../icons';
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

const BADGE_CSS = `
  .dpk-check-portal {
    position: absolute;
    inset: 0;
    z-index: 6;
    pointer-events: none;
  }

  .dpk-check-badge {
    position: absolute;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    padding: 0;
    border: 2px solid var(--dpk-paper-raised);
    border-radius: 999px;
    background: var(--dpk-paper-raised);
    color: var(--dpk-ink-soft);
    box-shadow: var(--dpk-shadow-sm);
    cursor: pointer;
    pointer-events: auto;
    transform: translate(-50%, -50%) scale(var(--dpk-zoom-inverse, 1));
    transform-origin: center;
    transition:
      box-shadow 160ms var(--dpk-ease),
      background 160ms var(--dpk-ease),
      color 160ms var(--dpk-ease);
  }

  .dpk-check-badge svg {
    width: 13px;
    height: 13px;
  }

  .dpk-check-badge:hover {
    box-shadow: var(--dpk-shadow-md);
    background: var(--dpk-paper-inset);
  }

  .dpk-check-badge[data-status='checked'] {
    border-color: var(--dpk-green);
    background: linear-gradient(180deg, color-mix(in srgb, var(--dpk-green) 85%, white), var(--dpk-green));
    color: var(--dpk-accent-ink);
  }

  .dpk-check-badge[data-status='stale'] {
    border-color: var(--dpk-amber);
    background: linear-gradient(180deg, color-mix(in srgb, var(--dpk-amber) 85%, white), var(--dpk-amber));
    color: var(--dpk-accent-ink);
  }

  .dpk-check-badge:focus-visible {
    outline: none;
    box-shadow: var(--dpk-focus);
  }
`;

export type CheckModeBadgeOptions = {
  /** Check Mode is on: without marks there are no badges. */
  readonly active: () => boolean;
  /** The marks, in render order. */
  readonly bindings: () => readonly CheckBadgeBinding[];
  /** One click on a badge. */
  readonly onToggle: (ref: string) => void;
  /** The accessible label for a mark's status, in the view's language. */
  readonly labelOf: (status: CheckStatus) => string;
};

type BadgeRecord = {
  readonly target: Element;
  readonly button: HTMLButtonElement;
  readonly portal: HTMLElement;
  readonly parent: HTMLElement;
};

type Portal = { readonly layer: HTMLElement };

/** Tags that cannot contain an absolutely positioned HTML portal. */
const TABLE_TAGS = new Set(['TABLE', 'THEAD', 'TBODY', 'TFOOT', 'TR', 'COLGROUP']);

/**
 * The box a badge can be positioned in. A board node's offsetParent is its
 * world (which itself is transformed by the canvas), so offset coordinates
 * keep the badge on the node through a fit, a pan and a zoom. A table row has
 * no such box, so fall back to the nearest positioned ancestor and measure.
 */
const portalParentOf = (target: Element): HTMLElement | null => {
  const offsetParent = target instanceof HTMLElement ? target.offsetParent : null;
  if (offsetParent instanceof HTMLElement && !TABLE_TAGS.has(offsetParent.localName.toUpperCase())) return offsetParent;
  // jsdom has no offsetParent; a real browser gives a table row none either. Stay
  // inside the board's own tree so the portal moves with its content.
  let parent = target.parentElement;
  while (parent !== null && TABLE_TAGS.has(parent.localName.toUpperCase())) parent = parent.parentElement;
  return parent ?? document.body;
};

/**
 * Check Mode's badges: each mark gets a button in a portal inside the mark's
 * own positioned parent, so the badge shares the target's coordinate space
 * rather than the view's viewport. A canvas fit, pan, zoom or a scroll moves
 * the target and the badge together; a small frame loop only refreshes the
 * offset after a drag.
 */
export class CheckModeBadgeController implements ReactiveController {
  readonly #options: CheckModeBadgeOptions;
  readonly #records = new Map<string, BadgeRecord>();
  readonly #portals = new Map<HTMLElement, Portal>();
  #frame: number | null = null;

  constructor(host: ReactiveControllerHost & HTMLElement, options: CheckModeBadgeOptions) {
    this.#options = options;
    host.addController(this);
  }

  hostDisconnected(): void {
    this.#stopLoop();
    this.#clear();
  }

  hostUpdated(): void {
    if (!this.#options.active()) {
      this.#stopLoop();
      this.#clear();
      return;
    }
    this.#sync();
    this.#startLoop();
  }

  #sync(): void {
    const bindings = this.#options.bindings();
    const seen = new Set<string>();
    for (const binding of bindings) {
      const key = `${binding.index}:${binding.ref}`;
      seen.add(key);
      let record = this.#records.get(key);
      if (record === undefined || record.target !== binding.target) {
        if (record !== undefined) this.#removeRecord(record);
        const created = this.#createRecord(binding.target, key);
        if (created === null) continue;
        this.#records.set(key, created);
        record = created;
      }
      if (record === undefined) continue;
      this.#updateRecord(record, binding);
    }
    for (const [key, record] of this.#records) {
      if (seen.has(key)) continue;
      this.#removeRecord(record);
      this.#records.delete(key);
    }
    for (const [parent, portal] of this.#portals) {
      if (portal.layer.querySelector('.dpk-check-badge') !== null) continue;
      portal.layer.remove();
      this.#portals.delete(parent);
    }
  }

  #createRecord(target: Element, key: string): BadgeRecord | null {
    const parent = portalParentOf(target);
    if (parent === null) return null;
    const portal = this.#portal(parent);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'dpk-check-badge';
    button.dataset['checkKey'] = key;
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.#options.onToggle(button.dataset['checkRef'] ?? '');
    });
    portal.layer.append(button);
    return { target, button, portal: portal.layer, parent };
  }

  #portal(parent: HTMLElement): Portal {
    const existing = this.#portals.get(parent);
    if (existing !== undefined) return existing;
    const layer = document.createElement('div');
    layer.className = 'dpk-check-portal';
    const style = document.createElement('style');
    style.textContent = BADGE_CSS;
    layer.append(style);
    parent.append(layer);
    const portal = { layer };
    this.#portals.set(parent, portal);
    return portal;
  }

  #updateRecord(record: BadgeRecord, binding: CheckBadgeBinding): void {
    const { button } = record;
    button.dataset['checkRef'] = binding.ref;
    button.dataset['status'] = binding.status;
    const label = this.#options.labelOf(binding.status);
    button.setAttribute('aria-label', label);
    button.title = label;
    render(binding.status === 'stale' ? iconQuestion() : iconCheck(), button);
    button.hidden = binding.target.getClientRects().length === 0;
    this.#place(record);
  }

  #place(record: BadgeRecord): void {
    const { button, parent, target } = record;
    if (target instanceof HTMLElement && parent === target.offsetParent) {
      button.style.left = `${target.offsetLeft + target.offsetWidth}px`;
      button.style.top = `${target.offsetTop}px`;
      return;
    }
    const targetRect = target.getBoundingClientRect();
    const parentRect = parent.getBoundingClientRect();
    button.style.left = `${targetRect.right - parentRect.left + parent.scrollLeft}px`;
    button.style.top = `${targetRect.top - parentRect.top + parent.scrollTop}px`;
  }

  #removeRecord(record: BadgeRecord): void {
    record.button.remove();
    if (record.portal.querySelector('.dpk-check-badge') === null) {
      record.portal.remove();
      this.#portals.delete(record.parent);
    }
  }

  #clear(): void {
    for (const record of this.#records.values()) record.button.remove();
    this.#records.clear();
    for (const portal of this.#portals.values()) portal.layer.remove();
    this.#portals.clear();
  }

  #startLoop(): void {
    if (this.#frame !== null) return;
    this.#frame = requestAnimationFrame(this.#tick);
  }

  #stopLoop(): void {
    if (this.#frame === null) return;
    cancelAnimationFrame(this.#frame);
    this.#frame = null;
  }

  #tick = (): void => {
    this.#frame = null;
    if (!this.#options.active()) return;
    for (const record of this.#records.values()) this.#place(record);
    this.#frame = requestAnimationFrame(this.#tick);
  };
}
