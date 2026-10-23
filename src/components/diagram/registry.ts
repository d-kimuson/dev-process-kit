/**
 * The catalog of diagram components that may be inserted into something else
 * (a whiteboard, or any future spot that offers "add a diagram here"). A
 * diagram component registers itself once, from its own `define*()` — the
 * inserter reads this catalog instead of naming components by hand, so a new
 * diagram (or a template turned into one) joins the list without the
 * inserter's code changing.
 */
import type { Locale } from '../../core/i18n';

export type DiagramCatalogEntry = {
  /** Custom element tag name, e.g. `dpk-state-diagram`. */
  readonly tag: string;
  /** Short human label for pickers (a combobox option, a submenu row) — the component's own `heading` message, so there is one name per diagram, not a second copy kept here. */
  readonly label: (locale: Locale) => string;
  /** The `.data` property a freshly inserted instance starts from (already-parsed shape, e.g. `emptyStateData()`). */
  readonly seed: () => unknown;
};

const catalog = new Map<string, DiagramCatalogEntry>();

/** Idempotent: re-registering the same tag (a second `define*()` call) replaces its entry rather than duplicating it. */
export const registerDiagram = (entry: DiagramCatalogEntry): void => {
  catalog.set(entry.tag, entry);
};

/** In registration order — stable across calls, but not alphabetical. */
export const listDiagrams = (): readonly DiagramCatalogEntry[] => [...catalog.values()];
