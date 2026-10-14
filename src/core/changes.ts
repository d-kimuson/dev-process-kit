/**
 * What changed in each version of the page, as the agent appended it when it
 * regenerated the HTML, and which of those changes this reader has already
 * seen. Pure state and transitions; the shell owns the storage, the
 * toast timers, the navigation and the highlight.
 */
import * as v from 'valibot';

import type { ActionTarget, NavigationPatch } from './types';

import { parseHash } from './navigation';
import { parseTargetRef } from './target';

/** Marks the `<script type="application/json">` child that holds the change log, apart from the base data. */
export const CHANGES_ATTRIBUTE = 'data-dpk-changes';

const TARGET_REF = /^[^:\s]+:\S+$/;

const changeSchema = v.strictObject({
  id: v.optional(v.pipe(v.string(), v.minLength(1))),
  title: v.pipe(v.string(), v.minLength(1)),
  body: v.optional(v.string()),
  /** The element the change is about, as a `type:id` target. */
  target: v.optional(v.pipe(v.string(), v.regex(TARGET_REF, 'target must be written "type:id"'))),
  /** Where the change is seen, in hash syntax (`view=flow&screen=cart`), when the target alone does not say. */
  navigate: v.optional(v.pipe(v.string(), v.includes('=', 'navigate must be written "key=value"'))),
});

const changesSchema = v.array(changeSchema);
const revisionNameSchema = v.pipe(v.string(), v.minLength(1));

const revisionSchema = v.strictObject({
  /** Names the version; what a reader has seen is kept per version. */
  revision: revisionNameSchema,
  changes: changesSchema,
});

/** Every version kept, oldest first: the author appends one on each regeneration. */
const historySchema = v.strictObject({
  revisions: v.pipe(v.array(revisionSchema), v.minLength(1, 'list at least one version')),
});

export type ChangeEntry = {
  /** Unique across the log: the version and the id together. */
  readonly key: string;
  /** The author's id, else the entry's position. Unique within a version. */
  readonly id: string;
  readonly revision: string;
  readonly title: string;
  readonly body: string | null;
  readonly target: string | null;
  readonly navigate: string | null;
};

export type ChangeRevision = {
  readonly revision: string;
  readonly entries: readonly ChangeEntry[];
};

export type ChangeLog = {
  /** The versions before this one, oldest first. */
  readonly earlier: readonly ChangeRevision[];
  /** This version of the page. */
  readonly latest: ChangeRevision;
};

export type ChangeLogResult =
  | { readonly ok: true; readonly log: ChangeLog }
  | { readonly ok: false; readonly error: string };

export const changeKey = (revision: string, id: string): string => JSON.stringify([revision, id]);

/** Oldest first. */
export const revisionsOf = (log: ChangeLog): readonly ChangeRevision[] => [...log.earlier, log.latest];

const toRevision = (input: v.InferOutput<typeof revisionSchema>): ChangeRevision | string => {
  const entries = input.changes.map((change, index): ChangeEntry => {
    const id = change.id ?? String(index);
    return {
      key: changeKey(input.revision, id),
      id,
      revision: input.revision,
      title: change.title,
      body: change.body ?? null,
      target: change.target ?? null,
      navigate: change.navigate ?? null,
    };
  });
  const ids = new Set(entries.map((entry) => entry.id));
  if (ids.size !== entries.length) return `change ids must be unique within version "${input.revision}"`;
  return { revision: input.revision, entries };
};

/** The history, or a log of one version written as `{ revision, changes }`. */
type LogInput = v.InferOutput<typeof historySchema> | v.InferOutput<typeof revisionSchema>;

export const parseChangeLog = (input: unknown): ChangeLogResult => {
  const isHistory = typeof input === 'object' && input !== null && 'revisions' in input;
  const parsed = isHistory ? v.safeParse(historySchema, input) : v.safeParse(revisionSchema, input);
  if (!parsed.success) return { ok: false, error: v.summarize(parsed.issues) };
  const output: LogInput = parsed.output;
  const inputs = 'revisions' in output ? output.revisions : [output];
  const revisions: ChangeRevision[] = [];
  for (const revision of inputs) {
    if (revisions.some((known) => known.revision === revision.revision))
      return { ok: false, error: `version "${revision.revision}" is listed twice` };
    const read = toRevision(revision);
    if (typeof read === 'string') return { ok: false, error: read };
    revisions.push(read);
  }
  const latest = revisions.pop();
  if (!latest) return { ok: false, error: 'list at least one version' };
  return { ok: true, log: { earlier: revisions, latest } };
};

