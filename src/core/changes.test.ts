import { describe, expect, it } from 'vitest';

import {
  changeKey,
  initialNotices,
  jumpOf,
  parseChangeLog,
  parseSeenRecord,
  presentNotices,
  reduceNotices,
  seenRecordOf,
  unreadCount,
  type ChangeLog,
} from './changes';

type ChangeInput = { id?: string; title: string; body?: string; target?: string; navigate?: string };

const history = (...revisions: [string, ...(string | ChangeInput)[]][]): ChangeLog => {
  const parsed = parseChangeLog({
    revisions: revisions.map(([revision, ...changes]) => ({
      revision,
      changes: changes.map((change) => (typeof change === 'string' ? { id: change, title: change } : change)),
    })),
  });
  if (!parsed.ok) throw new Error(parsed.error);
  return parsed.log;
};

const k = changeKey;

describe('parseChangeLog', () => {
  it('reads the versions oldest first, each change keyed by id or by position', () => {
    const parsed = parseChangeLog({
      revisions: [
        { revision: 'r1', changes: [{ title: 'First draft' }] },
        {
          revision: 'r2',
          changes: [
            { id: 'coupon', title: 'Coupon field', body: 'On the cart', target: 'screen:cart', navigate: 'view=app' },
            { title: 'Copy fixes' },
          ],
        },
      ],
    });
    expect(parsed).toEqual({
      ok: true,
      log: {
        earlier: [
          {
            revision: 'r1',
            entries: [
              {
                key: k('r1', '0'),
                id: '0',
                revision: 'r1',
                title: 'First draft',
                body: null,
                target: null,
                navigate: null,
              },
            ],
          },
        ],
        latest: {
          revision: 'r2',
          entries: [
            {
              key: k('r2', 'coupon'),
              id: 'coupon',
              revision: 'r2',
              title: 'Coupon field',
              body: 'On the cart',
              target: 'screen:cart',
              navigate: 'view=app',
            },
            {
              key: k('r2', '1'),
              id: '1',
              revision: 'r2',
              title: 'Copy fixes',
              body: null,
              target: null,
              navigate: null,
            },
          ],
        },
      },
    });
  });

  it('reads a log of one version written without the history around it', () => {
    const parsed = parseChangeLog({ revision: 'r2', changes: [{ id: 'a', title: 'A' }] });
    expect(parsed.ok && parsed.log).toMatchObject({ earlier: [], latest: { revision: 'r2', entries: [{ id: 'a' }] } });
  });

  it('lets a later version reuse an id, but not a version name or an id within one version', () => {
    expect(history(['r1', 'a'], ['r2', 'a']).latest.entries[0]?.key).toBe(k('r2', 'a'));
    const twice = parseChangeLog({
      revisions: [
        { revision: 'r1', changes: [] },
        { revision: 'r1', changes: [] },
      ],
    });
    expect(twice).toEqual({ ok: false, error: 'version "r1" is listed twice' });
    const repeated = parseChangeLog({
      revisions: [
        {
          revision: 'r2',
          changes: [
            { id: 'a', title: 'x' },
            { id: 'a', title: 'y' },
          ],
        },
      ],
    });
    expect(repeated).toEqual({ ok: false, error: 'change ids must be unique within version "r2"' });
  });

  it('rejects an unknown key, a malformed target, an empty history and a missing version name', () => {
    const one = (change: object) => ({ revisions: [{ revision: 'r2', changes: [change] }] });
    expect(parseChangeLog(one({ title: 'x', link: 'y' })).ok).toBe(false);
    expect(parseChangeLog(one({ title: 'x', target: 'cart' })).ok).toBe(false);
    expect(parseChangeLog({ ...one({ title: 'x' }), extra: 1 }).ok).toBe(false);
    expect(parseChangeLog({ revisions: [] }).ok).toBe(false);
    expect(parseChangeLog({ revisions: [{ revision: '', changes: [] }] }).ok).toBe(false);
    expect(parseChangeLog({ changes: [{ title: 'x' }] }).ok).toBe(false);
  });
});

describe('seen record', () => {
  it('reads a record of the earlier shape as one version', () => {
    expect(parseSeenRecord({ v: 1, revision: 'r2', seen: ['0'] })).toEqual({ v: 2, since: 'r2', seen: { r2: ['0'] } });
    expect(parseSeenRecord({ v: 2, since: 'r2', seen: { r2: ['a'] } })).toEqual({
      v: 2,
      since: 'r2',
      seen: { r2: ['a'] },
    });
    expect(parseSeenRecord({ v: 3, since: 'r2', seen: {} })).toBeNull();
    expect(parseSeenRecord('r2')).toBeNull();
  });
});

