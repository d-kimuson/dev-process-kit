import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { RemoteUpdate } from './protocol';

import { polling, type Visibility } from './polling';

const update = (cursor: string): RemoteUpdate => ({ kind: 'ops', cursor, ops: [] });

const fakeVisibility = () => {
  let visible = true;
  let changed = () => {};
  const visibility: Visibility = {
    visible: () => visible,
    watch: (callback) => {
      changed = callback;
      return () => {};
    },
  };
  return {
    visibility,
    set: (next: boolean) => {
      visible = next;
      changed();
    },
  };
};

describe('polling', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('pulls from the last cursor every interval', async () => {
    const pulls: (string | undefined)[] = [];
    const transport = polling({
      intervalMs: 1000,
      pull: async (cursor) => {
        pulls.push(cursor);
        return update(`c${pulls.length}`);
      },
      push: async () => {},
      visibility: fakeVisibility().visibility,
    });
    const received: RemoteUpdate[] = [];
    transport.listen(
      undefined,
      (item) => received.push(item),
      () => {},
    );
    await vi.advanceTimersByTimeAsync(2000);

    expect(pulls).toEqual([undefined, 'c1', 'c2']);
    expect(received.map((item) => item.cursor)).toEqual(['c1', 'c2', 'c3']);
  });

  it('does not pull while the tab is hidden and pulls when it is shown', async () => {
    const pull = vi.fn(async () => update('c'));
    const tab = fakeVisibility();
    const transport = polling({ intervalMs: 1000, pull, push: async () => {}, visibility: tab.visibility });
    transport.listen(
      undefined,
      () => {},
      () => {},
    );
    await vi.advanceTimersByTimeAsync(0);
    tab.set(false);
    await vi.advanceTimersByTimeAsync(5000);
    expect(pull).toHaveBeenCalledTimes(1);

    tab.set(true);
    await vi.advanceTimersByTimeAsync(0);
    expect(pull).toHaveBeenCalledTimes(2);
  });

  it('pulls at once after a push without an answer', async () => {
    const pull = vi.fn(async () => update('c'));
    const transport = polling({
      intervalMs: 60_000,
      pull,
      push: async () => {},
      visibility: fakeVisibility().visibility,
    });
    transport.listen(
      undefined,
      () => {},
      () => {},
    );
    await vi.advanceTimersByTimeAsync(0);
    await transport.push([], undefined);
    await vi.advanceTimersByTimeAsync(0);

    expect(pull).toHaveBeenCalledTimes(2);
  });

  it('pushes from the cursor a pull that took its turn first delivered', async () => {
    let answerPull = (_: RemoteUpdate) => {};
    const pushedFrom: (string | undefined)[] = [];
    const transport = polling({
      pull: () =>
        new Promise((resolve) => {
          answerPull = resolve;
        }),
      push: async (_ops, cursor) => {
        pushedFrom.push(cursor);
        return update('after-push');
      },
      visibility: fakeVisibility().visibility,
    });
    transport.listen(
      'c0',
      () => {},
      () => {},
    );
    const pushed = transport.push([], 'c0');
    await vi.advanceTimersByTimeAsync(0);
    answerPull(update('c1'));

    expect(await pushed).toEqual(update('after-push'));
    expect(pushedFrom).toEqual(['c1']);
  });

  it('reports a failed pull and keeps polling', async () => {
    const pull = vi.fn().mockRejectedValueOnce(new Error('down')).mockResolvedValue(update('c'));
    const errors: unknown[] = [];
    const transport = polling({
      intervalMs: 1000,
      pull,
      push: async () => {},
      visibility: fakeVisibility().visibility,
    });
    transport.listen(
      undefined,
      () => {},
      (error) => errors.push(error),
    );
    await vi.advanceTimersByTimeAsync(1000);

    expect(errors).toHaveLength(1);
    expect(pull).toHaveBeenCalledTimes(2);
  });

  it('stops pulling once the listener stops', async () => {
    const pull = vi.fn(async () => update('c'));
    const transport = polling({
      intervalMs: 1000,
      pull,
      push: async () => {},
      visibility: fakeVisibility().visibility,
    });
    const stop = transport.listen(
      undefined,
      () => {},
      () => {},
    );
    await vi.advanceTimersByTimeAsync(0);
    stop();
    await vi.advanceTimersByTimeAsync(5000);

    expect(pull).toHaveBeenCalledTimes(1);
  });
});
