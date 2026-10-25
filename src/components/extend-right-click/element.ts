import { LitElement, css, html, type CSSResultGroup } from 'lit';

import type {
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuRequest,
  ContextMenuSubmenu,
} from '../../core/context-menu/types';

import { observeJsonChild } from '../../lib/dom/base-data';
import { copyText } from '../../lib/dom/clipboard';
import { composedAncestors } from '../../lib/dom/deep';
import {
  DEFAULT_RUN_EVENT,
  parseExtendRightClickData,
  type ExtendRightClickConfig,
  type ExtendRightClickEntry,
  type ExtendRightClickGroup,
  type ExtendRightClickItem,
  type ExtendRightClickSubmenu,
  type ExtendRightClickTarget,
} from './model';

const TAG = 'dpk-extend-right-click';
const WARN_PREFIX = `[dev-process-kit] ${TAG}: `;

/** `copy: "text"` reads `textContent`; every other value names an attribute. */
const TEXT_COPY = 'text';

/** What a run item puts in its event's `detail`. */
export type ExtendRightClickRunDetail = {
  /** The item's id (also `item`, for symmetry with `group`). */
  readonly id: string;
  /** The id of the group the item sits in. */
  readonly group: string;
  readonly item: string;
  /** Which target matched, as authored. */
  readonly target: { readonly selector: string; readonly label: string | null };
  /** The element the click landed on or the nearest ancestor a target selector matched. */
  readonly element: Element;
  /** The item's own `detail` object, or `{}` when it has none. */
  readonly authored: Record<string, unknown>;
};

/**
 * The elements from `origin` up to but excluding `wrapper`, nearest first, or
 * `null` when `wrapper` is not a composed ancestor of `origin`.
 *
 * `composedAncestors(origin, origin)` never meets its own `stop`, so it walks
 * the whole composed chain to the document; where `wrapper` sits in that chain
 * then says both whether the click is inside it and how far below it.
 */
const elementsBelow = (origin: Element, wrapper: Element): readonly Element[] | null => {
  const above = composedAncestors(origin, origin);
  const index = above.indexOf(wrapper);
  if (index === -1) return null;
  return [origin, ...above.slice(0, index)];
};

/** The value a `copy` entry would put on the clipboard, or `null` when the source has none. */
const copyValue = (element: Element, source: string): string | null => {
  const value = source === TEXT_COPY ? element.textContent : element.getAttribute(source);
  const trimmed = value?.trim() ?? '';
  return trimmed === '' ? null : trimmed;
};

const matchesSelector = (element: Element, selector: string, warned: Set<string>): boolean => {
  try {
    return element.matches(selector);
  } catch {
    if (!warned.has(selector)) {
      warned.add(selector);
      console.warn(`${WARN_PREFIX}invalid target selector ${JSON.stringify(selector)} ignored`);
    }
    return false;
  }
};

/**
 * `<dpk-extend-right-click>` — author your own right-click entries in JSON
 * instead of writing a component: wrap the markup, list the selectors it
 * applies to, and each group of entries shows up in the page-wide context menu
 * when a right-click lands on (or inside) a matching element.
 *
 * It is a light-DOM wrapper (`display: contents`): its children are slotted
 * untouched, it renders no chrome of its own, and it contributes nothing but
 * `getContextMenuItems` to whatever is around it. That also means it needs a
 * context-menu host above it — a `dpk-view-*` subtree (an embedded board
 * included); a standalone board page has none today.
 */
export class DpkExtendRightClick extends LitElement {
  static override styles: CSSResultGroup = css`
    :host {
      display: contents;
    }
  `;

  static override properties = { config: { attribute: false } };

  /** The menu to contribute; wins over the JSON child while set. */
  declare config: ExtendRightClickConfig | null;

  #authored: ExtendRightClickConfig | null = null;
  #error: string | null = null;
  #disposeData: (() => void) | null = null;
  /** The `config` property's parse, kept beside the value it came from so a right-click never re-parses. */
  #parsedConfig: { readonly raw: unknown; readonly parsed: ExtendRightClickConfig | null } | null = null;

