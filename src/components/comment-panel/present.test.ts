// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { derive } from '../../core/derive';
import { tinyBase, tinyDefinition } from '../../core/testing/tiny-template';
import { initialPanelState, reducePanel } from './model';
import { presentPanel } from './present';

const base = tinyBase([{ id: 'a', name: 'Alpha' }]);
const definition = {
  ...tinyDefinition,
  currentTarget: (_state: typeof base, nav: Readonly<Record<string, string>>) =>
    nav['item'] ? { value: `item:${nav['item']}`, label: nav['item'], group: 'Item' } : null,
};
const inputs = {
  definition,
  state: base,
  navigation: { item: 'a' },
  derivation: derive(definition, base, []),
  issues: [],
};

describe('panel presentation', () => {
  it('derives targets from navigation instead of storing a second copy', () => {
    const ui = reducePanel(initialPanelState(), { kind: 'attach', current: true });
    expect(presentPanel(inputs, ui).target.ref).toBe('item:a');
    expect(presentPanel({ ...inputs, navigation: { item: 'b' } }, ui).target.ref).toBe('item:b');
    expect(presentPanel({ ...inputs, navigation: {} }, ui).target.ref).toBe('page:tiny');
  });
  it('keeps explicit targets stable and derives their label', () => {
    const ui = reducePanel(initialPanelState(), { kind: 'target-requested', ref: 'item:a' });
    expect(presentPanel({ ...inputs, navigation: { item: 'b' } }, ui).target).toEqual({
      ref: 'item:a',
      label: 'Item · Alpha',
    });
  });
  it('supplies pre-draft state to descriptions and formats stale items without the view knowing the domain', () => {
    const actions = [
      {
        id: 'rename',
        type: 'SET_NAME',
        target: { type: 'item', id: 'ghost' },
        payload: { name: 'New' },
        createdAt: 'now',
      },
    ];
    const d = derive(definition, base, actions);
    const vm = presentPanel(
      {
        ...inputs,
        derivation: d,
        definition: {
          ...definition,
          describe: (_action, _state, origin) => ({
            title: origin?.items[0]?.name ?? '',
            targetLabel: 'Ghost',
            tone: 'update',
          }),
        },
      },
      initialPanelState(),
    );
    expect(vm.items[0]).toMatchObject({ title: 'Alpha', stale: 'target-missing' });
  });
  it('offers the send to Claude only when the host provides it and there is something to send', () => {
    const actions = [
      { id: 'c', type: 'comment', target: { type: 'page', id: 'tiny' }, payload: { body: 'hi' }, createdAt: 'now' },
    ];
    const withDraft = { ...inputs, derivation: derive(definition, base, actions) };
    expect(presentPanel(inputs, initialPanelState()).send).toBe('hidden');
    expect(presentPanel({ ...inputs, sendable: true }, initialPanelState()).send).toBe('disabled');
    expect(presentPanel({ ...withDraft, sendable: true }, initialPanelState()).send).toBe('ready');
    const pending = reducePanel(initialPanelState(), { kind: 'send-started' });
    expect(presentPanel({ ...withDraft, sendable: true }, pending).send).toBe('disabled');
  });
  it('explains a failed send in the flash', () => {
    const ui = reducePanel(reducePanel(initialPanelState(), { kind: 'send-started' }), {
      kind: 'send-finished',
      request: 1,
      outcome: { ok: false, reason: 'too_large' },
    });
    expect(presentPanel(inputs, ui).flash).toMatch(/コピー/);
  });
});
