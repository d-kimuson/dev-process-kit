/**
 * `data-dpk-item="<kind>:<id>"` on author markup names a reviewable item. Kind
 * and id follow the common id rule (letters, digits, `_`, `-`).
 */
const ITEM_REF = /^([A-Za-z0-9_-]+):([A-Za-z0-9_-]+)$/;

export type ItemRef = { readonly kind: string; readonly id: string };

export type CommentableItem = ItemRef & { readonly label: string };

export const parseItemRef = (value: string | null): ItemRef | null => {
  const match = ITEM_REF.exec(value?.trim() ?? '');
  if (!match) return null;
  const [, kind = '', id = ''] = match;
  return { kind, id };
};

const MAX_LABEL = 60;

/** The label the review rail shows: the author's, else the item's heading or text, shortened. */
export const itemLabel = (explicit: string | null, heading: string | null, text: string, fallback: string): string => {
  const source = [explicit, heading, text].map((value) => value?.replace(/\s+/g, ' ').trim() ?? '').find(Boolean);
  if (source === undefined) return fallback;
  return source.length > MAX_LABEL ? `${source.slice(0, MAX_LABEL - 1)}…` : source;
};

export const itemKey = (item: ItemRef): string => `${item.kind}:${item.id}`;

/** An item is a target only while its reference is unique: an ambiguous one would attach comments by guess. */
export const uniqueItems = <T extends ItemRef>(items: readonly T[]): readonly T[] => {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(itemKey(item), (counts.get(itemKey(item)) ?? 0) + 1);
  return items.filter((item) => counts.get(itemKey(item)) === 1);
};

export const itemTargetValue = (providerId: string, item: ItemRef): string =>
  `element:${[providerId, item.kind, item.id].map((part) => encodeURIComponent(part)).join('/')}`;
