/**
 * The host's queue of a reader's ops, in the units the reader pushed them.
 * Pure; `serve.ts` keeps it in storage and sends the head unit.
 *
 * A remove of an append still waiting in the queue takes the append out
 * instead of being queued — except in the head unit once it was sent: the
 * answer may have been lost after the host applied it, so the remove must
 * reach the host.
 */
import * as v from 'valibot';

import type { StorageLike } from '../persistence';

import { readLocalOps, type LocalOp } from './protocol';

export type Outbox = {
  readonly units: readonly (readonly LocalOp[])[];
  /** Whether the head unit was sent at least once. */
  readonly tried: boolean;
};

export const EMPTY_OUTBOX: Outbox = { units: [], tried: false };

export const queuedOps = (outbox: Outbox): LocalOp[] => outbox.units.flat();

export const enqueue = (outbox: Outbox, ops: readonly LocalOp[]): Outbox => {
  const first = outbox.tried ? 1 : 0;
  const units = ops.reduce<LocalOp[][]>(
    (acc, op) => {
      if (op.kind === 'remove') {
        const at = acc.findIndex(
          (unit, index) =>
            index >= first && unit.some((queued) => queued.kind === 'append' && queued.action.id === op.id),
        );
        if (at >= 0) {
          return acc.map((unit, index) =>
            index === at ? unit.filter((queued) => !(queued.kind === 'append' && queued.action.id === op.id)) : unit,
          );
        }
      }
      return acc.map((unit, index) => (index === acc.length - 1 ? [...unit, op] : unit));
    },
    [...outbox.units.map((unit) => [...unit]), []],
  );
  // A sent head is never touched, so only units not sent yet can empty out.
  return { units: units.filter((unit) => unit.length > 0), tried: outbox.tried };
};

/** The head unit is on its way. */
export const markTried = (outbox: Outbox): Outbox => (outbox.units.length === 0 ? outbox : { ...outbox, tried: true });

/** The head unit is settled: acknowledged, or rejected for good. */
export const dropHead = (outbox: Outbox): Outbox => ({ units: outbox.units.slice(1), tried: false });

// ----------------------------------------------------------------- storage

const recordSchema = v.object({
  v: v.literal(1),
  units: v.array(v.array(v.unknown())),
  tried: v.boolean(),
});

export const outboxKey = (storageKey: string, template: string, selfId: string): string =>
  `dev-process-kit:sync-outbox:${storageKey}:${template}:${selfId}`;

export const loadOutbox = (storage: StorageLike | null, key: string): Outbox => {
  if (storage === null) return EMPTY_OUTBOX;
  try {
    const raw = storage.getItem(key);
    if (raw === null) return EMPTY_OUTBOX;
    const record = v.safeParse(recordSchema, JSON.parse(raw));
    if (!record.success) return EMPTY_OUTBOX;
    const units = record.output.units.map(readLocalOps).filter((unit) => unit.length > 0);
    return { units, tried: record.output.tried && units.length > 0 };
  } catch {
    // Corrupt JSON or a blocked store: nothing to resend.
    return EMPTY_OUTBOX;
  }
};

export const saveOutbox = (storage: StorageLike | null, key: string, outbox: Outbox): void => {
  if (storage === null) return;
  try {
    if (outbox.units.length === 0) storage.removeItem(key);
    else storage.setItem(key, JSON.stringify({ v: 1, units: outbox.units, tried: outbox.tried }));
  } catch {
    /* quota / private mode: the queue lives as long as the page */
  }
};
