import { describe, expect, it, vi } from 'vitest';

import type { DraftAction } from './types';

import { MemoryDraftStorage, WebStorageDraftStorage, defaultStorageKey, type StorageLike } from './persistence';

const action = (id: string): DraftAction => ({
  id,
  type: 'SET_NAME',
  target: { type: 'item', id: 'a' },
  payload: { name: 'A' },
  createdAt: '2026-01-01T00:00:00.000Z',
});

/** A `StorageLike` whose backing map can be corrupted, like a real browser store. */
const fakeStorage = (initial?: string) => {
  const store = new Map<string, string>();
  if (initial !== undefined) store.set('k', initial);
  const storage: StorageLike = {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => void store.set(key, value),
    removeItem: (key) => void store.delete(key),
  };
  return { storage, store };
};

describe('WebStorageDraftStorage', () => {
  it('round-trips drafts for the same template', () => {
    const { storage } = fakeStorage();
    const drafts = new WebStorageDraftStorage(storage);
    drafts.save('k', 'tiny', [action('one')]);
    expect(drafts.load('k', 'tiny')).toEqual([action('one')]);
  });

  it('returns an empty draft when the stored value is not JSON', () => {
    const { storage } = fakeStorage('{not json');
    expect(new WebStorageDraftStorage(storage).load('k', 'tiny')).toEqual([]);
  });

  it('returns an empty draft when the stored value is not an object', () => {
    const { storage } = fakeStorage('"a string"');
    expect(new WebStorageDraftStorage(storage).load('k', 'tiny')).toEqual([]);
  });

  it('ignores a draft written for another template', () => {
    const { storage } = fakeStorage();
    const drafts = new WebStorageDraftStorage(storage);
    drafts.save('k', 'other', [action('one')]);
    expect(drafts.load('k', 'tiny')).toEqual([]);
  });

  it('ignores a draft written by another storage version', () => {
    const { storage } = fakeStorage(JSON.stringify({ v: 2, template: 'tiny', actions: [action('one')] }));
    expect(new WebStorageDraftStorage(storage).load('k', 'tiny')).toEqual([]);
  });

  it('ignores a record whose actions field is not an array', () => {
    const { storage } = fakeStorage(JSON.stringify({ v: 1, template: 'tiny', actions: 'nope' }));
    expect(new WebStorageDraftStorage(storage).load('k', 'tiny')).toEqual([]);
  });

  it('drops malformed action entries but keeps well-formed ones', () => {
    const { storage } = fakeStorage(
      JSON.stringify({
        v: 1,
        template: 'tiny',
        actions: [action('good'), { id: 'bad' }, null, { id: 'x', type: 1, createdAt: 'now', target: {} }],
      }),
    );
    expect(new WebStorageDraftStorage(storage).load('k', 'tiny').map((entry) => entry.id)).toEqual(['good']);
  });

  it('does not throw when the backing store rejects writes', () => {
    const storage: StorageLike = {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
      removeItem: () => {
        throw new Error('blocked');
      },
    };
    const drafts = new WebStorageDraftStorage(storage);
    expect(() => drafts.save('k', 'tiny', [action('one')])).not.toThrow();
    expect(() => drafts.clear('k')).not.toThrow();
  });

  it('keeps drafts in memory for the session when the backing store is unusable', () => {
    const drafts = new MemoryDraftStorage();
    drafts.save('k', 'tiny', [action('one')]);
    expect(drafts.load('k', 'tiny')).toEqual([action('one')]);
    drafts.clear('k');
    expect(drafts.load('k', 'tiny')).toEqual([]);
  });
});

describe('defaultStorageKey', () => {
  it('is scoped by path, search and template', () => {
    const key = defaultStorageKey('prototype');
    expect(key).toContain('dev-process-kit:draft:');
    expect(key.endsWith(':prototype')).toBe(true);
  });

  it('is stable for the same template', () => {
    expect(defaultStorageKey('usm')).toBe(defaultStorageKey('usm'));
  });
});

describe('MemoryDraftStorage isolation', () => {
  it('does not leak drafts between templates', () => {
    const drafts = new MemoryDraftStorage();
    drafts.save('k', 'tiny', [action('one')]);
    expect(drafts.load('k', 'usm')).toEqual([]);
  });
});

describe('storage failures never escape to the caller', () => {
  it('treats a throwing read as an empty draft', () => {
    const storage: StorageLike = {
      getItem: vi.fn(() => {
        throw new Error('SecurityError');
      }),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    // A blocked store is a browser condition, not a program error.
    expect(new WebStorageDraftStorage(storage).load('k', 'tiny')).toEqual([]);
  });
});
