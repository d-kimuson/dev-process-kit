/**
 * The side panel's rules, free of the DOM: which sections it lists, which one
 * it shows first, what a change of the selected element does to it, and how
 * the reader's stored state is read back.
 *
 * The panel belongs to the element that holds the content (`<dpk-page>`, a
 * standalone view or board). Its first section, `detail`, is the content's
 * selected element; the others are the author's `<dpk-panel-section>` elements
 * and the sections a component adds itself.
 */
import * as v from 'valibot';

/** The panel's width, in pixels: the reader drags it between `min` and `max`. */
export const PANEL_WIDTH = { min: 280, max: 560, default: 360 } as const;

/** The section that shows the selected element. An author section may not take this name. */
export const DETAIL_SECTION = 'detail';

/** `auto` readies a closed panel when there is something to show; `open` opens it on a first visit; `none` draws none. */
export type PanelMode = 'auto' | 'open' | 'none';

export const parsePanelMode = (value: string | null | undefined): PanelMode =>
  value === 'open' || value === 'none' ? value : 'auto';

/** One segment of the panel's section switch. */
export type PanelTab = {
  readonly name: string;
  readonly label: string;
  readonly badge: string | null;
  readonly kind: 'detail' | 'component' | 'author';
};

/** An author's `<dpk-panel-section>` as its attributes read; `name` is `null` when the author left it out. */
export type AuthoredSection = {
  readonly name: string | null;
  readonly label: string;
  readonly badge: string | null;
  readonly hidden: boolean;
};

/** A section a component adds through the panel host. */
export type ComponentSection = {
  readonly name: string;
  readonly label: string;
  readonly badge?: string;
};

/**
 * The name an author section goes by: its own, or `section-<n>` from its place
 * among the author's sections when it has none (or takes the reserved one).
 */
export const authoredSectionName = (section: AuthoredSection, index: number): string =>
  section.name === null || section.name === '' || section.name === DETAIL_SECTION
    ? `section-${index + 1}`
    : section.name;

export type PanelTabsInput = {
  /** Whether the content offers the selected element's detail. */
  readonly detail: { readonly label: string } | null;
  readonly components: readonly ComponentSection[];
  readonly authored: readonly AuthoredSection[];
};

/** `detail` first, then the components' sections, then the author's, without the hidden ones. */
export const panelTabs = ({ detail, components, authored }: PanelTabsInput): readonly PanelTab[] => [
  ...(detail === null ? [] : [{ name: DETAIL_SECTION, label: detail.label, badge: null, kind: 'detail' as const }]),
  ...components.map((section) => ({
    name: section.name,
    label: section.label,
    badge: section.badge ?? null,
    kind: 'component' as const,
  })),
  ...authored.flatMap((section, index) =>
    section.hidden
      ? []
      : [
          {
            name: authoredSectionName(section, index),
            label: section.label,
            badge: section.badge,
            kind: 'author' as const,
          },
        ],
  ),
];

export type InitialSectionInput = {
  readonly tabs: readonly PanelTab[];
  /** The section the reader last chose, if any. */
  readonly stored: string | null;
  /** Whether the content has an element selected right now. */
  readonly selected: boolean;
};

/**
 * The section the panel shows: the reader's last choice while it still
 * exists; the detail while an element is selected; else the first other
 * section; else the detail.
 */
export const initialSection = ({ tabs, stored, selected }: InitialSectionInput): string => {
  if (stored !== null && tabs.some((tab) => tab.name === stored)) return stored;
  const hasDetail = tabs.some((tab) => tab.kind === 'detail');
  if (hasDetail && selected) return DETAIL_SECTION;
  return tabs.find((tab) => tab.kind !== 'detail')?.name ?? DETAIL_SECTION;
};

/**
 * `open` is a selection the reader made to look at the element (pressing a
 * card, Enter on it); `select` is one made for another reason (lighting up a
 * node's relations).
 */
export type DetailIntent = 'select' | 'open';

export type DetailChangeInput = {
  readonly intent: DetailIntent;
  readonly open: boolean;
  readonly section: string;
  /** Whether there is an element to show after the change. */
  readonly selected: boolean;
};

/** What a change of the selected element does to the panel. */
export type DetailChange =
  | { readonly kind: 'show' }
  | { readonly kind: 'open-detail' }
  | { readonly kind: 'mark-unread' }
  | { readonly kind: 'none' };

/**
 * An `open` selection opens the panel on the detail. Any other change only
 * replaces what the detail shows: when the reader is looking at it, it shows;
 * otherwise the detail's segment is marked, and the panel stays as it is.
 */
export const detailChange = ({ intent, open, section, selected }: DetailChangeInput): DetailChange => {
  if (intent === 'open' && selected) return { kind: 'open-detail' };
  if (open && section === DETAIL_SECTION) return { kind: 'show' };
  return selected ? { kind: 'mark-unread' } : { kind: 'none' };
};

/** The segment a key on the section switch moves to, or `null` when the key does not move. */
export const tabKeyTarget = (names: readonly string[], current: string, key: string): string | null => {
  if (names.length === 0) return null;
  const index = Math.max(0, names.indexOf(current));
  switch (key) {
    case 'ArrowRight':
      return names[(index + 1) % names.length] ?? null;
    case 'ArrowLeft':
      return names[(index - 1 + names.length) % names.length] ?? null;
    case 'Home':
      return names[0] ?? null;
    case 'End':
      return names[names.length - 1] ?? null;
    default:
      return null;
  }
};

/** What the panel keeps for the reader: whether it is open, and the section they chose. */
export type PanelRecord = { readonly open: boolean; readonly section: string | null };

const PanelRecordSchema = v.object({ open: v.boolean(), section: v.nullable(v.string()) });

/** A stored record, or `null` when the value is not one. */
export const parsePanelRecord = (value: unknown): PanelRecord | null => {
  const result = v.safeParse(PanelRecordSchema, value);
  return result.success ? result.output : null;
};

/**
 * Whether the panel is open: the reader's record wins; without one, the
 * author's `panel="open"` opens it.
 */
export const panelOpenState = (record: PanelRecord | null, mode: PanelMode): boolean => record?.open ?? mode === 'open';

/** How tall the panel is as a sheet on a narrow screen. */
export type SheetLevel = 'half' | 'full';
