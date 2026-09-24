import { sumBy } from 'es-toolkit/math';

import { findNote, type EventStormingState, type NoteLink, type NoteType, type StickyNote } from './model';

/**
 * Derived wall placement. The base data carries no coordinates: causal links
 * fold notes into slices, the element array orders the slices into a timeline
 * that reads left to right, and pixel widths decide where a row wraps.
 */

/** A hotspot pinned onto one note — the note it names a risk about. */
export type EsPin = {
  readonly note: StickyNote;
  readonly targetId: string;
};

/**
 * One causal slice: the classic "actor issues a command on an aggregate,
 * which emits an event" group, framed together and read left to right.
 */
export type EsSlice = {
  /** Id of the earliest member — stable across re-renders. */
  readonly id: string;
  /** Members in causal reading order (read model first, event last). */
  readonly notes: readonly StickyNote[];
  /** Hotspots pinned onto this slice's notes, never onto the slice as a whole. */
  readonly pins: readonly EsPin[];
  /** Bounded context shared by the members (first one that declares any). */
  readonly contextId: string | undefined;
};

/** An inter-slice causality link, lifted from its notes to their slices. */
export type SliceArrow = {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly label?: string;
};

/**
 * Link kinds that fold both notes into the same slice: the actor/command/
 * aggregate/event stack, plus the policy that fires a command and the
 * external system that emits an event. Every other link means temporal
 * succession and becomes an arrow between slices.
 */
const SAME_SLICE: ReadonlySet<string> = new Set([
  'actor>command',
  'command>aggregate',
  'aggregate>event',
  'command>event',
  'policy>command',
  'external>event',
]);

export const sameSlice = (from: NoteType, to: NoteType): boolean => {
  return SAME_SLICE.has(`${from}>${to}`);
};

/** Whether a link folds its two notes into one slice (explicit kind wins). */
const foldsLink = (link: NoteLink, fromType: NoteType, toType: NoteType): boolean => {
  if (link.kind !== undefined) return link.kind === 'member';
  return sameSlice(fromType, toType);
};

/** Reading order inside a slice: causes on the left, the event at the end. */
const SLOT_ORDER: readonly NoteType[] = [
  'readmodel',
  'actor',
  'policy',
  'command',
  'aggregate',
  'external',
  'event',
  'hotspot',
];

/**
 * The hotspot→note pins the links declare: a hotspot note linked to another
 * note hangs on that note instead of taking a slot in the timeline. An explicit
 * `flow` keeps its meaning (an arrow), and a hotspot linked to another hotspot
 * stays on the timeline because it has no note to hang on.
 */
const hotspotPins = (state: EventStormingState, typeOf: ReadonlyMap<string, NoteType>): ReadonlyMap<string, string> => {
  const pins = new Map<string, string>();
  for (const link of state.links) {
    const fromType = typeOf.get(link.from);
    const toType = typeOf.get(link.to);
    if (fromType === undefined || toType === undefined) continue;
    if ((fromType === 'hotspot') === (toType === 'hotspot')) continue;
    if (link.kind !== undefined && link.kind !== 'member') continue;
    const hotspotId = fromType === 'hotspot' ? link.from : link.to;
    if (pins.has(hotspotId)) continue;
    pins.set(hotspotId, fromType === 'hotspot' ? link.to : link.from);
  }
  return pins;
};

/**
 * Folds the timeline notes into causal slices: union-find over the same-slice
 * links, so a cycle simply lands in one group. Follows the first appearance of
 * any member for the group's order.
 */
