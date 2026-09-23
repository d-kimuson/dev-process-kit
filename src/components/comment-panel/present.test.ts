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
    expect(presentPanel({ ...inputs, navigation: {} }, ui).target.ref).toBe('artifact:tiny');
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
});
