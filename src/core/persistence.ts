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
  /**
   * A store shared by several readers pushes the whole draft whenever another
   * reader changes it. The snapshot is external input and is validated before
   * it replaces the draft; it is never written back. Returns the unsubscribe.
   */
  subscribe?(key: string, template: string, onChange: (actions: readonly unknown[]) => void): () => void;
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

/** Event a template element dispatches before it restores its draft. */
export const STORAGE_REQUEST_EVENT = 'dpk-storage-request';

export type ProvidedStorage = { readonly storage: DraftStorage; readonly author?: string };

export type StorageRequestDetail = {
  readonly template: string;
  readonly storageKey: string;
  provide(storage: DraftStorage, options?: { readonly author?: string }): void;
};

/** The provided value comes from page script: check its shape before the controller relies on it. */
const isDraftStorage = (value: unknown): value is DraftStorage => {
  if (typeof value !== 'object' || value === null) return false;
  const store: Partial<Record<keyof DraftStorage, unknown>> = value;
  return (
    typeof store.load === 'function' &&
    typeof store.save === 'function' &&
    typeof store.clear === 'function' &&
    (store.subscribe === undefined || typeof store.subscribe === 'function')
  );
};

/**
 * Lets the page that hosts the element keep the draft somewhere else, for
 * example in a store several readers share. A listener answers synchronously
 * with `provide`; with no answer the element keeps its default store.
 */
export const requestDraftStorage = (
  host: EventTarget,
  template: string,
  storageKey: string,
): ProvidedStorage | undefined => {
  let provided: ProvidedStorage | undefined;
  const detail: StorageRequestDetail = {
    template,
    storageKey,
    provide(storage, options) {
      if (provided !== undefined || !isDraftStorage(storage)) return;
      const author = typeof options?.author === 'string' && options.author.length > 0 ? options.author : undefined;
      provided = author === undefined ? { storage } : { storage, author };
    },
  };
  host.dispatchEvent(new CustomEvent(STORAGE_REQUEST_EVENT, { detail, bubbles: true, composed: true }));
  return provided;
};