// ---------------------------------------------------------------- seen record

/** The shape kept before the change log had a history: one version's seen ids. */
const seenRecordV1Schema = v.strictObject({
  v: v.literal(1),
  revision: v.string(),
  seen: v.array(v.string()),
});

const seenRecordSchema = v.strictObject({
  v: v.literal(2),
  /** The oldest version the reader is still told about: they have not seen all of it. */
  since: v.string(),
  /** The ids seen per version, from `since` on. */
  seen: v.record(v.string(), v.array(v.string())),
});

/** What is stored per page: where this reader is in the history. */
export type SeenRecord = v.InferOutput<typeof seenRecordSchema>;

export const parseSeenRecord = (input: unknown): SeenRecord | null => {
  const current = v.safeParse(seenRecordSchema, input);
  if (current.success) return current.output;
  const earlier = v.safeParse(seenRecordV1Schema, input);
  if (!earlier.success) return null;
  return { v: 2, since: earlier.output.revision, seen: { [earlier.output.revision]: earlier.output.seen } };
};

// -------------------------------------------------------------------- notices

export type NoticeState = {
  /** The versions the reader is told about: from the oldest they have not finished to this one. */
  readonly told: ReadonlySet<string>;
  /** Keys of the changes the reader has seen. */
  readonly seen: ReadonlySet<string>;
  /** Changes announced as toasts, front first. */
  readonly toasts: readonly string[];
  /** The list behind the header bell; `fresh` are the changes that were unread when it opened. */
  readonly list: { readonly open: boolean; readonly fresh: ReadonlySet<string> };
};

export type NoticeEvent =
  | { readonly kind: 'open-list' | 'close-list' }
  /** A toast went away, closed by the reader or timed out: its change stays unread behind the bell. */
  | { readonly kind: 'close-toast'; readonly key: string }
  /** The reader went to the change from its toast or its card. */
  | { readonly kind: 'jump'; readonly key: string }
  /** The reader is done with everything they were told about. */
  | { readonly kind: 'read-all' };

/** What holds the toasts' timers: the pointer over them, or focus inside them. Either alone keeps them. */
export type ToastHold = 'pointer' | 'focus';

const CLOSED_LIST: NoticeState['list'] = { open: false, fresh: new Set() };

const isUnread = (state: NoticeState) => (entry: ChangeEntry) =>
  state.told.has(entry.revision) && !state.seen.has(entry.key);

const unreadOf = (log: ChangeLog, state: NoticeState): readonly ChangeEntry[] =>
  revisionsOf(log).flatMap((revision) => revision.entries.filter(isUnread(state)));

/** "Show" can take the reader somewhere; otherwise the card is all there is to see. */
const isJumpable = (entry: ChangeEntry): boolean => entry.target !== null || entry.navigate !== null;

/**
 * A first visit is told only what changed in this version: the history
 * before it is not news to someone who never saw it. A returning reader is
 * told every version since the one they left unfinished; one whose version is
 * no longer kept, every version there is. Only this version's changes toast;
 * older ones wait behind the bell.
 */
export const initialNotices = (log: ChangeLog, record: SeenRecord | null): NoticeState => {
  const revisions = revisionsOf(log);
  const since = record === null ? -1 : revisions.findIndex((revision) => revision.revision === record.since);
  const told = record === null ? [log.latest] : revisions.slice(Math.max(0, since));
  const seen = new Set(
    told.flatMap((revision) => {
      const ids = new Set(record?.seen[revision.revision] ?? []);
      return revision.entries.filter((entry) => ids.has(entry.id)).map((entry) => entry.key);
    }),
  );
  return {
    told: new Set(told.map((revision) => revision.revision)),
    seen,
    toasts: log.latest.entries.filter((entry) => !seen.has(entry.key)).map((entry) => entry.key),
    list: CLOSED_LIST,
  };
};

const withSeen = (state: NoticeState, keys: Iterable<string>): ReadonlySet<string> => new Set([...state.seen, ...keys]);

