/**
 * Which draft actions the author has handled, as the change log names them:
 * `k3f9ab12:1-14,x7a2c0d9:1-10`. An action id is `<writer>:<seq>`, one writer
 * per browser counting up, so a writer's ids are a range and the set stays
 * short however long the page is kept. Pure; the controller drops what it
 * names and the brief prints the next value.
 */

/** Inclusive `[from, to]`, sorted and merged. */
type Range = readonly [number, number];

/** Per writer, its handled sequence numbers. */
export type AddressedSet = ReadonlyMap<string, readonly Range[]>;

export const EMPTY_ADDRESSED: AddressedSet = new Map();

const ACTION_ID = /^([A-Za-z0-9_-]+):([1-9][0-9]*)$/;
const ITEM = /^([A-Za-z0-9_-]+):([1-9][0-9]*)(?:-([1-9][0-9]*))?$/;

/** The writer and number of an action id; `null` for an id of another form (the old UUIDs). */
export const parseActionId = (id: string): { readonly writer: string; readonly seq: number } | null => {
  const match = ACTION_ID.exec(id);
  if (match === null) return null;
  const seq = Number(match[2]);
  return Number.isSafeInteger(seq) ? { writer: match[1] ?? '', seq } : null;
};

const merge = (ranges: readonly Range[]): Range[] => {
  const sorted = [...ranges].sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const [from, to] of sorted) {
    const last = merged.at(-1);
    if (last !== undefined && from <= last[1] + 1) last[1] = Math.max(last[1], to);
    else merged.push([from, to]);
  }
  return merged;
};

const withRanges = (set: AddressedSet, writer: string, ranges: readonly Range[]): AddressedSet => {
  const next = new Map(set);
  next.set(writer, merge([...(set.get(writer) ?? []), ...ranges]));
  return next;
};

/** Reads `writer:from-to` items joined by commas; a writer may repeat. The message names the bad item. */
export const parseAddressed = (text: string): AddressedSet | string => {
  let set: AddressedSet = EMPTY_ADDRESSED;
  for (const raw of text.split(',')) {
    const item = raw.trim();
    if (item.length === 0) continue;
    const match = ITEM.exec(item);
    if (match === null) return `"${item}" is not written "writer:from-to"`;
    const from = Number(match[2]);
    const to = match[3] === undefined ? from : Number(match[3]);
    if (!Number.isSafeInteger(from) || !Number.isSafeInteger(to)) return `"${item}" is out of range`;
    if (to < from) return `"${item}" ends before it starts`;
    set = withRanges(set, match[1] ?? '', [[from, to]]);
  }
  return set;
};

export const formatAddressed = (set: AddressedSet): string =>
  [...set.keys()]
    .sort()
    .flatMap((writer) =>
      (set.get(writer) ?? []).map(([from, to]) => (from === to ? `${writer}:${from}` : `${writer}:${from}-${to}`)),
    )
    .join(',');

export const isAddressed = (set: AddressedSet, id: string): boolean => {
  const parsed = parseActionId(id);
  if (parsed === null) return false;
  return (set.get(parsed.writer) ?? []).some(([from, to]) => parsed.seq >= from && parsed.seq <= to);
};

/**
 * The set once `ids` are handled too. Each writer's range runs from 1 up to
 * its highest id here, gaps included: a writer's actions reach every reader in
 * the order they were made, so a lower number not in the draft was taken back
 * or folded away, never still on its way.
 */
export const addressThrough = (set: AddressedSet, ids: Iterable<string>): AddressedSet => {
  const highest = new Map<string, number>();
  for (const id of ids) {
    const parsed = parseActionId(id);
    if (parsed === null) continue;
    highest.set(parsed.writer, Math.max(highest.get(parsed.writer) ?? 0, parsed.seq));
  }
  let next = set;
  for (const [writer, seq] of highest) next = withRanges(next, writer, [[1, seq]]);
  return next;
};
