// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { DraftAction } from './types';

import { MemoryDraftStorage, type DraftStorage } from './persistence';
import '../index';

type PlainElement = HTMLElement & {
  api: { ready: Promise<void> };
  updateComplete: Promise<boolean>;
  dispatch(input: unknown): { ok: boolean };
  derivation: { actions: readonly DraftAction[] };
};

const STORAGE_REQUEST = 'dpk-storage-request';

type StorageRequestDetail = {
  template: string;
  storageKey: string;
  provide(storage: DraftStorage, options?: { author?: string }): void;
};

const mount = async (attributes = ''): Promise<PlainElement> => {
  document.body.innerHTML = `<dpk-template-plain ${attributes}></dpk-template-plain>`;
  const el = document.querySelector('dpk-template-plain') as PlainElement;
  await el.api.ready;
  await el.updateComplete;
  return el;
};

const comment = (body: string) => ({ type: 'comment', target: 'page', payload: { body } });

describe('dpk-storage-request', () => {
  let handler: ((event: Event) => void) | undefined;
  const listen = (fn: (detail: StorageRequestDetail) => void) => {
    handler = (event) => fn((event as CustomEvent<StorageRequestDetail>).detail);
    document.addEventListener(STORAGE_REQUEST, handler);
  };
  afterEach(() => {
    if (handler) document.removeEventListener(STORAGE_REQUEST, handler);
    handler = undefined;
    document.body.innerHTML = '';
  });

  it('asks the page for a draft store and keeps the draft in the one it provides', async () => {
    const storage = new MemoryDraftStorage();
    const requests: StorageRequestDetail[] = [];
    listen((detail) => {
      requests.push(detail);
      detail.provide(storage, { author: 'alice@example.com' });
    });
    const el = await mount('storage-key="shared-board"');

    el.dispatch(comment('hello'));

    expect(requests.map(({ template, storageKey }) => ({ template, storageKey }))).toEqual([
      { template: 'plain', storageKey: 'shared-board' },
    ]);
    expect(storage.load('shared-board', 'plain').map((action) => action.author)).toEqual(['alice@example.com']);
  });

  it('renders a change another reader pushed', async () => {
    let push: ((actions: readonly unknown[]) => void) | undefined;
    const memory = new MemoryDraftStorage();
    listen((detail) =>
      detail.provide({
        load: (key, template) => memory.load(key, template),
        save: (key, template, actions) => memory.save(key, template, actions),
        clear: (key) => memory.clear(key),
        subscribe: (_key, _template, onChange) => {
          push = onChange;
          return () => {};
        },
      }),
    );
    const el = await mount();

    push?.([
      {
        id: 'remote-1',
        ...comment('from bob'),
        target: { type: 'page', id: 'page' },
        createdAt: '2026-10-16T00:00:00Z',
        author: 'bob@example.com',
      },
    ]);
    await el.updateComplete;

    expect(el.derivation.actions.map((action) => action.author)).toEqual(['bob@example.com']);
  });

  it('does not ask when persistence is off', async () => {
    const fn = vi.fn();
    listen(fn);
    await mount('storage="off"');
    expect(fn).not.toHaveBeenCalled();
  });

  it('ignores a provided value that is not a draft store', async () => {
    listen((detail) => detail.provide({ load: 'nope' } as unknown as DraftStorage));
    const el = await mount('storage-key="not-a-store"');
    expect(el.dispatch(comment('still works')).ok).toBe(true);
  });
});
