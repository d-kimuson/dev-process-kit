import { describe, expect, it } from 'vitest';

import {
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

const log = (revision: string, ...titles: string[]): ChangeLog => {
  const parsed = parseChangeLog({ revision, changes: titles.map((title) => ({ title })) });
  if (!parsed.ok) throw new Error(parsed.error);
  return parsed.log;
};

describe('parseChangeLog', () => {
  it('reads what changed since the previous version, keyed by id or by position', () => {
    const parsed = parseChangeLog({
      revision: 'r2',
      changes: [
        { id: 'coupon', title: 'Coupon field', body: 'On the cart', target: 'screen:cart', navigate: 'view=app' },
        { title: 'Copy fixes' },
      ],
    });
    expect(parsed).toEqual({
      ok: true,
      log: {
        revision: 'r2',
        entries: [
          { key: 'coupon', title: 'Coupon field', body: 'On the cart', target: 'screen:cart', navigate: 'view=app' },
          { key: '1', title: 'Copy fixes', body: null, target: null, navigate: null },
        ],
      },
    });
  });

  it('rejects an unknown key, a malformed target and a repeated id', () => {
    expect(parseChangeLog({ revision: 'r2', changes: [{ title: 'x', link: 'y' }] }).ok).toBe(false);
    expect(parseChangeLog({ revision: 'r2', changes: [{ title: 'x', target: 'cart' }] }).ok).toBe(false);
    expect(parseChangeLog({ revision: 'r2', changes: [{ title: 'x' }], extra: 1 }).ok).toBe(false);
    expect(
      parseChangeLog({
        revision: 'r2',
        changes: [
          { id: 'a', title: 'x' },
          { id: 'a', title: 'y' },
        ],
      }).ok,
    ).toBe(false);
  });

  it('requires a revision, since what the reader has seen is kept per revision', () => {
    expect(parseChangeLog({ changes: [{ title: 'x' }] }).ok).toBe(false);
    expect(parseChangeLog({ revision: '', changes: [{ title: 'x' }] }).ok).toBe(false);
  });
});

describe('seen record', () => {
  it('keeps the seen keys of the current revision only', () => {
    const current = log('r2', 'a', 'b');
    expect(initialNotices(current, { v: 1, revision: 'r2', seen: ['0'] }).seen).toEqual(new Set(['0']));
    // A newer revision starts unread, whatever was seen before it.
    expect(initialNotices(current, { v: 1, revision: 'r1', seen: ['0', '1'] }).seen).toEqual(new Set());
  });

  it('ignores a stored record of another shape', () => {
    expect(parseSeenRecord({ v: 1, revision: 'r2', seen: ['0'] })).toEqual({ v: 1, revision: 'r2', seen: ['0'] });
    expect(parseSeenRecord({ v: 2, revision: 'r2', seen: [] })).toBeNull();
    expect(parseSeenRecord('r2')).toBeNull();
  });

  it('writes back the keys that still exist', () => {
    const current = log('r2', 'a', 'b');
    const state = reduceNotices(current, initialNotices(current, null), { kind: 'dismiss-toast', key: '1' });
    expect(seenRecordOf(current, state)).toEqual({ v: 1, revision: 'r2', seen: ['1'] });
  });
});

describe('reduceNotices', () => {
  const current = log('r2', 'a', 'b', 'c');

  it('toasts every change the reader has not seen yet', () => {
    const state = initialNotices(current, { v: 1, revision: 'r2', seen: ['1'] });
    expect(state.toasts).toEqual(['0', '2']);
    expect(unreadCount(current, state)).toBe(2);
  });

  it('opening the list clears the badge and the toasts but keeps every change listed', () => {
    const opened = reduceNotices(current, initialNotices(current, { v: 1, revision: 'r2', seen: ['1'] }), {
      kind: 'open-list',
    });
    expect(opened.list).toEqual({ open: true, fresh: new Set(['0', '2']) });
    expect(opened.toasts).toEqual([]);
    expect(unreadCount(current, opened)).toBe(0);
    const closed = reduceNotices(current, opened, { kind: 'close-list' });
    expect(closed.list).toEqual({ open: false, fresh: new Set() });
    // Reopened, nothing is new any more.
    expect(reduceNotices(current, closed, { kind: 'open-list' }).list.fresh).toEqual(new Set());
  });

  it('a dismissed toast counts as seen; one that times out stays unread', () => {
    const start = initialNotices(current, null);
    const dismissed = reduceNotices(current, start, { kind: 'dismiss-toast', key: '0' });
    expect(dismissed.toasts).toEqual(['1', '2']);
    expect(unreadCount(current, dismissed)).toBe(2);
    const expired = reduceNotices(current, dismissed, { kind: 'expire-toast', key: '1' });
    expect(expired.toasts).toEqual(['2']);
    expect(unreadCount(current, expired)).toBe(2);
  });

  it('jumping to a change marks it seen and closes the list and its toast', () => {
    const start = reduceNotices(current, initialNotices(current, null), { kind: 'open-list' });
    const jumped = reduceNotices(current, start, { kind: 'jump', key: '2' });
    expect(jumped.list.open).toBe(false);
    const fromToast = reduceNotices(current, initialNotices(current, null), { kind: 'jump', key: '2' });
    expect(fromToast.toasts).toEqual(['0', '1']);
    expect(unreadCount(current, fromToast)).toBe(2);
  });
});

describe('jumpOf', () => {
  const entry = (fields: { target?: string; navigate?: string }) => {
    const parsed = parseChangeLog({ revision: 'r', changes: [{ title: 't', ...fields }] });
    if (!parsed.ok) throw new Error(parsed.error);
    const [first] = parsed.log.entries;
    if (!first) throw new Error('no entry');
    return first;
  };
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
  const parsed = parseChangeLog({
    revision: 'r2',
    changes: [
      { title: 'a', target: 'screen:a' },
      { title: 'b', body: 'why' },
      { title: 'c', navigate: 'view=flow' },
      { title: 'd' },
      { title: 'e' },
    ],
  });
  if (!parsed.ok) throw new Error(parsed.error);
  const current = parsed.log;

  it('shows a few toasts at a time and counts the ones waiting behind them', () => {
    const vm = presentNotices(current, initialNotices(current, { v: 1, revision: 'r2', seen: ['1'] }));
    expect(vm.unread).toBe(4);
    expect(vm.toasts.map((toast) => toast.key)).toEqual(['0', '2', '3']);
    expect(vm.waiting).toBe(1);
    expect(vm.toasts.map((toast) => toast.jumpable)).toEqual([true, true, false]);
  });

  it('lists every change and marks the ones that were new when the list opened', () => {
    const opened = reduceNotices(current, initialNotices(current, { v: 1, revision: 'r2', seen: ['1'] }), {
      kind: 'open-list',
    });
    const vm = presentNotices(current, opened);
    expect(vm.open).toBe(true);
    expect(vm.cards.map((card) => [card.key, card.fresh])).toEqual([
      ['0', true],
      ['1', false],
      ['2', true],
      ['3', true],
      ['4', true],
    ]);
    expect(vm.cards[1]).toMatchObject({ title: 'b', body: 'why', jumpable: false });
  });
});
