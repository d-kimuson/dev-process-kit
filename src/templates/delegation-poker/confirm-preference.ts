import { defaultJsonStore, memoryJsonStore, type JsonStore } from '../../lib/dom/json-store';

/**
 * One key for every page of the origin: skipping the strict-mode warning is
 * the reader's taste, not a property of one board.
 */
const STORAGE_KEY = 'dev-process-kit:delegation-poker:skip-strict-confirm';

const parseSkip = (input: unknown): true | null => (input === true ? true : null);

/** Whether the reader asked not to be warned before a final card again. */
export type SkipConfirmPreference = {
  read(): boolean;
  /** Remembers the opt-out; `false` when it could only be kept for this page load. */
  remember(): boolean;
};

/** `persist` is false for `storage="off"` / `"memory"`: the opt-out then lasts this page load. */
export const skipConfirmPreference = (persist: boolean): SkipConfirmPreference => {
  const store: JsonStore<true> = persist ? defaultJsonStore(parseSkip) : memoryJsonStore(parseSkip);
  return {
    read: () => store.read(STORAGE_KEY) === true,
    remember: () => store.write(STORAGE_KEY, true),
  };
};
