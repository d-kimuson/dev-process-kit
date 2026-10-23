import { literal, object, string } from 'valibot';
import { describe, expect, it } from 'vitest';

import type { DraftAction, TemplateDefinition } from '../types';

import { DraftController } from '../controller';
import { targetRef } from '../target';
import { pageDefinition, type BoardSpec } from './definition';
import { pageMessages } from './messages';

/** A board with named items that can be renamed; enough to route through. */
type Items = Readonly<Record<string, string>>;
const itemsDefinition = (name: string): TemplateDefinition<Items> => ({
  name,
  label: name,
  parseBase: (input) => input as Items,
  emptyBase: () => ({}),
  actions: {
    rename: {
      schema: object({
        id: string(),
        type: literal('rename'),
        target: object({ type: literal('item'), id: string() }),
        payload: object({ name: string() }),
        createdAt: string(),
      }),
      mode: 'patch',
      targetType: 'item',
    },
  },
  apply: (state, action) => {
    if (!Object.hasOwn(state, action.target.id)) return null;
    const payload = action.payload as { name: string };
    return { ...state, [action.target.id]: payload.name };
  },
  hasTarget: (state, target) => target.type === 'item' && Object.hasOwn(state, target.id),
  describe: (action, state) => ({ title: action.type, targetLabel: state[action.target.id] ?? '?', tone: 'update' }),
  serialize: (action) => `${action.type} ${action.target.id}`,
  resolveNavigation: (state, navigation) => ({ item: navigation['item'] ?? Object.keys(state)[0] ?? '' }),
  navigationFor: (_state, target) => ({ item: target.id }),
  commentTargets: (state) => Object.keys(state).map((id) => ({ value: `item:${id}`, label: state[id] ?? id })),
  title: () => name,
});

const setup = (boards: BoardSpec[], bases: Record<string, unknown>) => {
  const live = { boards, bases };
  const definition = pageDefinition({
    boards: () => live.boards,
    base: () => ({
      layout: live.boards.map((board) => ({ id: board.id, template: board.definition.name, label: board.label })),
      boards: live.bases,
    }),
    catalog: () => [itemsDefinition('usm'), itemsDefinition('event-storming')],
    messages: pageMessages('en'),
  });
  return { live, definition };
};

const rename = (target: string, name: string) => ({ type: 'rename', target, payload: { name } });