describe('what a reader is told', () => {
  const log = history(['r1', 'a', 'b'], ['r2', 'c'], ['r3', 'd', 'e']);

  it('tells a first-time reader only what changed in this version, not the whole history', () => {
    const state = initialNotices(log, null);
    expect(state.toasts).toEqual([k('r3', 'd'), k('r3', 'e')]);
    expect(unreadCount(log, state)).toBe(2);
  });

  it('tells a returning reader every version since the one they left unfinished, toasting only the latest', () => {
    const state = initialNotices(log, { v: 2, since: 'r2', seen: { r2: [] } });
    expect(unreadCount(log, state)).toBe(3);
    expect(state.toasts).toEqual([k('r3', 'd'), k('r3', 'e')]);
  });

  it('tells nothing a reader has seen, in this version or an earlier one', () => {
    const state = initialNotices(log, { v: 2, since: 'r2', seen: { r2: ['c'], r3: ['d'] } });
    expect(unreadCount(log, state)).toBe(1);
    expect(state.toasts).toEqual([k('r3', 'e')]);
  });

  it('tells a reader older than every version kept about all of them', () => {
    expect(unreadCount(log, initialNotices(log, { v: 2, since: 'r0', seen: {} }))).toBe(5);
  });

  it('remembers the oldest version with something unread, and what was seen from there on', () => {
    const state = initialNotices(log, { v: 2, since: 'r1', seen: { r1: ['a', 'b'] } });
    expect(seenRecordOf(log, state)).toEqual({ v: 2, since: 'r2', seen: {} });
    const shown = reduceNotices(log, state, { kind: 'jump', key: k('r2', 'c') });
    expect(seenRecordOf(log, shown)).toEqual({ v: 2, since: 'r3', seen: {} });
    const more = reduceNotices(log, shown, { kind: 'jump', key: k('r3', 'd') });
    expect(seenRecordOf(log, more)).toEqual({ v: 2, since: 'r3', seen: { r3: ['d'] } });
    // Nothing left unread: the next version starts from this one.
    const done = reduceNotices(log, more, { kind: 'jump', key: k('r3', 'e') });
    expect(seenRecordOf(log, done)).toEqual({ v: 2, since: 'r3', seen: { r3: ['d', 'e'] } });
    const next = history(['r1', 'a', 'b'], ['r2', 'c'], ['r3', 'd', 'e'], ['r4', 'f']);
    expect(unreadCount(next, initialNotices(next, seenRecordOf(log, done)))).toBe(1);
  });
});

describe('reduceNotices', () => {
  const log = history(['r2', 'a', 'b', 'c']);

  it('opening the list clears the toasts but leaves each change to show unread until it is shown', () => {
    const mixed = history(
      ['r1', 'old'],
      ['r2', { title: 'a', target: 'screen:a' }, { title: 'b' }, { title: 'c', navigate: 'view=flow' }],
    );
    const opened = reduceNotices(mixed, initialNotices(mixed, null), { kind: 'open-list' });
    expect(opened.list).toEqual({ open: true, fresh: new Set([k('r2', '0'), k('r2', '1'), k('r2', '2')]) });
    expect(opened.toasts).toEqual([]);
    // A change with nowhere to go is all there on its card; one with a Show waits for it.
    expect(opened.seen).toEqual(new Set([k('r2', '1')]));
    expect(unreadCount(mixed, opened)).toBe(2);
    const shown = reduceNotices(mixed, opened, { kind: 'jump', key: k('r2', '0') });
    expect(unreadCount(mixed, shown)).toBe(1);
    // Reopened, the change not shown yet is still new.
    expect(reduceNotices(mixed, shown, { kind: 'open-list' }).list.fresh).toEqual(new Set([k('r2', '2')]));
  });

  it('closing the list keeps what was not shown unread', () => {
    const opened = reduceNotices(log, initialNotices(log, { v: 2, since: 'r2', seen: { r2: ['b'] } }), {
      kind: 'open-list',
    });
    expect(opened.list).toEqual({ open: true, fresh: new Set([k('r2', 'a'), k('r2', 'c')]) });
    const closed = reduceNotices(log, opened, { kind: 'close-list' });
    expect(closed.list).toEqual({ open: false, fresh: new Set() });
    // Changes without a Show were read on their cards, so they are not new any more.
    expect(reduceNotices(log, closed, { kind: 'open-list' }).list.fresh).toEqual(new Set());
  });

  it('a toast that goes away, closed or timed out, leaves its change unread behind the bell', () => {
    const closed = reduceNotices(log, initialNotices(log, null), { kind: 'close-toast', key: k('r2', 'a') });
    expect(closed.toasts).toEqual([k('r2', 'b'), k('r2', 'c')]);
    expect(unreadCount(log, closed)).toBe(3);
  });

  it('jumping to a change marks it seen and closes the list and its toast', () => {
    const start = reduceNotices(log, initialNotices(log, null), { kind: 'open-list' });
    expect(reduceNotices(log, start, { kind: 'jump', key: k('r2', 'c') }).list.open).toBe(false);
    const fromToast = reduceNotices(log, initialNotices(log, null), { kind: 'jump', key: k('r2', 'c') });
    expect(fromToast.toasts).toEqual([k('r2', 'a'), k('r2', 'b')]);
    expect(unreadCount(log, fromToast)).toBe(2);
  });

  it('marking all read clears every version told about, the toasts and the new marks, and keeps the list open', () => {
    const long = history(['r1', 'a'], ['r2', { title: 'b', target: 'screen:b' }, 'c']);
    const start = initialNotices(long, { v: 2, since: 'r1', seen: {} });
    const opened = reduceNotices(long, start, { kind: 'open-list' });
    const read = reduceNotices(long, opened, { kind: 'read-all' });
    expect(unreadCount(long, read)).toBe(0);
    expect(read.toasts).toEqual([]);
    expect(read.list).toEqual({ open: true, fresh: new Set() });
    expect(seenRecordOf(long, read)).toEqual({ v: 2, since: 'r2', seen: { r2: ['0', 'c'] } });
    // From the toasts too, with the list closed.
    expect(reduceNotices(long, start, { kind: 'read-all' }).list.open).toBe(false);
  });
});

