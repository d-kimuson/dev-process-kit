import { describe, expect, it } from 'vitest';

import { ACTION_WRITER_KEY } from './action-id';
import { EMPTY_ADDRESSED, parseAddressed, type AddressedSet } from './addressed';
import { DraftController } from './controller';
import { hostOn, MemoryStorageLike, MemorySyncHub, settle } from './sync/testing';
import { tinyBase, tinyDefinition } from './testing/tiny-template';

const alice = { id: 'alice', name: 'Alice' };
const bob = { id: 'bob', name: 'Bob' };

const reader = (hub: MemorySyncHub, self = alice, storage = new MemoryStorageLike()) =>
  new DraftController({
    definition: tinyDefinition,
    base: tinyBase([
      { id: 'a', name: 'Alpha' },
      { id: 'b', name: 'Beta' },
    ]),
    sync: hostOn(hub, self, storage),
  });

const rename = (controller: DraftController<unknown>, target: string, name: string) =>
  controller.dispatch({ type: 'SET_NAME', target, payload: { name } });
const comment = (controller: DraftController<unknown>, body: string) =>
  controller.dispatch({ type: 'comment', target: 'page', payload: { body } });
const names = (controller: DraftController<{ items: readonly { name: string }[] }>) =>
  controller.derivation.state.items.map((item) => item.name);

