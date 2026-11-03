/**
 * `polling`: a `Transport` over two plain requests, for a host without a push
 * channel. Pulls and pushes take turns, so an answer never overtakes another;
 * a hidden tab does not pull, and pulls at once when it is shown again.
 */
import type { Cursor, LocalOp, RemoteUpdate } from './protocol';
import type { Transport } from './serve';

export type PollingOptions = {
  /** Default: 5000. */
  readonly intervalMs?: number;
  /** Everything after `cursor`; a snapshot for `undefined`. */
  pull(cursor: Cursor | undefined): Promise<RemoteUpdate>;
  /**
   * See `Transport.push`; `cursor` is the last one delivered when the push
   * takes its turn. Without an answer, a pull follows at once.
   */
  push(ops: readonly LocalOp[], cursor: Cursor | undefined): Promise<RemoteUpdate | void>;
  /** Whether the tab is visible, and when that changes. Default: `document`. */
  readonly visibility?: Visibility;
};

export type Visibility = {
  visible(): boolean;
  watch(changed: () => void): () => void;
};

export const polling = (options: PollingOptions): Transport => {
  const intervalMs = options.intervalMs ?? 5000;
  const visibility = options.visibility ?? documentVisibility;
  /** Requests run one after another. */
  let turn: Promise<unknown> = Promise.resolve();
  const inTurn = <T>(request: () => Promise<T>): Promise<T> => {
    const result = turn.then(request);
    turn = result.catch(() => undefined);
    return result;
  };

  let cursor: Cursor | undefined;
  let pullNow: (() => void) | undefined;

  return {
    listen: (from, onUpdate, onError) => {
      cursor = from;
      let stopped = false;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const schedule = (): void => {
        clearTimeout(timer);
        if (!stopped) timer = setTimeout(pull, intervalMs);
      };
      const pull = (): void => {
        clearTimeout(timer);
        if (stopped) return;
        if (!visibility.visible()) return;
        inTurn(async () => {
          const update = await options.pull(cursor);
          cursor = update.cursor;
          return update;
        }).then(
          (update) => {
            if (stopped) return;
            onUpdate(update);
            schedule();
          },
          (error: unknown) => {
            if (stopped) return;
            onError(error);
            schedule();
          },
        );
      };
      pullNow = pull;
      const stopWatching = visibility.watch(() => {
        if (visibility.visible()) pull();
      });
      pull();
      return () => {
        stopped = true;
        clearTimeout(timer);
        stopWatching();
        pullNow = undefined;
      };
    },
    // The cursor the push was asked with may be behind a pull that took its
    // turn first: the answer would replay that pull.
    push: async (ops) => {
      const answer = await inTurn(async () => {
        const answer = await options.push(ops, cursor);
        if (answer !== undefined) cursor = answer.cursor;
        return answer;
      });
      if (answer === undefined) pullNow?.();
      return answer;
    },
  };
};

const documentVisibility: Visibility = {
  visible: () => typeof document === 'undefined' || document.visibilityState !== 'hidden',
  watch: (changed) => {
    if (typeof document === 'undefined') return () => {};
    document.addEventListener('visibilitychange', changed);
    return () => document.removeEventListener('visibilitychange', changed);
  },
};
