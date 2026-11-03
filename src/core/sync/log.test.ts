import { describe, expect, it } from 'vitest';

import type { DraftAction } from '../types';
import type { IncomingOp, IncomingUpdate, LocalOp, SyncEntry } from './protocol';

import {
  appendOwn,
  clearAll,
  clearMark,
  openLog,
  receive,
  reconcile,
  retract,
  visibleActions,
  type SyncLog,
} from './log';

const me = { id: 'me', name: 'Me' };
const them = { id: 'them', name: 'Them' };

const action = (id: string): DraftAction => ({
  id,
  type: 'comment',
  target: { type: 'page', id: 'page' },
  payload: { body: id },
  createdAt: '2026-11-02T00:00:00.000Z',
});
const entry = (id: string, author = them): SyncEntry => ({ action: action(id), author });
const snapshot = (cursor: string, ...entries: SyncEntry[]): IncomingUpdate => ({ kind: 'snapshot', cursor, entries });
const ops = (cursor: string, ...list: IncomingOp[]): IncomingUpdate => ({ kind: 'ops', cursor, ops: list });
const appended = (id: string, author = them): IncomingOp => ({ kind: 'append', entry: entry(id, author) });
const ids = (log: SyncLog) => visibleActions(log).map((item) => item.id);

/** Lays steps one after another, keeping the outbox the host would hold. */
const own = (log: SyncLog, id: string): { log: SyncLog; outbox: LocalOp[] } => {
  const step = appendOwn(log, action(id));
  return { log: step.log, outbox: [...step.push] };
};

describe('sync log', () => {
  it('shows own ops on top of what the host confirmed', () => {
    const log = receive(openLog(me, []), snapshot('1', entry('a')), []);
    const { log: next } = own(log, 'b');

    expect(ids(next)).toEqual(['a', 'b']);
  });

  it('keeps an own action whose push was answered after a retry', () => {
    // Quint (naivePush): the first answer was lost, the retry was a no-op on
    // the host, and an answer of "what this push changed" was empty.
    const start = receive(openLog(me, []), snapshot('0'), []);
    const { log } = own(start, 'mine');
    const answered = receive(log, ops('0', appended('mine', me)), []);

    expect(ids(answered)).toEqual(['mine']);
  });

  it('settles an acknowledged append even when another reader already cleared it', () => {
    // Quint (settleByReflection): waiting for the append to show up in the
    // log left it pending, and visible, for ever.
    const start = receive(openLog(me, []), snapshot('0'), []);
    const { log } = own(start, 'mine');
    const cleared = receive(log, snapshot('2'), []);

    expect(ids(cleared)).toEqual([]);
    expect(cleared.pending).toEqual([]);
  });

  it('keeps an own op pending while the host still holds it', () => {
    const start = receive(openLog(me, []), snapshot('0'), []);
    const { log, outbox } = own(start, 'mine');
    const elsewhere = receive(log, ops('1', appended('theirs')), outbox);

    expect(ids(elsewhere)).toEqual(['theirs', 'mine']);
  });

  it('clears exactly up to a cursor it received', () => {
    let log = receive(openLog(me, []), snapshot('1', entry('a')), []);
    log = receive(log, ops('2', appended('b')), []);
    log = receive(log, ops('3', appended('c'), { kind: 'clear', upTo: '2' }), []);

    expect(ids(log)).toEqual(['c']);
  });

  it('drops everything received before a clear at a cursor it never received', () => {
    // Quint (clearAsOps): a reader that skipped the clearer's cursor kept what
    // the clear deleted. The host answers such a range with a snapshot; this
    // is the fallback for one that does not.
    let log = receive(openLog(me, []), snapshot('1', entry('a')), []);
    log = receive(log, ops('5', { kind: 'clear', upTo: '4' }, appended('d')), []);

    expect(ids(log)).toEqual(['d']);
  });

  it('ignores an append it already holds and a remove of an absent action', () => {
    let log = receive(openLog(me, []), snapshot('1', entry('a')), []);
    log = receive(log, ops('2', appended('a'), { kind: 'remove', id: 'zz' }), []);

    expect(ids(log)).toEqual(['a']);
  });

  it('takes back an unconfirmed own append and keeps the remove for the wire', () => {
    const start = receive(openLog(me, []), snapshot('0'), []);
    const { log } = own(start, 'mine');
    const step = retract(log, 'mine');

    expect(ids(step.log)).toEqual([]);
    expect(step.push).toEqual([{ kind: 'remove', id: 'mine' }]);
    // The append was on the wire after all: the pending remove still hides it.
    const confirmed = receive(step.log, ops('1', appended('mine', me)), step.push);
    expect(ids(confirmed)).toEqual([]);
  });

  it('never takes back another reader action unless asked', () => {
    const log = receive(openLog(me, []), snapshot('1', entry('theirs')), []);

    expect(retract(log, 'theirs').push).toEqual([]);
    expect(retract(log, 'theirs', { others: true }).push).toEqual([{ kind: 'remove', id: 'theirs' }]);
  });

  it('clears what it saw and its own actions, and leaves what others added since', () => {
    // Quint (clearKeepsOwn): the clear did not cover own unsent appends,
    // ordered after its cursor, so they survived.
    let log = receive(openLog(me, []), snapshot('1', entry('a'), entry('b', me)), []);
    log = appendOwn(log, action('mine')).log;
    const mark = clearMark(log);
    // Someone adds while the warning is open.
    log = receive(log, ops('2', appended('late')), [{ kind: 'append', action: action('mine') }]);
    const step = clearAll(log, mark);

    expect(ids(step.log)).toEqual(['late']);
    expect(step.push).toEqual([
      { kind: 'remove', id: 'mine' },
      { kind: 'clear', upTo: '1' },
    ]);
  });

  it('only takes back its own actions when the host has not answered yet', () => {
    const { log } = own(openLog(me, []), 'mine');
    const step = clearAll(log, clearMark(log));

    expect(ids(step.log)).toEqual([]);
    expect(step.push).toEqual([{ kind: 'remove', id: 'mine' }]);
  });

  it('restores own pending ops after a reload', () => {
    const log = openLog(me, [{ kind: 'append', action: action('mine') }]);

    expect(ids(log)).toEqual(['mine']);
  });

  describe('reconcile', () => {
    const start = () =>
      appendOwn(receive(openLog(me, []), snapshot('1', entry('theirs'), entry('sent', me)), []), action('unsent')).log;

    it('appends what is new, in order', () => {
      const step = reconcile(
        start(),
        [action('theirs'), action('sent'), action('unsent'), action('x'), action('y')],
        'pending',
      );

      expect(ids(step.log)).toEqual(['theirs', 'sent', 'unsent', 'x', 'y']);
      expect(step.push).toEqual([
        { kind: 'append', action: action('x') },
        { kind: 'append', action: action('y') },
      ]);
    });

    it('folds only into own actions not sent yet when a dispatch replaces earlier ones', () => {
      const step = reconcile(start(), [action('z')], 'pending');

      expect(ids(step.log)).toEqual(['theirs', 'sent', 'z']);
    });

    it('takes back any own action for undo, and never another reader one', () => {
      expect(ids(reconcile(start(), [], 'own').log)).toEqual(['theirs']);
    });

    it('takes back any action when the reader deletes it', () => {
      expect(ids(reconcile(start(), [action('sent'), action('unsent')], 'any').log)).toEqual(['sent', 'unsent']);
    });
  });
});
