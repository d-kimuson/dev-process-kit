import { describe, expect, it, vi } from 'vitest';

import type { DraftAction } from './types';

import { DraftController } from './controller';
import { MemoryDraftStorage, type DraftStorage } from './persistence';
import { tinyBase, tinyDefinition } from './testing/tiny-template';

/** A store whose other readers' changes are pushed in through `push`. */
const remoteStorage = () => {
  const memory = new MemoryDraftStorage();
  let onChange: ((actions: readonly unknown[]) => void) | undefined;
  const unsubscribe = vi.fn();
  const save = vi.fn((key: string, template: string, actions: readonly DraftAction[]) =>
    memory.save(key, template, actions),
  );
  const storage: DraftStorage = {
    load: (key, template) => memory.load(key, template),
    save,
    clear: (key) => memory.clear(key),
    subscribe: (_key, _template, listener) => {
      onChange = listener;
      return unsubscribe;
    },
  };
  return { storage, save, unsubscribe, push: (actions: readonly unknown[]) => onChange?.(actions) };
};

const makeController = (storage: DraftStorage, author?: string) =>
  new DraftController({
    definition: tinyDefinition,
    base: tinyBase([
      { id: 'a', name: 'Alpha' },
      { id: 'b', name: 'Beta' },
    ]),
    storage,
    storageKey: 'test',
    ...(author === undefined ? {} : { author }),
  });

const rename = (id: string, name: string, extra: Partial<DraftAction> = {}): DraftAction => ({
  id: `act-${id}-${name}`,
  type: 'SET_NAME',
  target: { type: 'item', id },
  payload: { name },
  createdAt: '2026-10-16T00:00:00.000Z',
  ...extra,
});

describe('remote draft storage', () => {
  it('shows a change another reader made without writing it back', () => {
    const { storage, save, push } = remoteStorage();
    const controller = makeController(storage);
    const listener = vi.fn();
    controller.subscribe(listener);

    push([rename('a', 'From Bob')]);

    expect(controller.actions.map((action) => action.id)).toEqual(['act-a-From Bob']);
    expect(listener).toHaveBeenCalledOnce();
    // Writing a remote snapshot back would echo it to every other reader.
    expect(save).not.toHaveBeenCalled();
  });

  it('ignores a pushed snapshot equal to the current draft', () => {
    const { storage, push } = remoteStorage();
    const controller = makeController(storage);
    controller.dispatch({ type: 'SET_NAME', target: 'a', payload: { name: 'Mine' } });
    const listener = vi.fn();
    controller.subscribe(listener);

    push(controller.actions);

    expect(listener).not.toHaveBeenCalled();
  });

  it('drops invalid actions from a pushed snapshot', () => {
    const { storage, push } = remoteStorage();
    const controller = makeController(storage);

    push([rename('a', 'Valid'), { id: 'x', type: 'SET_NAME' }, rename('a', '', { id: 'empty' })]);

    expect(controller.actions.map((action) => action.id)).toEqual(['act-a-Valid']);
  });

  it('builds on the pushed draft for the next local change', () => {
    const { storage, push } = remoteStorage();
    const controller = makeController(storage);
    push([rename('a', 'From Bob')]);

    controller.dispatch({ type: 'SET_NAME', target: 'b', payload: { name: 'From me' } });

    expect(controller.actions.map((action) => action.target.id)).toEqual(['a', 'b']);
  });

  it('stops listening when disposed', () => {
    const { storage, unsubscribe } = remoteStorage();
    makeController(storage).dispose();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });
});

describe('action author', () => {
  it('stamps the reader on every action they author', () => {
    const controller = makeController(new MemoryDraftStorage(), 'alice@example.com');
    controller.dispatch({ type: 'SET_NAME', target: 'a', payload: { name: 'Renamed' } });
    controller.dispatch({ type: 'comment', target: 'page', payload: { body: 'Looks good' } });
    expect(controller.actions.map((action) => action.author)).toEqual(['alice@example.com', 'alice@example.com']);
  });

  it('keeps the author of an action another reader made', () => {
    const { storage, push } = remoteStorage();
    const controller = makeController(storage, 'alice@example.com');
    push([rename('a', 'From Bob', { author: 'bob@example.com' })]);
    expect(controller.actions[0]?.author).toBe('bob@example.com');
  });

  it('leaves the author out when none is known', () => {
    const controller = makeController(new MemoryDraftStorage());
    controller.dispatch({ type: 'SET_NAME', target: 'a', payload: { name: 'Renamed' } });
    expect(controller.actions[0]).not.toHaveProperty('author');
  });
});
