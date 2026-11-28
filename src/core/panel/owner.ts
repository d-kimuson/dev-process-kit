/**
 * The side panel's state, kept by the element that owns the panel (`<dpk-page>`,
 * a standalone view or board): whether it is open, which section it shows,
 * the selected element's detail, the sections the author and the components
 * added, and the page's settings the chrome's owner hands it. The frame (`<dpk-internal-layout-panel>`) only draws it.
 *
 * Open and section are the reader's, not the draft's: they are kept in
 * `localStorage` under `dev-process-kit:panel:<key>`, or for the page load
 * only when the owner keeps no storage.
 */
import type { ReactiveController, ReactiveControllerHost } from 'lit';

import type { Locale } from '../i18n';
import type { DetailReport, PanelDetail, PanelHost, PanelSectionSpec, PanelSettingsSpec } from './host';

import { deepActiveElement } from '../../lib/dom/focus';
import { defaultJsonStore, memoryJsonStore, type JsonStore } from '../../lib/dom/json-store';
import { panelMessages } from './messages';
import {
  DETAIL_SECTION,
  detailChange,
  initialSection,
  panelOpenState,
  panelTabs,
  parsePanelRecord,
  type AuthoredSection,
  type PanelMode,
  type PanelRecord,
  type PanelTab,
  type SheetLevel,
} from './model';

/** Fired on the owner when the panel opens, closes or changes section: `{ open, section }`. */
export const PANEL_CHANGE_EVENT = 'dpk-panel-change';
/** The attribute the owner sets on the author's section that is showing. */
export const PANEL_ACTIVE_ATTRIBUTE = 'data-dpk-panel-active';

export type PanelChangeDetail = {
  readonly open: boolean;
  readonly section: string;
};

const storageKey = (key: string): string => `dev-process-kit:panel:${key}`;

const SECTION_SLOTS: ReadonlySet<string | null> = new Set(['panel', 'aside', 'supplement']);

const isSectionNode = (node: Node): boolean => node instanceof Element && SECTION_SLOTS.has(node.getAttribute('slot'));

/** A supplement is named by its `data-name`; a blank one counts as none. */
const supplementName = (element: Element): string | null => {
  const name = element.getAttribute('data-name')?.trim() ?? '';
  return name === '' ? null : name;
};

export type PanelOwnerOptions = {
  /** Read on first connect: `null` keeps the reader's state to this page load. */
  readonly persistKey: () => string | null;
  readonly mode: () => PanelMode;
  readonly locale: () => Locale;
  /** The author's sections, in document order: the owner's own children. */
  readonly sections: () => readonly Element[];
};

type ActiveDetail = {
  readonly source: Element;
  readonly detail: PanelDetail | null;
};
type ComponentEntry = {
  readonly source: Element;
  readonly spec: PanelSectionSpec;
};
type SettingsEntry = {
  readonly source: Element;
  readonly spec: PanelSettingsSpec;
};
/** What the next frame render focuses: the detail's heading, or the segment of the section shown. */
export type PanelFocus = 'detail' | 'tab';

export class PanelOwner implements ReactiveController, PanelHost {
  readonly #host: ReactiveControllerHost & HTMLElement;
  readonly #options: PanelOwnerOptions;
  #store: JsonStore<PanelRecord> | null = null;
  #key: string | null = null;
  /** The reader's pick, or `null` until they made one: then {@link panelOpenState} decides. */
  #open: boolean | null = null;
  /** The section the reader (or an explicit open) chose; `null` lets the initial rule pick. */
  #section: string | null = null;
  #maximized = false;
  #sheet: SheetLevel = 'half';
  #unread = false;
  #focus: PanelFocus | null = null;
  /** What had the focus when the panel opened, for it to take back when the panel closes. */
  #returnFocus: HTMLElement | null = null;
  readonly #providers = new Set<Element>();
  #active: ActiveDetail | null = null;
  #components: readonly ComponentEntry[] = [];
  #settings: SettingsEntry | null = null;
  #observer: MutationObserver | null = null;
  readonly #listeners = new Set<() => void>();
  #emitted: PanelChangeDetail | null = null;

  constructor(host: ReactiveControllerHost & HTMLElement, options: PanelOwnerOptions) {
    this.#host = host;
    this.#options = options;
    host.addController(this);
  }

