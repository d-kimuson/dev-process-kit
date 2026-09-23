import * as v from 'valibot';

import type { DraftAction } from './types';

import { draftActionEnvelopeSchema } from './schema';

export type DraftRecord = {
  readonly v: 1;
  readonly template: string;
  readonly actions: readonly DraftAction[];
};

export type DraftStorage = {
  load(key: string, template: string): readonly DraftAction[];
  save(key: string, template: string, actions: readonly DraftAction[]): void;
  clear(key: string): void;
};

export type StorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

/**
 * What a stored draft looks like. LocalStorage is external input: it is parsed
 * and validated, never trusted, so a hand-edited or stale record cannot reach
 * the pipeline.
 */
const draftRecordSchema = v.object({
  v: v.literal(1),
  template: v.pipe(v.string(), v.minLength(1)),
  actions: v.array(v.unknown()),
});

/** Persist drafts across reload / browser reopen. */
export class WebStorageDraftStorage implements DraftStorage {
  constructor(private readonly storage: StorageLike) {}

  load(key: string, template: string): readonly DraftAction[] {
    try {
      const raw = this.storage.getItem(key);
      if (raw === null) return [];
      const record = v.safeParse(draftRecordSchema, JSON.parse(raw));
      if (!record.success || record.output.template !== template) return [];
      return record.output.actions.flatMap((entry) => {
        const action = v.safeParse(draftActionEnvelopeSchema, entry);
        return action.success ? [action.output] : [];
      });
    } catch {
      // Corrupt JSON, a blocked store, or a security error: no draft is better
      // than a broken page.
      return [];
    }
  }

  save(key: string, template: string, actions: readonly DraftAction[]): void {
    const record: DraftRecord = { v: 1, template, actions };
    try {
      this.storage.setItem(key, JSON.stringify(record));
    } catch {
      /* quota / private mode: drafts stay in memory for this session */
    }
  }

  clear(key: string): void {
    try {
      this.storage.removeItem(key);
    } catch {
      /* ignore */
    }
  }
}

/** Used by tests, SSR and `storage="off"` elements. */
export class MemoryDraftStorage implements DraftStorage {
  private readonly store = new Map<string, string>();

  load(key: string, template: string): readonly DraftAction[] {
    return new WebStorageDraftStorage({
      getItem: (k) => this.store.get(k) ?? null,
      setItem: (k, v) => void this.store.set(k, v),
      removeItem: (k) => void this.store.delete(k),
    }).load(key, template);
  }

  save(key: string, template: string, actions: readonly DraftAction[]): void {
    this.store.set(key, JSON.stringify({ v: 1, template, actions } satisfies DraftRecord));
  }

  clear(key: string): void {
    this.store.delete(key);
  }
}

export const defaultStorage = (): DraftStorage => {
  try {
    if (typeof localStorage !== 'undefined') return new WebStorageDraftStorage(localStorage);
  } catch {
    /* access can throw when cookies are blocked */
  }
  return new MemoryDraftStorage();
};

export const defaultStorageKey = (template: string): string => {
  const path = typeof location === 'undefined' ? 'local' : `${location.pathname}${location.search}`;
  return `dev-process-kit:draft:${path}:${template}`;
};
