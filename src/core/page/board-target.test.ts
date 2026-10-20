import { describe, expect, it } from 'vitest';

import { PAGE_WIDE_TARGET, qualify, resolveBoardTarget, splitBoard } from './board-target';

describe('board-qualified targets', () => {
  it('splits the board off at the last @', () => {
    expect(splitBoard({ type: 'story', id: 'checkout.pay@scope' })).toEqual({
      board: 'scope',
      target: { type: 'story', id: 'checkout.pay' },
    });
    // A component id may contain @ itself; only the last one names the board.
    expect(splitBoard({ type: 'element', id: 'flow/a@b@domain' })).toEqual({
      board: 'domain',
      target: { type: 'element', id: 'flow/a@b' },
    });
  });

  it('names no board when there is no qualifier', () => {
    expect(splitBoard({ type: 'story', id: 'pay' })).toBeNull();
    expect(splitBoard(PAGE_WIDE_TARGET)).toBeNull();
  });

  it('round-trips through qualify', () => {
    const target = { type: 'event', id: 'paid' };
    expect(splitBoard(qualify(target, 'domain'))).toEqual({ board: 'domain', target });
  });

  it('resolves a board-relative target to the board it was written in', () => {
    const boards = new Set(['scope', 'domain']);
    expect(resolveBoardTarget({ type: 'event', id: 'paid' }, 'domain', boards)).toEqual({
      type: 'event',
      id: 'paid@domain',
    });
    // A target that already names another board crosses over to it.
    expect(resolveBoardTarget({ type: 'story', id: 'pay@scope' }, 'domain', boards)).toEqual({
      type: 'story',
      id: 'pay@scope',
    });
    // An @ that names no board of the page is part of the id.
    expect(resolveBoardTarget({ type: 'element', id: 'mail@home' }, 'domain', boards)).toEqual({
      type: 'element',
      id: 'mail@home@domain',
    });
    expect(resolveBoardTarget(PAGE_WIDE_TARGET, 'domain', boards)).toEqual(PAGE_WIDE_TARGET);
  });
});
