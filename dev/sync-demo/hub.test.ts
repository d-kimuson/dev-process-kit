import { describe, expect, it } from 'vitest';

import { DraftLog, type IncomingOp, type StoredAction } from './hub.ts';

const alice = { id: 'alice', name: 'Alice' };
const bob = { id: 'bob', name: 'Bob' };
const action = (id: string): StoredAction => ({ id, type: 'comment', payload: { body: id } });
const append = (id: string): IncomingOp => ({ kind: 'append', action: action(id) });
const ids = (log: DraftLog) => log.actions.map((item) => item.id);

describe('DraftLog', () => {
  it('stamps each append with its author, once per id, and ignores a remove of nothing', () => {
    const log = new DraftLog('e1');
    log.apply(alice, [append('a'), { kind: 'remove', id: 'missing' }]);
    // The body's author is not the server's word: the request's is.
    log.apply(bob, [{ kind: 'append', action: { ...action('a'), author: bob } }]);

    expect(log.actions).toEqual([{ ...action('a'), author: alice }]);
    expect(log.entries).toHaveLength(1);
  });

  it('answers with the ops after a cursor, and with a snapshot for none or a foreign one', () => {
    const log = new DraftLog('e1');
    log.apply(alice, [append('a')]);
    const { cursor } = log.answer(undefined);
    log.apply(bob, [append('b')]);

    expect(log.answer(cursor)).toEqual({
      kind: 'ops',
      cursor: 'e1-2',
      ops: [{ kind: 'append', action: { ...action('b'), author: bob } }],
    });
    expect(log.answer('e0-1')).toMatchObject({ kind: 'snapshot', cursor: 'e1-2' });
    expect(log.answer('e1-9')).toMatchObject({ kind: 'snapshot' });
  });

  it('clears up to a cursor, keeps what came later, and answers a range holding the clear with a snapshot', () => {
    const log = new DraftLog('e1');
    log.apply(alice, [append('a')]);
    const seen = log.answer(undefined).cursor;
    log.apply(bob, [append('late')]);
    log.apply(alice, [{ kind: 'clear', upTo: seen }]);

    expect(ids(log)).toEqual(['late']);
    expect(log.answer(seen)).toEqual({
      kind: 'snapshot',
      cursor: 'e1-3',
      actions: [{ ...action('late'), author: bob }],
    });
  });

  it('takes no clear of a cursor it never gave', () => {
    const log = new DraftLog('e1');
    log.apply(alice, [append('a'), { kind: 'clear', upTo: 'e0-5' }]);

    expect(ids(log)).toEqual(['a']);
  });
});
