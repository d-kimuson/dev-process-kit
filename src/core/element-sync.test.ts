import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { DpkViewPlain } from '../views/plain/element';

import { DpkBoardKanban } from '../boards/kanban/element';
import { COMMENT_ACTION } from './action';
import { coreMessages } from './messages';
import { serveDraftSync } from './sync/serve';
import { MemoryStorageLike, MemorySyncHub, settle as settleHub } from './sync/testing';
import '../index';

const messages = coreMessages('en');
const alice = { id: 'alice', name: 'Alice' };
const bob = { id: 'bob', name: 'Bob' };

const PLAIN = `
  <dpk-view-plain storage-key="shared" lang="en">
    <script type="application/json">${JSON.stringify({ title: 'Cancel orders' })}</script>
    <section slot="main"><p>Body</p></section>
  </dpk-view-plain>`;

const APP = `
  <dpk-app storage-key="shared" lang="en">
    <script type="application/json">{"title":"Doc"}</script>
    <dpk-page name="first" label="First"><dpk-view-plain><script type="application/json">{"title":"First"}</script></dpk-view-plain></dpk-page>
    <dpk-page name="second" label="Second"><dpk-view-plain><script type="application/json">{"title":"Second"}</script></dpk-view-plain></dpk-page>
  </dpk-app>`;

/** One reader's page: the markup, inside the node their host listens on. */
const readerOn = (hub: MemorySyncHub | null, self = alice, markup = PLAIN, tag = 'dpk-view-plain'): DpkViewPlain => {
  const frame = document.createElement('div');
  frame.innerHTML = markup;
  if (hub !== null) {
    serveDraftSync({
      self,
      transport: () => hub.transport(self),
      target: frame,
      storage: new MemoryStorageLike(),
      retry: { baseMs: 1, maxMs: 1 },
      wake: () => () => {},
    });
  }
  document.body.append(frame);
  const element = frame.querySelector(tag);
  if (!(element instanceof HTMLElement)) throw new Error('element did not upgrade');
  return element as DpkViewPlain;
};

const settle = async (...elements: DpkViewPlain[]): Promise<void> => {
  await settleHub();
  for (const element of elements) {
    await element.api.ready;
    await element.updateComplete;
  }
};

const root = (element: DpkViewPlain): ShadowRoot => {
  if (!element.shadowRoot) throw new Error('no shadow root');
  return element.shadowRoot;
};

const status = (element: DpkViewPlain): string | undefined =>
  root(element).querySelector('.dpk-sync-status')?.textContent?.trim();

const comment = (element: DpkViewPlain, body: string) =>
  element.api.dispatch({ type: COMMENT_ACTION, target: 'page:plain', payload: { body } });

const panel = (element: DpkViewPlain): ShadowRoot => {
  element.notesOpen = true;
  const found = root(element).querySelector('dpk-comment-panel');
  if (found === null || found.shadowRoot === null) throw new Error('no review panel');
  return found.shadowRoot;
};

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  document.body.replaceChildren();
});

