/**
 * What changed since the previous version of the page, as the agent wrote it
 * when it regenerated the HTML, and which of those changes this reader has
 * already seen. Pure state and transitions; the shell owns the storage, the
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

const changeLogSchema = v.strictObject({
  /** Names this version of the page; what a reader has seen is kept per revision. */
  revision: v.pipe(v.string(), v.minLength(1)),
  changes: v.array(changeSchema),
});

export type ChangeEntry = {
  /** The author's id, else the entry's position. Unique within a revision. */
  readonly key: string;
  readonly title: string;
  readonly body: string | null;
  readonly target: string | null;
  readonly navigate: string | null;
};

export type ChangeLog = {
  readonly revision: string;
  readonly entries: readonly ChangeEntry[];
};

export type ChangeLogResult =
  | { readonly ok: true; readonly log: ChangeLog }
  | { readonly ok: false; readonly error: string };

export const parseChangeLog = (input: unknown): ChangeLogResult => {
  const parsed = v.safeParse(changeLogSchema, input);
  if (!parsed.success) return { ok: false, error: v.summarize(parsed.issues) };
  const entries = parsed.output.changes.map((change, index): ChangeEntry => ({
    key: change.id ?? String(index),
    title: change.title,
    body: change.body ?? null,
    target: change.target ?? null,
    navigate: change.navigate ?? null,
  }));
  const keys = new Set(entries.map((entry) => entry.key));
  if (keys.size !== entries.length) return { ok: false, error: 'change ids must be unique' };
  return { ok: true, log: { revision: parsed.output.revision, entries } };
};

// ---------------------------------------------------------------- seen record

const seenRecordSchema = v.strictObject({
  v: v.literal(1),
  revision: v.string(),
  seen: v.array(v.string()),
});

/** What is stored per page: the changes of one revision the reader has seen. */
export type SeenRecord = v.InferOutput<typeof seenRecordSchema>;

export const parseSeenRecord = (input: unknown): SeenRecord | null => {
  const parsed = v.safeParse(seenRecordSchema, input);
  return parsed.success ? parsed.output : null;
};

// -------------------------------------------------------------------- notices

export type NoticeState = {
  /** Keys of the current revision the reader has seen. */
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
  | { readonly kind: 'jump'; readonly key: string };

/** What holds the toasts' timers: the pointer over them, or focus inside them. Either alone keeps them. */
export type ToastHold = 'pointer' | 'focus';

const CLOSED_LIST: NoticeState['list'] = { open: false, fresh: new Set() };

const isUnread = (state: NoticeState) => (entry: ChangeEntry) => !state.seen.has(entry.key);

export const initialNotices = (log: ChangeLog, record: SeenRecord | null): NoticeState => {
  const keys = new Set(log.entries.map((entry) => entry.key));
  const seen = new Set(record?.revision === log.revision ? record.seen.filter((key) => keys.has(key)) : []);
  return {
    seen,
    toasts: log.entries.filter((entry) => !seen.has(entry.key)).map((entry) => entry.key),
    list: CLOSED_LIST,
  };
};

const withSeen = (state: NoticeState, keys: Iterable<string>): ReadonlySet<string> => new Set([...state.seen, ...keys]);

export const reduceNotices = (log: ChangeLog, state: NoticeState, event: NoticeEvent): NoticeState => {
  switch (event.kind) {
    case 'open-list': {
      const fresh = new Set(log.entries.filter(isUnread(state)).map((entry) => entry.key));
      // The list shows every toast's change, so the toasts step aside.
      return { seen: withSeen(state, fresh), toasts: [], list: { open: true, fresh } };
    }
    case 'close-list':
      return { ...state, list: CLOSED_LIST };
    case 'close-toast':
      return { ...state, toasts: state.toasts.filter((key) => key !== event.key) };
    case 'jump':
      return {
        seen: withSeen(state, [event.key]),
        toasts: state.toasts.filter((key) => key !== event.key),
        list: CLOSED_LIST,
      };
  }
};

export const unreadCount = (log: ChangeLog, state: NoticeState): number => log.entries.filter(isUnread(state)).length;

export const seenRecordOf = (log: ChangeLog, state: NoticeState): SeenRecord => ({
  v: 1,
  revision: log.revision,
  seen: log.entries.filter((entry) => state.seen.has(entry.key)).map((entry) => entry.key),
});

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
  readonly title: string;
  readonly body: string | null;
  /** "Show" can take the reader somewhere. */
  readonly jumpable: boolean;
  /** Unread when the list opened. */
  readonly fresh: boolean;
};

export type NoticeViewModel = {
  readonly unread: number;
  readonly open: boolean;
  readonly cards: readonly NoticeCard[];
  readonly toasts: readonly NoticeCard[];
  /** Toasts waiting behind the visible ones. */
  readonly waiting: number;
};

const cardOf =
  (state: NoticeState) =>
  (entry: ChangeEntry): NoticeCard => ({
    key: entry.key,
    title: entry.title,
    body: entry.body,
    jumpable: entry.target !== null || entry.navigate !== null,
    fresh: state.list.fresh.has(entry.key),
  });

export const presentNotices = (log: ChangeLog, state: NoticeState): NoticeViewModel => {
  const cards = log.entries.map(cardOf(state));
  const byKey = new Map(cards.map((card) => [card.key, card]));
  const toasts = state.toasts.flatMap((key) => {
    const card = byKey.get(key);
    return card ? [card] : [];
  });
  return {
    unread: unreadCount(log, state),
    open: state.list.open,
    cards,
    toasts: toasts.slice(0, VISIBLE_TOASTS),
    waiting: Math.max(0, toasts.length - VISIBLE_TOASTS),
  };
};