describe('DraftController shared through a host', () => {
  it('shows the other reader changes with their author', async () => {
    const hub = new MemorySyncHub();
    const a = reader(hub, alice);
    const b = reader(hub, bob);
    await settle();
    const posted = comment(a, 'Looks good');
    await settle();

    expect(b.actions.map((action) => action.id)).toEqual([posted.ok ? posted.id : '']);
    expect(b.authorOf(b.actions[0]?.id ?? '')).toEqual(alice);
    expect(b.isOwnAction(b.actions[0]?.id ?? '')).toBe(false);
  });

  it('names the reader as the author of their own unsent action', async () => {
    const hub = new MemorySyncHub();
    hub.online = false;
    const a = reader(hub, alice);
    const posted = comment(a, 'Offline');

    expect(a.authorOf(posted.ok ? posted.id : '')).toEqual(alice);
  });

  it('says it is connecting until the host answers, then synced', async () => {
    const hub = new MemorySyncHub();
    const a = reader(hub);
    expect(a.sync?.status).toBe('connecting');
    await settle();
    expect(a.sync?.status).toBe('synced');
    comment(a, 'x');
    expect(a.sync).toMatchObject({ status: 'pending', unsent: 1 });
    await settle();
    expect(a.sync).toMatchObject({ status: 'synced', unsent: 0 });
  });

  it('undoes only the reader own actions', async () => {
    const hub = new MemorySyncHub();
    const a = reader(hub, alice);
    const b = reader(hub, bob);
    await settle();
    rename(a, 'a', 'Mine');
    await settle();
    comment(b, 'Theirs');
    await settle();

    expect(a.undo()).toBe(true);
    expect(a.undo()).toBe(false);
    await settle();
    expect(hub.actions.map((action) => action.author?.id)).toEqual(['bob']);
    expect(names(b)).toEqual(['Alpha', 'Beta']);
  });

  it('redoes with a new id the host has not seen', async () => {
    const hub = new MemorySyncHub();
    const a = reader(hub);
    await settle();
    rename(a, 'a', 'Mine');
    await settle();
    a.undo();
    await settle();
    expect(a.redo()).toBe(true);
    await settle();

    expect(names(a)).toEqual(['Mine', 'Beta']);
    expect(hub.actions).toHaveLength(1);
  });

  it('folds an edit only into the reader own unsent one', async () => {
    const hub = new MemorySyncHub();
    hub.online = false;
    const a = reader(hub);
    await settle();
    rename(a, 'a', 'One');
    rename(a, 'a', 'Two');
    expect(a.actions).toHaveLength(1);
    hub.online = true;
    a.dispatch({ type: 'SET_NAME', target: 'b', payload: { name: 'Bee' } });
    await settle();
    // Once it reached the host, an edit is a new entry: someone may have seen it.
    rename(a, 'a', 'Three');
    await settle();

    expect(hub.actions.map((action) => action.payload)).toEqual([{ name: 'Two' }, { name: 'Bee' }, { name: 'Three' }]);
  });

  it('puts back the base value over a sent edit, the reader own or another one', async () => {
    const hub = new MemorySyncHub();
    const a = reader(hub, alice);
    const b = reader(hub, bob);
    await settle();
    rename(a, 'a', 'Mine');
    await settle();
    rename(a, 'a', 'Alpha');
    await settle();
    expect(names(b)).toEqual(['Alpha', 'Beta']);

    rename(b, 'b', 'Theirs');
    await settle();
    rename(a, 'b', 'Beta');
    await settle();
    expect(names(a)).toEqual(['Alpha', 'Beta']);
    expect(names(b)).toEqual(['Alpha', 'Beta']);
  });

  it('tells its subscribers nothing when an update changes nothing', async () => {
    const hub = new MemorySyncHub();
    const a = reader(hub, alice);
    const b = reader(hub, bob);
    await settle();
    comment(a, 'x');
    await settle();
    let told = 0;
    b.subscribe(() => (told += 1));
    const actions = b.actions;
    hub.resend();
    await settle();

    expect(b.actions).toBe(actions);
    expect(told).toBe(0);
  });

  it('opens sharing again after it was closed, and sends what waited meanwhile', async () => {
    const hub = new MemorySyncHub();
    const a = reader(hub, alice);
    const b = reader(hub, bob);
    await settle();
    a.close();
    comment(a, 'While closed');
    comment(b, 'Theirs');
    await settle();
    expect(hub.actions).toHaveLength(1);

    a.reopen();
    await settle();
    expect(hub.actions).toHaveLength(2);
    expect(a.actions).toEqual(b.actions);
    expect(a.sync).toMatchObject({ status: 'synced', unsent: 0 });
  });

  it('sends what waited offline once, across a reload', async () => {
    const hub = new MemorySyncHub();
    const storage = new MemoryStorageLike();
    hub.online = false;
    const before = reader(hub, alice, storage);
    await settle();
    comment(before, 'Written offline');
    await settle();
    expect(before.sync?.status).toBe('offline');
    before.close();

    hub.online = true;
    const after = reader(hub, alice, storage);
    expect(after.actions).toHaveLength(1);
    await settle();

    expect(hub.actions).toHaveLength(1);
    expect(after.actions).toHaveLength(1);
    expect(after.sync).toMatchObject({ status: 'synced', unsent: 0 });
  });

  it('clears what the reader saw, and keeps what others added while they were asked', async () => {
    const hub = new MemorySyncHub();
    const a = reader(hub, alice);
    const b = reader(hub, bob);
    await settle();
    comment(a, 'Mine');
    comment(b, 'Theirs');
    await settle();

    const clear = a.prepareClear();
    const late = comment(b, 'While asked');
    await settle();
    clear();
    await settle();

    expect(hub.actions.map((action) => action.id)).toEqual([late.ok ? late.id : '']);
    expect(a.actions).toEqual(b.actions);
  });

  it('drops an unsent edit quietly once another reader deleted its target', async () => {
    const hub = new MemorySyncHub();
    const a = reader(hub, alice);
    const b = reader(hub, bob);
    await settle();
    hub.online = false;
    rename(a, 'b', 'Renamed');
    hub.online = true;
    b.dispatch({ type: 'DELETE_ITEM', target: 'b', payload: {} });
    await settle();

    expect(a.actions.map((action) => action.type)).toEqual(['DELETE_ITEM']);
    expect(a.sync?.unsent).toBe(0);
  });

  it('edits only the reader own comment, as a new entry', async () => {
    const hub = new MemorySyncHub();
    const a = reader(hub, alice);
    const b = reader(hub, bob);
    await settle();
    const posted = comment(a, 'First');
    await settle();
    const id = posted.ok ? posted.id : '';

    expect(b.editComment(id, 'Hijacked').ok).toBe(false);
    const edited = a.editComment(id, 'Second');
    await settle();
    expect(edited.ok && edited.id !== id).toBe(true);
    expect(b.actions.map((action) => action.payload)).toEqual([{ body: 'Second' }]);
  });

  describe('what the change log says was handled', () => {
    const handled = (text: string): AddressedSet => {
      const set = parseAddressed(text);
      if (typeof set === 'string') throw new Error(set);
      return set;
    };
    const commentAs = (controller: DraftController<unknown>, id: string, body: string) =>
      controller.dispatch({ id, type: 'comment', target: 'page', payload: { body } });

    it("takes every reader's handled actions back from the host", async () => {
      const hub = new MemorySyncHub();
      const a = reader(hub, alice);
      const b = reader(hub, bob);
      await settle();
      commentAs(a, 'wa:1', 'one');
      commentAs(a, 'wa:2', 'two');
      commentAs(b, 'wb:1', 'three');
      commentAs(b, 'wb:2', 'kept');
      await settle();

      b.setAddressed(handled('wa:1-2,wb:1'));
      await settle();

      expect(hub.actions.map((action) => action.id)).toEqual(['wb:2']);
      expect(a.actions.map((action) => action.id)).toEqual(['wb:2']);
      expect(b.actions.map((action) => action.id)).toEqual(['wb:2']);
    });

    it('drops a handled action that reaches the host afterwards', async () => {
      const hub = new MemorySyncHub();
      const a = reader(hub, alice);
      const b = reader(hub, bob);
      await settle();
      a.setAddressed(handled('wb:1-3'));
      commentAs(b, 'wb:2', 'late');
      await settle();
      await settle();

      expect(hub.actions).toEqual([]);
      expect(a.actions).toEqual([]);
    });

    it('drops the reader own unsent handled action', () => {
      const hub = new MemorySyncHub();
      hub.online = false;
      const a = reader(hub, alice);
      commentAs(a, 'wa:1', 'offline');
      a.setAddressed(handled('wa:1'));

      expect(a.actions).toEqual([]);
    });

    it('changes nothing for an empty set', async () => {
      const hub = new MemorySyncHub();
      const a = reader(hub, alice);
      await settle();
      commentAs(a, 'wa:1', 'one');
      await settle();
      a.setAddressed(EMPTY_ADDRESSED);
      await settle();
      expect(hub.actions).toHaveLength(1);
    });
  });

  it('keeps the draft away from storage', async () => {
    const hub = new MemorySyncHub();
    const a = reader(hub);
    await settle();
    comment(a, 'x');

    expect(a.prunedCount).toBe(0);
    // Only the browser's writer, which numbers the actions.
    expect(Object.keys(localStorage)).toEqual([ACTION_WRITER_KEY]);
  });
});
