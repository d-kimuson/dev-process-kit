import { describe, expect, it } from 'vitest';

import type { DraftAction } from '../types';
import type { LocalOp } from './protocol';

import { dropHead, EMPTY_OUTBOX, enqueue, loadOutbox, markTried, outboxKey, queuedOps, saveOutbox } from './outbox';
import { MemoryStorageLike } from './testing';

const action = (id: string): DraftAction => ({
  id,
  type: 'comment',
  target: { type: 'page', id: 'page' },
  payload: { body: id },
  createdAt: '2026-11-02T00:00:00.000Z',
});
const append = (id: string): LocalOp => ({ kind: 'append', action: action(id) });
const remove = (id: string): LocalOp => ({ kind: 'remove', id });

describe('outbox', () => {
  it('keeps each push as a unit, in order', () => {
    const outbox = enqueue(enqueue(EMPTY_OUTBOX, [append('a')]), [append('b'), append('c')]);

    expect(outbox.units).toEqual([[append('a')], [append('b'), append('c')]]);
  });

  it('cancels an append never sent instead of queueing its remove', () => {
    const outbox = enqueue(enqueue(EMPTY_OUTBOX, [append('a'), append('b')]), [remove('a')]);

    expect(queuedOps(outbox)).toEqual([append('b')]);
  });

  it('cancels within the same push', () => {
    expect(queuedOps(enqueue(EMPTY_OUTBOX, [append('a'), remove('a')]))).toEqual([]);
  });

  it('queues the remove of an append in a head that was sent once', () => {
    // Quint (coalesceTried): the answer was lost after the host applied the
    // append; cancelling it locally left the action on the host for ever.
    const sent = markTried(enqueue(EMPTY_OUTBOX, [append('a')]));
    const outbox = enqueue(sent, [remove('a')]);

    expect(outbox.units).toEqual([[append('a')], [remove('a')]]);
  });

  it('starts the next head fresh once the head is settled', () => {
    const outbox = dropHead(markTried(enqueue(enqueue(EMPTY_OUTBOX, [append('a')]), [append('b')])));

    expect(outbox).toEqual({ units: [[append('b')]], tried: false });
    expect(queuedOps(enqueue(outbox, [remove('b')]))).toEqual([]);
  });

  it('survives a reload, whether the head was sent included', () => {
    const storage = new MemoryStorageLike();
    const key = outboxKey('page', 'usm', 'me');
    const outbox = markTried(enqueue(EMPTY_OUTBOX, [append('a')]));
    saveOutbox(storage, key, outbox);

    expect(loadOutbox(storage, key)).toEqual(outbox);
    saveOutbox(storage, key, dropHead(outbox));
    expect(storage.getItem(key)).toBeNull();
  });

  it('reads a broken record as empty and leaves out ops it cannot read', () => {
    const storage = new MemoryStorageLike();
    storage.setItem('broken', '{');
    storage.setItem('partly', JSON.stringify({ v: 1, tried: false, units: [[{ kind: 'nope' }, remove('a')]] }));

    expect(loadOutbox(storage, 'broken')).toEqual(EMPTY_OUTBOX);
    expect(loadOutbox(storage, 'partly').units).toEqual([[remove('a')]]);
  });

  it('keys the queue by page, template and reader', () => {
    expect(outboxKey('page', 'usm', 'me')).not.toBe(outboxKey('page', 'usm', 'you'));
    expect(outboxKey('page', 'usm', 'me')).not.toBe(outboxKey('page', 'plain', 'me'));
  });
});