const sliceGroups = (
  timeline: readonly StickyNote[],
  links: readonly NoteLink[],
  typeOf: ReadonlyMap<string, NoteType>,
): { readonly groups: Map<string, StickyNote[]>; readonly rootOf: ReadonlyMap<string, string> } => {
  const parent = new Map<string, string>(timeline.map((note) => [note.id, note.id]));
  const find = (id: string): string => {
    let root = id;
    while (parent.get(root) !== root) root = parent.get(root) ?? root;
    let cursor = id;
    while (cursor !== root) {
      const next = parent.get(cursor) ?? root;
      parent.set(cursor, root);
      cursor = next;
    }
    return root;
  };
  for (const link of links) {
    if (!parent.has(link.from) || !parent.has(link.to)) continue;
    const fromType = typeOf.get(link.from);
    const toType = typeOf.get(link.to);
    if (fromType === undefined || toType === undefined) continue;
    if (foldsLink(link, fromType, toType)) parent.set(find(link.from), find(link.to));
  }
  const groups = new Map<string, StickyNote[]>();
  const rootOf = new Map<string, string>();
  for (const note of timeline) {
    const root = find(note.id);
    rootOf.set(note.id, root);
    const members = groups.get(root);
    if (members) members.push(note);
    else groups.set(root, [note]);
  }
  return { groups, rootOf };
};

export const buildSlices = (state: EventStormingState): readonly EsSlice[] => {
  const typeOf = new Map(state.elements.map((note) => [note.id, note.type] as const));
  const pinTargetOf = hotspotPins(state, typeOf);
  const timeline = state.elements.filter((note) => !pinTargetOf.has(note.id));
  const { groups, rootOf } = sliceGroups(timeline, state.links, typeOf);
  const pinsByRoot = new Map<string, EsPin[]>();
  for (const [hotspotId, targetId] of pinTargetOf) {
    const note = findNote(state, hotspotId);
    const root = rootOf.get(targetId);
    if (note === undefined || root === undefined) continue;
    const pins = pinsByRoot.get(root);
    if (pins) pins.push({ note, targetId });
    else pinsByRoot.set(root, [{ note, targetId }]);
  }
  const slot = new Map(SLOT_ORDER.map((type, index) => [type, index] as const));
  const indexOf = new Map(state.elements.map((note, index) => [note.id, index] as const));
  return [...groups].map(([root, members]) => {
    const sorted = [...members].sort(
      (a, b) =>
        (slot.get(a.type) ?? 0) - (slot.get(b.type) ?? 0) || (indexOf.get(a.id) ?? 0) - (indexOf.get(b.id) ?? 0),
    );
    return {
      id: members[0]?.id ?? '',
      notes: sorted,
      pins: pinsByRoot.get(root) ?? [],
      contextId: members.find((note) => note.contextId !== undefined)?.contextId,
    };
  });
};

/**
 * Notes are only ever shown in their slices, so their global order matters only
 * as far as it orders the slices and the notes inside one: moving a slice away
 * and back regroups the array but not the board.
 */
export const canonicalEventStormingState = (state: EventStormingState): EventStormingState => {
  const laidOut = buildSlices(state).flatMap((slice) => [...slice.notes, ...slice.pins.map((pin) => pin.note)]);
  const placed = new Set(laidOut.map((note) => note.id));
  return { ...state, elements: [...laidOut, ...state.elements.filter((note) => !placed.has(note.id))] };
};

/**
 * Where a freshly added note of `type` should hook into an existing slice:
 * the member it forms a natural pair with (so kind inference agrees), else
 * the slice head. `incoming` means the new note is the link's `from` side.
 */
export const attachAnchor = (
  slice: EsSlice,
  type: NoteType,
): { readonly anchorId: string; readonly incoming: boolean } | undefined => {
  const members = [...slice.notes, ...slice.pins.map((pin) => pin.note)];
  const incoming = members.find((note) => sameSlice(type, note.type));
  if (incoming !== undefined) return { anchorId: incoming.id, incoming: true };
  const outgoing = members.find((note) => sameSlice(note.type, type));
  if (outgoing !== undefined) return { anchorId: outgoing.id, incoming: false };
  const head = members[0];
  return head === undefined ? undefined : { anchorId: head.id, incoming: true };
};

export const sliceArrows = (state: EventStormingState, slices: readonly EsSlice[]): readonly SliceArrow[] => {
  // Only timeline notes anchor arrows: a pinned hotspot is an annotation, not a
  // stop on the flow.
  const sliceOf = new Map(slices.flatMap((slice) => slice.notes.map((note) => [note.id, slice.id] as const)));
  return state.links.flatMap((link) => {
    const from = sliceOf.get(link.from);
    const to = sliceOf.get(link.to);
    if (from === undefined || to === undefined || from === to) return [];
    return [{ id: link.id, from, to, ...(link.label !== undefined ? { label: link.label } : {}) }];
  });
};