describe('a view whose draft a host shares', () => {
  it('keeps the draft in localStorage, without a status, when no host answers', async () => {
    const element = readerOn(null);
    await settle(element);
    comment(element, 'Local');

    expect(localStorage.length).toBeGreaterThan(0);
    expect(status(element)).toBeUndefined();
  });

  it('shows the other reader comment under their name', async () => {
    const hub = new MemorySyncHub();
    const a = readerOn(hub, alice);
    const b = readerOn(hub, bob);
    await settle(a, b);
    comment(a, 'From Alice');
    await settle(a, b);
    b.notesOpen = true;
    await settle(b);

    expect(b.api.actions).toHaveLength(1);
    expect(panel(b).querySelector('.item-author')?.textContent).toBe('Alice');
    expect(panel(b).querySelector('.item-edit')).toBeNull();
    expect(Object.keys(localStorage).filter((key) => key.includes(':draft:'))).toEqual([]);
  });

  it('shares an app: its pages ask nothing, the app asks for all of them', async () => {
    const hub = new MemorySyncHub();
    const asked: unknown[] = [];
    const record = (event: Event): void => {
      asked.push(event.target);
    };
    document.addEventListener('dpk-sync-request', record);
    const a = readerOn(hub, alice, APP, 'dpk-app');
    const b = readerOn(hub, bob, APP, 'dpk-app');
    await settle(a, b);
    const second = (element: HTMLElement) => element.querySelector<DpkViewPlain>('dpk-page[name="second"] > *');
    second(a)?.api.comment('page:plain', 'On the second page');
    await settle(a, b);

    document.removeEventListener('dpk-sync-request', record);
    expect(asked).toEqual([a, b]);
    expect(b.api.actions.map((action) => [action.target, b.controller.authorOf(action.id)?.name])).toEqual([
      [{ type: 'page', id: 'plain@second' }, 'Alice'],
    ]);
    expect(second(b)?.api.actions).toHaveLength(1);
  });

  it('says where sharing stands in the header', async () => {
    const hub = new MemorySyncHub();
    hub.online = false;
    const element = readerOn(hub);
    await element.updateComplete;
    expect(status(element)).toBe(messages.syncConnecting);
    await settle(element);
    comment(element, 'Waiting');
    await settle(element);
    expect(status(element)).toBe(messages.syncOffline);
    hub.online = true;
    await settle(element);
    await settle(element);
    expect(status(element)).toBe(messages.syncSynced);
  });

  it('warns before clearing, and clears only once the reader agrees', async () => {
    const hub = new MemorySyncHub();
    const a = readerOn(hub, alice);
    const b = readerOn(hub, bob);
    await settle(a, b);
    comment(b, 'From Bob');
    await settle(a, b);
    a.notesOpen = true;
    await settle(a);

    [...panel(a).querySelectorAll('button')].find((button) => button.textContent?.trim() === 'Clear all')?.click();
    await settle(a);
    const dialog = root(a).querySelector('dialog.dpk-confirm-dialog');
    expect(dialog?.textContent).toContain(messages.clearSharedBody);
    comment(b, 'While asked');
    await settle(a, b);
    dialog?.querySelector<HTMLButtonElement>('button[value="confirm"]')?.click();
    await settle(a, b);

    expect(b.api.actions.map((action) => action.payload)).toEqual([{ body: 'While asked' }]);
  });

  it('stops sharing once removed, keeps it through a move, and shares again when put back', async () => {
    const hub = new MemorySyncHub();
    const a = readerOn(hub, alice);
    const b = readerOn(hub, bob);
    await settle(a, b);
    expect(hub.listening).toBe(2);

    const frame = a.parentElement;
    frame?.append(a);
    await settle(a, b);
    expect(hub.listening).toBe(2);

    a.remove();
    await settle(b);
    expect(hub.listening).toBe(1);
    comment(a, 'While away');
    await settle(b);
    expect(b.api.actions).toEqual([]);

    frame?.append(a);
    await settle(a, b);
    expect(hub.listening).toBe(2);
    expect(b.api.actions.map((action) => action.payload)).toEqual([{ body: 'While away' }]);
  });

  it('shares a board used on its own for as long as it is on the page', async () => {
    const hub = new MemorySyncHub();
    const frame = document.createElement('div');
    frame.innerHTML = '<dpk-board-kanban><script type="application/json">{"columns":[]}</script></dpk-board-kanban>';
    serveDraftSync({ self: alice, transport: () => hub.transport(alice), target: frame, storage: null });
    document.body.append(frame);
    const board = frame.querySelector('dpk-board-kanban');
    if (!(board instanceof DpkBoardKanban)) throw new Error('board did not upgrade');
    expect(board.controller.sync).not.toBeNull();
    await settleHub();
    expect(hub.listening).toBe(1);

    board.remove();
    await settleHub();
    expect(hub.listening).toBe(0);
    frame.append(board);
    await settleHub();
    expect(hub.listening).toBe(1);
  });
});