export const reduceNotices = (log: ChangeLog, state: NoticeState, event: NoticeEvent): NoticeState => {
  switch (event.kind) {
    case 'open-list': {
      const unread = unreadOf(log, state);
      const fresh = new Set(unread.map((entry) => entry.key));
      // A change with a Show stays unread until the reader follows it; reading its card alone is not seeing it.
      const read = unread.filter((entry) => !isJumpable(entry)).map((entry) => entry.key);
      // The list shows every toast's change, so the toasts step aside.
      return { ...state, seen: withSeen(state, read), toasts: [], list: { open: true, fresh } };
    }
    case 'close-list':
      return { ...state, list: CLOSED_LIST };
    case 'close-toast':
      return { ...state, toasts: state.toasts.filter((key) => key !== event.key) };
    case 'jump':
      return {
        ...state,
        seen: withSeen(state, [event.key]),
        toasts: state.toasts.filter((key) => key !== event.key),
        list: CLOSED_LIST,
      };
    case 'read-all':
      return {
        ...state,
        seen: withSeen(
          state,
          unreadOf(log, state).map((entry) => entry.key),
        ),
        toasts: [],
        list: { open: state.list.open, fresh: new Set() },
      };
  }
};

export const unreadCount = (log: ChangeLog, state: NoticeState): number => unreadOf(log, state).length;

export const seenRecordOf = (log: ChangeLog, state: NoticeState): SeenRecord => {
  const revisions = revisionsOf(log);
  const unfinished = revisions.findIndex(
    (revision) => state.told.has(revision.revision) && revision.entries.some(isUnread(state)),
  );
  const from = unfinished === -1 ? revisions.length - 1 : unfinished;
  const seen = revisions.slice(from).flatMap((revision): [string, string[]][] => {
    const ids = revision.entries.filter((entry) => state.seen.has(entry.key)).map((entry) => entry.id);
    return ids.length > 0 ? [[revision.revision, ids]] : [];
  });
  return { v: 2, since: revisions[from]?.revision ?? log.latest.revision, seen: Object.fromEntries(seen) };
};

// ----------------------------------------------------------------------- jump

export type Jump = {
  /** Brings the change on screen; `null` stays where the reader is. */
  readonly navigate: NavigationPatch | null;
  /** The element to highlight once it is on screen. */
  readonly target: string | null;
};

/** Where "show me" takes the reader, or `null` when the change points nowhere in particular. */
export const jumpOf = (
  entry: ChangeEntry,
  navigationFor: (target: ActionTarget) => NavigationPatch | null,
): Jump | null => {
  if (entry.target === null && entry.navigate === null) return null;
  const navigate =
    entry.navigate !== null
      ? parseHash(entry.navigate)
      : entry.target !== null
        ? navigationFor(parseTargetRef(entry.target))
        : null;
  return { navigate, target: entry.target };
};

// --------------------------------------------------------------- presentation

/** Toasts shown at once; the rest wait their turn behind them. */
export const VISIBLE_TOASTS = 3;

export type NoticeCard = {
  readonly key: string;
  readonly id: string;
  readonly revision: string;
  readonly title: string;
  readonly body: string | null;
  /** "Show" can take the reader somewhere. */
  readonly jumpable: boolean;
  /** Unread when the list opened. */
  readonly fresh: boolean;
};

export type NoticeGroup = {
  readonly revision: string;
  /** This version of the page. */
  readonly latest: boolean;
  readonly cards: readonly NoticeCard[];
};

export type NoticeViewModel = {
  readonly unread: number;
  readonly open: boolean;
  /** Every version kept, newest first. */
  readonly groups: readonly NoticeGroup[];
  readonly toasts: readonly NoticeCard[];
  /** Toasts waiting behind the visible ones. */
  readonly waiting: number;
};

const cardOf =
  (state: NoticeState) =>
  (entry: ChangeEntry): NoticeCard => ({
    key: entry.key,
    id: entry.id,
    revision: entry.revision,
    title: entry.title,
    body: entry.body,
    jumpable: isJumpable(entry),
    fresh: state.list.fresh.has(entry.key),
  });

export const presentNotices = (log: ChangeLog, state: NoticeState): NoticeViewModel => {
  const groups = revisionsOf(log)
    .map((revision): NoticeGroup => ({
      revision: revision.revision,
      latest: revision === log.latest,
      cards: revision.entries.map(cardOf(state)),
    }))
    .reverse();
  const byKey = new Map(groups.flatMap((group) => group.cards.map((card) => [card.key, card] as const)));
  const toasts = state.toasts.flatMap((key) => {
    const card = byKey.get(key);
    return card ? [card] : [];
  });
  return {
    unread: unreadCount(log, state),
    open: state.list.open,
    groups,
    toasts: toasts.slice(0, VISIBLE_TOASTS),
    waiting: Math.max(0, toasts.length - VISIBLE_TOASTS),
  };
};