describe('page definition', () => {
  const scope: BoardSpec = { id: 'scope', label: 'Scope', definition: itemsDefinition('usm') };
  const domain: BoardSpec = { id: 'domain', label: 'Domain', definition: itemsDefinition('event-storming') };

  it("applies each action to its own board's slice", () => {
    const { definition } = setup([scope, domain], { scope: { pay: 'Pay' }, domain: { pay: 'Paid' } });
    const controller = new DraftController({
      definition,
      base: definition.parseBase({ title: 'Checkout' }),
      storage: null,
    });
    expect(controller.dispatch(rename('item:pay@domain', 'Payment received')).ok).toBe(true);
    expect(controller.derivation.state.boards).toEqual({ scope: { pay: 'Pay' }, domain: { pay: 'Payment received' } });
    expect(controller.derivation.state.title).toBe('Checkout');
  });

  it('dedupes adjacent patches per board, never across boards', () => {
    const { definition } = setup([scope, domain], { scope: { pay: 'Pay' }, domain: { pay: 'Paid' } });
    const controller = new DraftController({ definition, base: definition.parseBase({}), storage: null });
    // Same entity id, different boards: never dedupes against each other.
    controller.dispatch(rename('item:pay@scope', 'A'));
    controller.dispatch(rename('item:pay@domain', 'B'));
    expect(controller.actions.map((action) => [action.target.id, action.payload])).toEqual([
      ['pay@scope', { name: 'A' }],
      ['pay@domain', { name: 'B' }],
    ]);
    // Same board, but another board's action sits between: not adjacent, so both stay.
    controller.dispatch(rename('item:pay@scope', 'C'));
    expect(controller.actions.map((action) => [action.target.id, action.payload])).toEqual([
      ['pay@scope', { name: 'A' }],
      ['pay@domain', { name: 'B' }],
      ['pay@scope', { name: 'C' }],
    ]);
    // Now adjacent to its own last entry: dedupes in place, the log stays a plain log otherwise.
    controller.dispatch(rename('item:pay@scope', 'D'));
    expect(controller.actions.map((action) => [action.target.id, action.payload])).toEqual([
      ['pay@scope', { name: 'A' }],
      ['pay@domain', { name: 'B' }],
      ['pay@scope', { name: 'D' }],
    ]);
  });

  it('accepts a comment from one board on another, and on the page as a whole', () => {
    const { definition } = setup([scope, domain], { scope: { pay: 'Pay' }, domain: { paid: 'Paid' } });
    const controller = new DraftController({ definition, base: definition.parseBase({}), storage: null });
    expect(controller.dispatch({ type: 'comment', target: 'item:pay@scope', payload: { body: 'x' } }).ok).toBe(true);
    expect(controller.dispatch({ type: 'comment', target: 'page:page', payload: { body: 'y' } }).ok).toBe(true);
    expect(controller.derivation.stale).toEqual([]);
    expect(definition.describe(controller.actions[0] as DraftAction, controller.derivation.state).targetLabel).toBe(
      'Scope › Pay',
    );
  });

  it('keeps the actions of a board that left the page, as stale', () => {
    const { definition } = setup([scope, domain], { scope: { pay: 'Pay' }, domain: { paid: 'Paid' } });
    const stored = new DraftController({ definition, base: definition.parseBase({}), storage: null });
    stored.dispatch(rename('item:paid@domain', 'Paid!'));
    stored.dispatch({ type: 'comment', target: 'item:paid@domain', payload: { body: 'why' } });
    stored.dispatch({ type: 'comment', target: 'page:items@domain', payload: { body: 'the whole board' } });
    stored.dispatch({ type: 'comment', target: 'page:page', payload: { body: 'the whole page' } });

    const after = setup([scope], { scope: { pay: 'Pay' } }).definition;
    const restored = new DraftController({
      definition: after,
      base: after.parseBase({}),
      storage: null,
      initialActions: stored.actions,
    });
    expect(restored.actions).toHaveLength(4);
    expect(restored.derivation.stale.map((entry) => targetRef(entry.action.target))).toEqual([
      'item:paid@domain',
      'item:paid@domain',
      'page:items@domain',
    ]);
    expect(restored.derivation.comments.map((action) => targetRef(action.target))).toEqual(['page:page']);
  });

  it('drops a stored action its board’s template no longer has', () => {
    const { definition } = setup([scope], { scope: { pay: 'Pay' } });
    const restored = new DraftController({
      definition,
      base: definition.parseBase({}),
      storage: null,
      initialActions: [
        { id: 'a', type: 'add-event', target: { type: 'item', id: 'pay@scope' }, payload: {}, createdAt: 'now' },
      ],
    });
    expect(restored.actions).toEqual([]);
  });

  it('namespaces every board in the hash and picks the first board by default', () => {
    const { definition } = setup([scope, domain], { scope: { pay: 'Pay' }, domain: { paid: 'Paid' } });
    const state = definition.parseBase({});
    expect(definition.resolveNavigation(state, {})).toEqual({
      board: 'scope',
      'scope.item': 'pay',
      'domain.item': 'paid',
    });
    expect(definition.navigationFor?.(state, { type: 'item', id: 'paid@domain' })).toEqual({
      board: 'domain',
      'domain.item': 'paid',
    });
  });

  it('offers every board’s targets to the composer, qualified', () => {
    const { definition } = setup([scope, domain], { scope: { pay: 'Pay' }, domain: { paid: 'Paid' } });
    const values = definition.commentTargets(definition.parseBase({}), {}).map((option) => option.value);
    expect(values).toEqual(['page:page', 'item:pay@scope', 'item:paid@domain']);
  });

  it('adds a board of a template it knows, as a change of the draft', () => {
    const { definition } = setup([scope], { scope: { pay: 'Pay' } });
    const controller = new DraftController({ definition, base: definition.parseBase({}), storage: null });
    const add = {
      type: 'ADD_BOARD',
      target: 'page:page',
      payload: { board: 'domain', template: 'event-storming', label: 'Domain' },
    };
    expect(controller.dispatch(add).ok).toBe(true);
    expect(controller.derivation.state.layout.map((board) => board.id)).toEqual(['scope', 'domain']);
    expect(controller.derivation.state.boards['domain']).toEqual({});
    expect(definition.describe(controller.actions[0] as DraftAction, controller.derivation.state)).toMatchObject({
      title: 'Board added',
      targetLabel: 'Domain (event-storming)',
    });
    // The same board twice, or a template the page does not know, cannot apply.
    controller.dispatch(add);
    controller.dispatch({ ...add, payload: { board: 'other', template: 'slides', label: 'Slides' } });
    expect(controller.derivation.stale.map((entry) => entry.reason)).toEqual([
      'constraint-violated',
      'constraint-violated',
    ]);
  });

  it('removes a board, and what the draft asked of it turns stale', () => {
    const { definition } = setup([scope, domain], { scope: { pay: 'Pay' }, domain: { paid: 'Paid' } });
    const controller = new DraftController({ definition, base: definition.parseBase({}), storage: null });
    controller.dispatch({ type: 'comment', target: 'item:paid@domain', payload: { body: 'why' } });
    expect(controller.dispatch({ type: 'REMOVE_BOARD', target: 'page:page', payload: { board: 'domain' } }).ok).toBe(
      true,
    );
    expect(controller.derivation.state.layout.map((board) => board.id)).toEqual(['scope']);
    expect(controller.derivation.stale.map((entry) => targetRef(entry.action.target))).toEqual(['item:paid@domain']);
    expect(definition.resolveNavigation(controller.derivation.state, { board: 'domain' })).toMatchObject({
      board: 'scope',
    });
  });
});