describe('jumpOf', () => {
  const entry = (fields: { target?: string; navigate?: string }) =>
    history(['r', { title: 't', ...fields }]).latest.entries[0]!;
  const navigationFor = (target: { type: string; id: string }) =>
    target.type === 'screen' ? { screen: target.id } : null;

  it('brings the target on screen through the template', () => {
    expect(jumpOf(entry({ target: 'screen:cart' }), navigationFor)).toEqual({
      navigate: { screen: 'cart' },
      target: 'screen:cart',
    });
  });

  it("prefers the author's navigation over the template's", () => {
    expect(jumpOf(entry({ target: 'screen:cart', navigate: 'view=flow' }), navigationFor)).toEqual({
      navigate: { view: 'flow' },
      target: 'screen:cart',
    });
  });

  it('has nowhere to go without a target or a navigation', () => {
    expect(jumpOf(entry({}), navigationFor)).toBeNull();
    expect(jumpOf(entry({ target: 'note:x' }), navigationFor)).toEqual({ navigate: null, target: 'note:x' });
  });
});

describe('presentNotices', () => {
  const log = history(
    ['r1', 'old'],
    [
      'r2',
      { title: 'a', target: 'screen:a' },
      { title: 'b', body: 'why' },
      { title: 'c', navigate: 'view=flow' },
      { title: 'd' },
      { title: 'e' },
    ],
  );

  it('shows a few toasts at a time and counts the ones waiting behind them', () => {
    const vm = presentNotices(log, initialNotices(log, { v: 2, since: 'r2', seen: { r2: ['1'] } }));
    expect(vm.unread).toBe(4);
    expect(vm.toasts.map((toast) => toast.id)).toEqual(['0', '2', '3']);
    expect(vm.waiting).toBe(1);
    expect(vm.toasts.map((toast) => toast.jumpable)).toEqual([true, true, false]);
  });

  it('lists every version kept, newest first, and marks the changes that were new when the list opened', () => {
    const opened = reduceNotices(log, initialNotices(log, { v: 2, since: 'r2', seen: { r2: ['1'] } }), {
      kind: 'open-list',
    });
    const vm = presentNotices(log, opened);
    expect(vm.open).toBe(true);
    expect(vm.groups.map((group) => [group.revision, group.latest])).toEqual([
      ['r2', true],
      ['r1', false],
    ]);
    expect(vm.groups[0]?.cards.map((card) => [card.id, card.fresh])).toEqual([
      ['0', true],
      ['1', false],
      ['2', true],
      ['3', true],
      ['4', true],
    ]);
    // Older than what the reader is told about: listed, never new.
    expect(vm.groups[1]?.cards.map((card) => [card.id, card.fresh])).toEqual([['old', false]]);
    expect(vm.groups[0]?.cards[1]).toMatchObject({ title: 'b', body: 'why', jumpable: false });
  });
});