  constructor() {
    super();
    this.config = null;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#disposeData = observeJsonChild(this, parseExtendRightClickData, (result) => {
      if (result.ok) {
        this.#authored = result.value;
        this.#error = null;
        return;
      }
      this.#authored = null;
      this.#error = result.error;
      console.warn(`${WARN_PREFIX}JSON child ignored: ${result.error}`);
    });
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#disposeData?.();
    this.#disposeData = null;
  }

  /** Why the JSON child contributes no menu, if it failed to parse (read-only). */
  get error(): string | null {
    return this.#error;
  }

  /**
   * The declarative contribution: the nearest target selector that matches the
   * clicked element or one of its ancestors inside this wrapper, mapped to menu
   * groups. `null` — no menu, nothing to say — when there is no origin, when
   * the click is not inside this wrapper, or when another wrapper sits between
   * the two (that one owns the click).
   */
  getContextMenuItems(request: ContextMenuRequest): readonly ContextMenuGroup[] | null {
    const config = this.#config();
    if (config === null) return null;
    const origin = request.origin ?? null;
    if (!(origin instanceof Element)) return null;
    const below = elementsBelow(origin, this);
    if (below === null) return null;
    // The nearest wrapper handles the click; an outer one stays silent.
    if (below.some((element) => element.localName === TAG)) return null;
    const match = this.#match(below, config);
    if (match === null) return null;
    const groups = this.#groups(match.target, match.element);
    return groups.length === 0 ? null : groups;
  }

  protected override render(): unknown {
    return html`<slot></slot>`;
  }

  /**
   * The config in force: the `config` property (parsed once per value, so a
   * hand-written one is checked the same way a JSON child is) wins over the
   * JSON child. A config that fails to parse warns and contributes nothing.
   */
  #config(): ExtendRightClickConfig | null {
    if (this.config === null) return this.#authored;
    if (this.#parsedConfig?.raw !== this.config) {
      this.#parsedConfig = { raw: this.config, parsed: this.#parse(this.config) };
    }
    return this.#parsedConfig.parsed;
  }

  #parse(input: unknown): ExtendRightClickConfig | null {
    try {
      return parseExtendRightClickData(input);
    } catch (error) {
      console.warn(`${WARN_PREFIX}config ignored: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  /** The nearest element in `below` matching any target, with the target it matched. */
  #match(
    below: readonly Element[],
    config: ExtendRightClickConfig,
  ): { readonly target: ExtendRightClickTarget; readonly element: Element } | null {
    const warned = new Set<string>();
    for (const element of below) {
      for (const target of config.targets) {
        if (matchesSelector(element, target.selector, warned)) return { target, element };
      }
    }
    return null;
  }

  #groups(target: ExtendRightClickTarget, element: Element): readonly ContextMenuGroup[] {
    return target.groups.flatMap((group) => {
      const entries = this.#entries(group.entries, group, target, element);
      if (entries.length === 0) return [];
      return [
        group.heading === undefined ? { id: group.id, entries } : { id: group.id, heading: group.heading, entries },
      ];
    });
  }

  /** Closures are built here and only here: the model stays data. */
  #entries(
    entries: readonly ExtendRightClickEntry[],
    group: ExtendRightClickGroup,
    target: ExtendRightClickTarget,
    element: Element,
  ): readonly (ContextMenuItem | ContextMenuSubmenu)[] {
    return entries.flatMap((entry): readonly (ContextMenuItem | ContextMenuSubmenu)[] =>
      entry.kind === 'submenu'
        ? this.#submenu(entry, group, target, element)
        : this.#item(entry, group, target, element),
    );
  }

  #submenu(
    entry: ExtendRightClickSubmenu,
    group: ExtendRightClickGroup,
    target: ExtendRightClickTarget,
    element: Element,
  ): readonly ContextMenuSubmenu[] {
    const items = this.#entries(entry.entries, group, target, element);
    // An empty flyout is a dead end in the menu; leave it out.
    return items.length === 0 ? [] : [{ kind: 'submenu', id: entry.id, label: entry.label, items }];
  }

  #item(
    entry: ExtendRightClickItem,
    group: ExtendRightClickGroup,
    target: ExtendRightClickTarget,
    element: Element,
  ): readonly ContextMenuItem[] {
    const copied = entry.copy === undefined ? null : copyValue(element, entry.copy);
    // `copy` with nothing to copy is an authoring mistake the reader should not see.
    if (entry.copy !== undefined && copied === null) return [];
    const run = (): void => {
      if (copied !== null) void copyText(copied);
      // A `copy`-only item is silent; an item that names no `event` dispatches the default one.
      if (copied !== null && entry.event === undefined) return;
      this.#dispatch(entry, group, target, element);
    };
    return [
      entry.danger === true
        ? { kind: 'item', id: entry.id, label: entry.label, run, danger: true }
        : { kind: 'item', id: entry.id, label: entry.label, run },
    ];
  }

  #dispatch(
    entry: ExtendRightClickItem,
    group: ExtendRightClickGroup,
    target: ExtendRightClickTarget,
    element: Element,
  ): void {
    const detail: ExtendRightClickRunDetail = {
      id: entry.id,
      group: group.id,
      item: entry.id,
      target: { selector: target.selector, label: target.label ?? null },
      element,
      authored: entry.detail ?? {},
    };
    this.dispatchEvent(new CustomEvent(entry.event ?? DEFAULT_RUN_EVENT, { detail, bubbles: true, composed: true }));
  }
}
