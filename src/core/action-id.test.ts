import { describe, expect, it } from 'vitest';

import { ACTION_WRITER_KEY, actionIdSource } from './action-id';
import { MemoryStorageLike } from './sync/testing';

describe('actionIdSource', () => {
  it('counts up under one writer, across sources on the same storage', () => {
    const store = new MemoryStorageLike();
    const first = actionIdSource(store);
    const a = first();
    const b = first();
    const writer = a.split(':')[0];
    expect(writer).toMatch(/^[a-z0-9]{8}$/);
    expect([a, b]).toEqual([`${writer}:1`, `${writer}:2`]);
    // A reload: a new source reads where the last one stopped.
    expect(actionIdSource(store)()).toBe(`${writer}:3`);
  });

  it('starts over under a new writer when the stored record is unreadable', () => {
    const store = new MemoryStorageLike();
    store.setItem(ACTION_WRITER_KEY, '{"writer":"bad writer","seq":3}');
    expect(actionIdSource(store)()).toMatch(/^[a-z0-9]{8}:1$/);
  });

  it('counts in memory without storage', () => {
    const next = actionIdSource(null);
    const writer = next().split(':')[0];
    expect(next()).toBe(`${writer}:2`);
  });

  it('carries on in memory when the store refuses a write', () => {
    const store = new MemoryStorageLike();
    const next = actionIdSource(store);
    const writer = next().split(':')[0];
    store.setItem = () => {
      throw new Error('quota');
    };
    expect([next(), next()]).toEqual([`${writer}:2`, `${writer}:3`]);
  });
});
