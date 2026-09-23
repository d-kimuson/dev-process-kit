/**
 * JSON key/value persistence for components that keep their own state (the
 * grill panel's answers, for example).
 *
 * Nothing here trusts stored JSON: `parse` is the boundary where the value is
 * validated into a named domain type, and `write` reports failure instead of
 * throwing, so a full quota or a blocked store degrades to "this session only"
 * rather than breaking the UI.
 */
export type KeyValueStore = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

export type JsonStore<T> = {
  /** Validated value, or `null` when absent / unreadable / invalid. */
  read(key: string): T | null;
  /** `false` when the value could not be persisted. */
  write(key: string, value: T): boolean;
  remove(key: string): void;
};

export const jsonStoreOver = <T>(store: KeyValueStore, parse: (input: unknown) => T | null): JsonStore<T> => ({
  read(key) {
    try {
      const raw = store.getItem(key);
      return raw === null ? null : parse(JSON.parse(raw));
    } catch {
      // Corrupt JSON or a security error: no stored state is better than a crash.
      return null;
    }
  },
  write(key, value) {
    try {
      store.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },
  remove(key) {
    try {
      store.removeItem(key);
    } catch {
      /* ignore */
    }
  },
});

/** Used by tests, SSR, and `storage="memory"`. */
export const memoryJsonStore = <T>(parse: (input: unknown) => T | null): JsonStore<T> => {
  const entries = new Map<string, string>();
  return jsonStoreOver(
    {
      getItem: (key) => entries.get(key) ?? null,
      setItem: (key, value) => void entries.set(key, value),
      removeItem: (key) => void entries.delete(key),
    },
    parse,
  );
};

export const defaultJsonStore = <T>(parse: (input: unknown) => T | null): JsonStore<T> => {
  try {
    if (typeof localStorage !== 'undefined') return jsonStoreOver(localStorage, parse);
  } catch {
    /* access can throw when cookies are blocked */
  }
  return memoryJsonStore(parse);
};