/* ------------------------------------------------------------ slice bands */

/** One wrapped row of the wall: slices reading left to right. */
export type SliceBand = {
  readonly sliceIds: readonly string[];
  /** The arrow this band continues from the band above, when a wrap cut it. */
  readonly cutFrom?: SliceArrow;
};

export type SliceBandOptions = {
  readonly widthOf: (sliceId: string) => number;
  /** Horizontal room between two slices; connectors live in it. */
  readonly gapX: number;
  /** Left/right padding of a band. */
  readonly padX: number;
  /** Pixel budget of one band. */
  readonly maxWidth: number;
};

const pairKey = (a: string, b: string): string => `${a}\u0000${b}`;

/**
 * Wraps the timeline into bands. The order never changes, and an arrow glues its
 * two slices onto the same line: a band only breaks where no arrow crosses the
 * break, so a run of causally connected slices is kept together and a run wider
 * than the budget is cut — the band below it then carries the cut as its
 * continuation mark. Shorter runs pack greedily, which spreads the timeline over as
 * many bands as the width needs.
 */
export const planSliceBands = (
  slices: readonly { readonly id: string }[],
  arrows: readonly SliceArrow[],
  options: SliceBandOptions,
): readonly SliceBand[] => {
  const { widthOf, gapX, padX, maxWidth } = options;
  const between = new Map<string, SliceArrow>();
  for (const arrow of arrows) {
    between.set(pairKey(arrow.from, arrow.to), arrow);
    between.set(pairKey(arrow.to, arrow.from), arrow);
  }
  const arrowBetween = (a: string | undefined, b: string | undefined): SliceArrow | undefined =>
    a === undefined || b === undefined ? undefined : between.get(pairKey(a, b));
  const fits = (ids: readonly string[]): boolean => {
    return sumBy(ids, (id) => widthOf(id)) + gapX * Math.max(0, ids.length - 1) + padX * 2 <= maxWidth;
  };
  const bands: SliceBand[] = [];
  let band: string[] = [];
  let cutFrom: SliceArrow | undefined;
  const flush = (): void => {
    if (band.length === 0) return;
    bands.push({ sliceIds: band, ...(cutFrom === undefined ? {} : { cutFrom }) });
    band = [];
    cutFrom = undefined;
  };
  for (const id of slices.map((slice) => slice.id)) {
    if (band.length > 0 && !fits([...band, id])) {
      // Move the tail the newcomer is glued to: cutting before it would draw an
      // arrow across the wrap.
      let splitAt = band.length;
      while (arrowBetween(band[splitAt - 1], splitAt === band.length ? id : band[splitAt]) !== undefined) {
        splitAt -= 1;
        if (splitAt === 0) break;
      }
      const tail = splitAt === 0 ? [] : band.splice(splitAt);
      const cut = splitAt === 0 ? arrowBetween(band.at(-1), id) : arrowBetween(band.at(-1), tail[0]);
      flush();
      band = tail;
      cutFrom = cut;
    }
    band.push(id);
  }
  flush();
  return bands;
};

/* ------------------------------------------------------- slice connections */

/** The note a slice speaks onward through: its (last) domain event, else its last note. */
export const sliceVoice = (slice: EsSlice): StickyNote | undefined => {
  return [...slice.notes].reverse().find((note) => note.type === 'event') ?? slice.notes.at(-1);
};

/**
 * The notes a slice-to-slice connection actually links: the source speaks
 * through its voice, the target listens at its head — the leftmost note in
 * reading order.
 */
export const connectionEndpoints = (
  from: EsSlice,
  to: EsSlice,
): { readonly from: string; readonly to: string } | undefined => {
  const source = sliceVoice(from);
  const target = to.notes[0];
  if (source === undefined || target === undefined) return undefined;
  return { from: source.id, to: target.id };
};
