/**
 * Domain model of a declarative right-click menu: for each element it applies
 * to (a CSS selector), the groups of entries the menu offers. Pure — the
 * element (`./element.ts`) turns the parsed data into `ContextMenuGroup`s with
 * real closures, which is the only place that may touch the DOM.
 *
 * The JSON child and the `config` property share this one shape, so parsing is
 * idempotent: a parsed config assigned back as the property stays valid.
 */
import * as v from 'valibot';

/** The event a `kind: "item"` entry dispatches when it names no `event` of its own. */
export const DEFAULT_RUN_EVENT = 'dpk-extend-right-click-run';

export type ExtendRightClickItem = {
  readonly kind: 'item';
  readonly id: string;
  readonly label: string;
  /** Renders in the destructive tone (delete, disconnect, …). */
  readonly danger?: boolean | undefined;
  /** Custom event to dispatch on the wrapper; `DEFAULT_RUN_EVENT` when omitted. */
  readonly event?: string | undefined;
  /** The author's own payload, carried to the listener as `detail.authored`. */
  readonly detail?: Record<string, unknown> | undefined;
  /**
   * What the item puts on the clipboard: `"text"` reads the matched element's
   * `textContent`, any other value is the name of an attribute to read. An item
   * whose source has no value is omitted from the menu.
   */
  readonly copy?: string | undefined;
};

export type ExtendRightClickSubmenu = {
  readonly kind: 'submenu';
  readonly id: string;
  readonly label: string;
  readonly entries: readonly ExtendRightClickEntry[];
};

export type ExtendRightClickEntry = ExtendRightClickItem | ExtendRightClickSubmenu;

/** One menu group, as `ContextMenuGroup` once the element maps it. */
export type ExtendRightClickGroup = {
  readonly id: string;
  readonly heading?: string | undefined;
  readonly entries: readonly ExtendRightClickEntry[];
};

/** One "when the click is on this, offer that" rule. */
export type ExtendRightClickTarget = {
  readonly selector: string;
  readonly label?: string | undefined;
  readonly groups: readonly ExtendRightClickGroup[];
};

export type ExtendRightClickConfig = { readonly targets: readonly ExtendRightClickTarget[] };

const idSchema = v.pipe(v.string(), v.minLength(1));
const textSchema = v.pipe(v.string(), v.minLength(1));

const itemSchema = v.strictObject({
  kind: v.literal('item'),
  id: idSchema,
  label: textSchema,
  danger: v.optional(v.boolean()),
  event: v.optional(textSchema),
  detail: v.optional(v.record(v.string(), v.unknown())),
  copy: v.optional(textSchema),
});

const submenuSchema = v.strictObject({
  kind: v.literal('submenu'),
  id: idSchema,
  label: textSchema,
  // Deferred so the two schemas may refer to each other; a submenu nests arbitrarily deep.
  entries: v.array(v.lazy(() => entrySchema)),
});

const entrySchema: v.GenericSchema<unknown, ExtendRightClickEntry> = v.lazy(() =>
  v.variant('kind', [itemSchema, submenuSchema]),
);

const groupSchema = v.strictObject({
  id: idSchema,
  heading: v.optional(textSchema),
  entries: v.array(entrySchema),
});

const targetSchema = v.strictObject({
  selector: v.pipe(v.string(), v.trim(), v.minLength(1)),
  label: v.optional(textSchema),
  groups: v.array(groupSchema),
});

const configSchema = v.strictObject({ targets: v.array(targetSchema) });

const collectIds = (entries: readonly ExtendRightClickEntry[], ids: Set<string>): void => {
  for (const entry of entries) {
    if (ids.has(entry.id)) throw new Error(`duplicate id: ${entry.id}`);
    ids.add(entry.id);
    if (entry.kind === 'submenu') collectIds(entry.entries, ids);
  }
};

/**
 * Strict parse of the JSON child / `config` property: an unknown key, a
 * missing `targets`/`groups`/`entries`, an empty selector or id, or an id used
 * twice anywhere in the config (entries and groups alike) is an error. The
 * caller warns with the message and contributes no menu.
 */
export const parseExtendRightClickData = (input: unknown): ExtendRightClickConfig => {
  const config = v.parse(configSchema, input);
  const ids = new Set<string>();
  for (const target of config.targets) {
    for (const group of target.groups) {
      if (ids.has(group.id)) throw new Error(`duplicate id: ${group.id}`);
      ids.add(group.id);
      collectIds(group.entries, ids);
    }
  }
  return config;
};
