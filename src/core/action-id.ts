/**
 * Identity for draft actions themselves (not for template entities): ids
 * `<writer>:<seq>`, one writer per browser counting up across reloads, so the
 * change log can name what it handled as ranges (`./addressed.ts`).
 */
import * as v from 'valibot';

import type { KeyValueStore } from '../lib/dom/json-store';

/** Where the browser's writer and its last number are kept, shared by every page of the origin. */
export const ACTION_WRITER_KEY = 'dev-process-kit:action-writer';

const writerRecordSchema = v.object({
  writer: v.pipe(v.string(), v.regex(/^[A-Za-z0-9_-]+$/)),
  seq: v.pipe(v.number(), v.safeInteger(), v.minValue(0)),
});

type WriterRecord = v.InferOutput<typeof writerRecordSchema>;

const randomWriter = (): string => {
  const globalCrypto = globalThis.crypto as Crypto | undefined;
  const bytes = new Uint8Array(8);
  if (globalCrypto?.getRandomValues) globalCrypto.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  return [...bytes].map((byte) => (byte % 36).toString(36)).join('');
};

const readRecord = (raw: string | null): WriterRecord | null => {
  if (raw === null) return null;
  try {
    const parsed = v.safeParse(writerRecordSchema, JSON.parse(raw));
    return parsed.success ? parsed.output : null;
  } catch {
    return null;
  }
};

/**
 * Takes the next number from `store` (read, add one, write). Two tabs taking
 * one at the same instant may share it; only a reader's hand makes an action,
 * so that is left alone. Without storage the writer lasts the page load.
 */
export const actionIdSource = (store: KeyValueStore | null): (() => string) => {
  let memory: WriterRecord | null = null;
  return () => {
    let stored: WriterRecord | null = null;
    try {
      stored = store === null ? null : readRecord(store.getItem(ACTION_WRITER_KEY));
    } catch {
      /* a blocked store counts in memory */
    }
    // A write that failed leaves the memory copy ahead of the stored one.
    const current =
      stored !== null && memory !== null && stored.writer === memory.writer && memory.seq > stored.seq
        ? memory
        : (stored ?? memory ?? { writer: randomWriter(), seq: 0 });
    const next = { writer: current.writer, seq: current.seq + 1 };
    memory = next;
    try {
      store?.setItem(ACTION_WRITER_KEY, JSON.stringify(next));
    } catch {
      /* the memory copy carries on */
    }
    return `${next.writer}:${next.seq}`;
  };
};

const browserStore = (): KeyValueStore | null => {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    // Access throws when cookies are blocked.
    return null;
  }
};

let defaultSource: (() => string) | null = null;

export const createActionId = (): string => {
  defaultSource ??= actionIdSource(browserStore());
  return defaultSource();
};
