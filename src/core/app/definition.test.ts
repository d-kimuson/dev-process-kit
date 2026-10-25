import { literal, object, string } from 'valibot';
import { describe, expect, it } from 'vitest';

import type { DraftAction, ViewDefinition } from '../types';

import { DraftController } from '../controller';
import { targetRef } from '../target';
import { appDefinition, type PageSpec } from './definition';
import { appMessages } from './messages';

/** A page content with named items that can be renamed; enough to route through. */
type Items = Readonly<Record<string, string>>;
const itemsDefinition = (name: string): ViewDefinition<Items> => ({
  kind: 'view',
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

const setup = (pages: PageSpec[], bases: Record<string, unknown>) => {
  const live = { pages, bases };
  const definition = appDefinition({
    pages: () => live.pages,
    base: () => ({
      layout: live.pages.map((page) => ({
        id: page.id,
        kind: page.definition.kind,
        content: page.definition.name,
        label: page.label,
      })),
      pages: live.bases,
    }),
    catalog: () => [itemsDefinition('usm'), itemsDefinition('event-storming')],
    messages: appMessages('en'),
  });
  return { live, definition };
};

const rename = (target: string, name: string) => ({ type: 'rename', target, payload: { name } });

describe('app definition', () => {
  const scope: PageSpec = { id: 'scope', label: 'Scope', definition: itemsDefinition('usm') };
  const domain: PageSpec = { id: 'domain', label: 'Domain', definition: itemsDefinition('event-storming') };

  it("applies each action to its own page's slice", () => {
    const { definition } = setup([scope, domain], { scope: { pay: 'Pay' }, domain: { pay: 'Paid' } });
    const controller = new DraftController({
      definition,
      base: definition.parseBase({ title: 'Checkout' }),
      storage: null,
    });
    expect(controller.dispatch(rename('item:pay@domain', 'Payment received')).ok).toBe(true);
    expect(controller.derivation.state.pages).toEqual({ scope: { pay: 'Pay' }, domain: { pay: 'Payment received' } });
    expect(controller.derivation.state.title).toBe('Checkout');
  });

  it('dedupes adjacent patches per page, never across pages', () => {
    const { definition } = setup([scope, domain], { scope: { pay: 'Pay' }, domain: { pay: 'Paid' } });
    const controller = new DraftController({ definition, base: definition.parseBase({}), storage: null });
    // Same entity id, different pages: never dedupes against each other.
    controller.dispatch(rename('item:pay@scope', 'A'));
    controller.dispatch(rename('item:pay@domain', 'B'));
    expect(controller.actions.map((action) => [action.target.id, action.payload])).toEqual([
      ['pay@scope', { name: 'A' }],
      ['pay@domain', { name: 'B' }],
    ]);
    // Same page, but another page's action sits between: not adjacent, so both stay.
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

  it('accepts a comment from one page on another, and on the app as a whole', () => {
    const { definition } = setup([scope, domain], { scope: { pay: 'Pay' }, domain: { paid: 'Paid' } });
    const controller = new DraftController({ definition, base: definition.parseBase({}), storage: null });
    expect(controller.dispatch({ type: 'comment', target: 'item:pay@scope', payload: { body: 'x' } }).ok).toBe(true);
    expect(controller.dispatch({ type: 'comment', target: 'app:app', payload: { body: 'y' } }).ok).toBe(true);
    expect(controller.derivation.stale).toEqual([]);
    expect(definition.describe(controller.actions[0] as DraftAction, controller.derivation.state).targetLabel).toBe(
      'Scope › Pay',
    );
  });

  it('keeps the actions of a page that left the app, as stale', () => {
    const { definition } = setup([scope, domain], { scope: { pay: 'Pay' }, domain: { paid: 'Paid' } });
    const stored = new DraftController({ definition, base: definition.parseBase({}), storage: null });
    stored.dispatch(rename('item:paid@domain', 'Paid!'));
    stored.dispatch({ type: 'comment', target: 'item:paid@domain', payload: { body: 'why' } });
    stored.dispatch({ type: 'comment', target: 'page:items@domain', payload: { body: 'the whole page' } });
    stored.dispatch({ type: 'comment', target: 'app:app', payload: { body: 'the whole document' } });

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
    expect(restored.derivation.comments.map((action) => targetRef(action.target))).toEqual(['app:app']);
  });

  it('drops a stored action its page’s content no longer has', () => {
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

  it('namespaces every page in the hash and picks the first page by default', () => {
    const { definition } = setup([scope, domain], { scope: { pay: 'Pay' }, domain: { paid: 'Paid' } });
    const state = definition.parseBase({});
    expect(definition.resolveNavigation(state, {})).toEqual({
      page: 'scope',
      'scope.item': 'pay',
      'domain.item': 'paid',
    });
    expect(definition.navigationFor?.(state, { type: 'item', id: 'paid@domain' })).toEqual({
      page: 'domain',
      'domain.item': 'paid',
    });
  });

  it('offers every page’s targets to the composer, qualified', () => {
    const { definition } = setup([scope, domain], { scope: { pay: 'Pay' }, domain: { paid: 'Paid' } });
    const values = definition.commentTargets(definition.parseBase({}), {}).map((option) => option.value);
    expect(values).toEqual(['app:app', 'item:pay@scope', 'item:paid@domain']);
  });

  it('adds a page of a content it knows, as a change of the draft', () => {
    const { definition } = setup([scope], { scope: { pay: 'Pay' } });
    const controller = new DraftController({ definition, base: definition.parseBase({}), storage: null });
    const add = {
      type: 'ADD_PAGE',
      target: 'app:app',
      payload: { page: 'domain', kind: 'view', content: 'event-storming', label: 'Domain' },
    };
    expect(controller.dispatch(add).ok).toBe(true);
    expect(controller.derivation.state.layout.map((page) => page.id)).toEqual(['scope', 'domain']);
    expect(controller.derivation.state.pages['domain']).toEqual({});
    expect(definition.describe(controller.actions[0] as DraftAction, controller.derivation.state)).toMatchObject({
      title: 'Page added',
      targetLabel: 'Domain (event-storming)',
    });
    // The same page twice, or a content the app does not know, cannot apply.
    controller.dispatch(add);
    controller.dispatch({
      ...add,
      payload: { page: 'other', kind: 'view', content: 'slides', label: 'Slides' },
    });
    expect(controller.derivation.stale.map((entry) => entry.reason)).toEqual([
      'constraint-violated',
      'constraint-violated',
    ]);
  });

  it('removes a page, and what the draft asked of it turns stale', () => {
    const { definition } = setup([scope, domain], { scope: { pay: 'Pay' }, domain: { paid: 'Paid' } });
    const controller = new DraftController({ definition, base: definition.parseBase({}), storage: null });
    controller.dispatch({ type: 'comment', target: 'item:paid@domain', payload: { body: 'why' } });
    expect(controller.dispatch({ type: 'REMOVE_PAGE', target: 'app:app', payload: { page: 'domain' } }).ok).toBe(true);
    expect(controller.derivation.state.layout.map((page) => page.id)).toEqual(['scope']);
    expect(controller.derivation.stale.map((entry) => targetRef(entry.action.target))).toEqual(['item:paid@domain']);
    expect(definition.resolveNavigation(controller.derivation.state, { page: 'domain' })).toMatchObject({
      page: 'scope',
    });
  });
});