  hostConnected(): void {
    this.#ensureStore();
    this.#observer ??= new MutationObserver((records) => {
      if (records.some((record) => this.#concernsSections(record))) this.#changed();
    });
    this.#observer.observe(this.#host, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['slot', 'name', 'label', 'badge', 'hidden', 'aria-label', 'data-name'],
    });
    this.#changed();
  }

  hostDisconnected(): void {
    this.#observer?.disconnect();
  }

  #ensureStore(): void {
    if (this.#store !== null) return;
    const key = this.#options.persistKey();
    this.#store = key === null ? memoryJsonStore(parsePanelRecord) : defaultJsonStore(parsePanelRecord);
    this.#key = storageKey(key ?? '');
    const record = this.#store.read(this.#key);
    this.#open = record?.open ?? null;
    this.#section = record?.section ?? null;
  }

  /**
   * Only a change to an author's section counts: the content beside them is
   * re-rendered by the app on every update, and reacting to it would loop.
   */
  #concernsSections(record: MutationRecord): boolean {
    if (record.type === 'childList')
      return record.target === this.#host && [...record.addedNodes, ...record.removedNodes].some(isSectionNode);
    if (!(record.target instanceof Element) || record.target.parentElement !== this.#host) return false;
    return record.attributeName === 'slot' || isSectionNode(record.target);
  }

  // ------------------------------------------------------------- reading

  /** Where the reader's width is kept, beside the open state; `null` for the page load only. */
  get persistKey(): string | null {
    return this.#options.persistKey();
  }

  get locale(): Locale {
    return this.#options.locale();
  }

  /** Whether the owner has a panel to offer: some section to show. */
  get available(): boolean {
    return this.tabs.length > 0;
  }

  /** `panel="none"` leaves the panel to the settings alone. */
  get #offersContent(): boolean {
    return this.#options.mode() !== 'none';
  }

  get isOpen(): boolean {
    return this.available && this.#opened;
  }

  get #opened(): boolean {
    return panelOpenState(
      this.#open === null ? null : { open: this.#open, section: null },
      this.#options.mode(),
      this.tabs,
    );
  }

  get maximized(): boolean {
    return this.isOpen && this.#maximized;
  }

  get sheet(): SheetLevel {
    return this.#sheet;
  }

  get unread(): boolean {
    return this.#unread;
  }

  get tabs(): readonly PanelTab[] {
    const offers = this.#offersContent;
    return panelTabs({
      detail: offers && this.#providers.size > 0 ? { label: panelMessages(this.locale).detail } : null,
      components: offers ? this.#components.map((entry) => entry.spec) : [],
      authored: offers ? this.#authoredSections() : [],
      settings: this.#settings === null ? null : { label: this.#settings.spec.label },
    });
  }

  get section(): string {
    return initialSection({
      tabs: this.tabs,
      stored: this.#section,
      selected: this.detail !== null,
    });
  }

  get detail(): PanelDetail | null {
    return this.#active?.detail ?? null;
  }

  get componentSections(): readonly PanelSectionSpec[] {
    return this.#offersContent ? this.#components.map((entry) => entry.spec) : [];
  }

  get settings(): PanelSettingsSpec | null {
    return this.#settings?.spec ?? null;
  }

  /** The author's section elements paired with the names the panel lists them under. */
  /** Whether the panel is open on an author's section that holds `source`, as a supplement holds its board. */
  #showsSectionHolding(source: Element): boolean {
    if (!this.isOpen) return false;
    const section = this.section;
    return this.authoredElements.some((entry) => entry.name === section && entry.element.contains(source));
  }

  get authoredElements(): readonly { readonly element: Element; readonly name: string }[] {
    const tabs = this.tabs.filter((tab) => tab.kind === 'author');
    const visible = this.#options.sections().filter((element) => !element.hasAttribute('hidden'));
    return visible.flatMap((element, index) => {
      const tab = tabs[index];
      return tab === undefined ? [] : [{ element, name: tab.name }];
    });
  }

  /**
   * The author's section the selected element sits in (a board in a
   * supplement), so the detail can lead back to it; `null` for an element
   * outside the author's sections.
   */
  get detailOrigin(): PanelTab | null {
    const source = this.#active?.detail === null ? null : (this.#active?.source ?? null);
    if (source === null) return null;
    const origin = this.authoredElements.find((entry) => entry.element.contains(source));
    return origin === undefined ? null : (this.tabs.find((tab) => tab.name === origin.name) ?? null);
  }

  /** What the next frame render should move the focus to; reading it clears it. */
  takeFocus(): PanelFocus | null {
    const focus = this.#focus;
    this.#focus = null;
    return focus;
  }

  subscribe(listener: () => void): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  #authoredSections(): readonly AuthoredSection[] {
    const fallback = panelMessages(this.locale).notes;
    return this.#options.sections().map((element) => ({
      name: element.getAttribute('name'),
      label: element.getAttribute('label') ?? element.getAttribute('aria-label') ?? supplementName(element) ?? fallback,
      badge: element.getAttribute('badge'),
      hidden: element.hasAttribute('hidden'),
    }));
  }

  // ------------------------------------------------------- reader actions

  setOpen(open: boolean): void {
    if (open && !this.available) return;
    if (open && !this.isOpen) this.#returnFocus = deepActiveElement();
    this.#open = open;
    if (!open) {
      this.#maximized = false;
      this.#sheet = 'half';
    }
    if (open && this.section === DETAIL_SECTION) this.#unread = false;
    this.#save();
    this.#changed();
  }

  /**
   * Escape in the panel: on the detail of an element that sits in an author's
   * section (a board in a supplement), back to that section and the element;
   * otherwise the panel closes.
   */
  escape(): void {
    const detail = this.section === DETAIL_SECTION ? this.detail : null;
    const origin = detail === null ? null : this.detailOrigin;
    if (origin === null) {
      this.dismiss();
      return;
    }
    this.select(origin.name);
    detail?.focus?.();
  }

  /**
   * The reader closes the panel (its close button, Escape): the focus goes
   * back to the board's element when the detail was showing, else to what
   * had it when the panel opened.
   */
  dismiss(): void {
    const detail = this.section === DETAIL_SECTION ? this.detail : null;
    const back = this.#returnFocus;
    this.#returnFocus = null;
    this.setOpen(false);
    if (detail?.focus !== undefined) detail.focus();
    else if (back?.isConnected === true) back.focus();
  }

  select(section: string): void {
    if (!this.tabs.some((tab) => tab.name === section)) return;
    this.#section = section;
    if (section === DETAIL_SECTION) this.#unread = false;
    this.#save();
    this.#changed();
  }

  setMaximized(maximized: boolean): void {
    this.#maximized = maximized;
    this.#changed();
  }

  setSheet(level: SheetLevel): void {
    this.#sheet = level;
    this.#changed();
  }

  // ------------------------------------------------------------ PanelHost

  provideDetail(source: Element): () => void {
    this.#providers.add(source);
    this.#changed();
    return () => {
      this.#providers.delete(source);
      if (this.#active?.source === source) this.#active = null;
      this.#changed();
    };
  }

  showDetail(source: Element, detail: PanelDetail | null, report: DetailReport): void {
    if (report === 'refresh') {
      if (this.#active?.source !== source) return;
      this.#active = { source, detail };
      this.#notify();
      return;
    }
    // Another board clearing its selection leaves the one on show alone.
    if (detail === null && this.#active !== null && this.#active.source !== source) return;
    // Pins the section the reader sees now, so the detail arriving does not move them off it.
    this.#section ??= this.section;
    this.#active = { source, detail };
    const change = detailChange({
      intent: !this.#offersContent
        ? 'select'
        : report === 'select' && this.#showsSectionHolding(source)
          ? 'open'
          : report,
      open: this.isOpen,
      section: this.section,
      selected: detail !== null,
    });
    switch (change.kind) {
      case 'open-detail':
        if (!this.isOpen) this.#returnFocus = deepActiveElement();
        this.#open = true;
        this.#section = DETAIL_SECTION;
        this.#unread = false;
        this.#focus = 'detail';
        this.#save();
        break;
      case 'mark-unread':
        this.#unread = true;
        break;
      case 'show':
      case 'none':
        break;
    }
    this.#changed();
  }

  addSection(source: Element, spec: PanelSectionSpec): () => void {
    const entry: ComponentEntry = { source, spec };
    this.#components = [...this.#components, entry];
    this.#changed();
    return () => {
      this.#components = this.#components.filter((candidate) => candidate !== entry);
      this.#changed();
    };
  }

  provideSettings(source: Element, spec: PanelSettingsSpec): () => void {
    const entry: SettingsEntry = { source, spec };
    this.#settings = entry;
    this.#changed();
    return () => {
      if (this.#settings !== entry) return;
      this.#settings = null;
      this.#changed();
    };
  }

  invalidate(_source: Element): void {
    this.#notify();
  }

  open(section?: string, options?: { readonly focus?: boolean }): void {
    if (section !== undefined) this.#section = section;
    this.setOpen(true);
    if (options?.focus === true && this.isOpen) {
      this.#focus = 'tab';
      this.#notify();
    }
  }

  close(): void {
    this.setOpen(false);
  }

  // ------------------------------------------------------------ internals

  #save(): void {
    if (this.#key === null) return;
    this.#store?.write(this.#key, {
      open: this.#opened,
      section: this.#section,
    });
  }

  /** Something the panel draws may have changed: the frame and the owner draw again. */
  #notify(): void {
    for (const listener of this.#listeners) listener();
  }

  #changed(): void {
    this.#syncSections();
    this.#notify();
    this.#host.requestUpdate();
    const detail: PanelChangeDetail = {
      open: this.isOpen,
      section: this.section,
    };
    const previous = this.#emitted;
    this.#emitted = detail;
    if (previous === null || (previous.open === detail.open && previous.section === detail.section)) return;
    this.#host.dispatchEvent(
      new CustomEvent(PANEL_CHANGE_EVENT, {
        detail,
        bubbles: true,
        composed: true,
      }),
    );
  }

  /** Shows the author's section the panel is on, and hides the rest. */
  #syncSections(): void {
    const open = this.isOpen;
    const section = this.section;
    const shown = new Set(
      this.authoredElements.filter((entry) => open && entry.name === section).map((entry) => entry.element),
    );
    for (const element of this.#options.sections()) element.toggleAttribute(PANEL_ACTIVE_ATTRIBUTE, shown.has(element));
  }
}
