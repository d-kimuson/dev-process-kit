import * as v from 'valibot';

import type { ActionTarget, Navigation, TemplateDefinition } from '../types';

import { defineAction, entityDedupeKey, payloadFor, type ActionSpecs } from '../schema';

export type TinyItem = {
  readonly id: string;
  readonly name: string;
  readonly order?: number;
};

export type TinyState = {
  readonly items: readonly TinyItem[];
};

export const tinyBase = (items: readonly TinyItem[] = []): TinyState => ({
  items,
});

/**
 * Minimal template used to exercise the core pipeline without involving any
 * real template's meaning model.
 */
const tinyActions = {
  SET_NAME: defineAction('SET_NAME', 'item', v.object({ name: v.pipe(v.string(), v.minLength(1)) })),
  REORDER: defineAction('REORDER', 'item', v.object({ after: v.nullable(v.string()) }), { mode: 'sequence' }),
  ADD_ITEM: defineAction(
    'ADD_ITEM',
    'artifact',
    v.object({ id: v.pipe(v.string(), v.minLength(1)), name: v.pipe(v.string(), v.minLength(1)) }),
    { dedupeKey: entityDedupeKey },
  ),
  DELETE_ITEM: defineAction('DELETE_ITEM', 'item', v.object({})),
} satisfies ActionSpecs;

export const tinyDefinition: TemplateDefinition<TinyState> = {
  name: 'tiny',
  label: 'Tiny',
  parseBase: (input) =>
    v.parse(
      v.strictObject({
        items: v.optional(v.array(v.strictObject({ id: v.string(), name: v.string() })), []),
      }),
      input,
    ),
  emptyBase: () => tinyBase(),
  actions: tinyActions,
  apply(state, action) {
    const id = action.target.id;
    switch (action.type) {
      case 'SET_NAME': {
        if (!state.items.some((item) => item.id === id)) return null;
        const { name } = payloadFor(tinyActions.SET_NAME, action);
        return {
          items: state.items.map((item) => (item.id === id ? { ...item, name } : item)),
        };
      }
      case 'ADD_ITEM': {
        const payload = payloadFor(tinyActions.ADD_ITEM, action);
        if (state.items.some((item) => item.id === payload.id)) return state;
        return {
          items: [...state.items, { id: payload.id, name: payload.name }],
        };
      }
      case 'DELETE_ITEM': {
        if (!state.items.some((item) => item.id === id)) return null;
        return { items: state.items.filter((item) => item.id !== id) };
      }
      case 'REORDER': {
        const { after } = payloadFor(tinyActions.REORDER, action);
        const current = state.items.find((item) => item.id === id);
        if (!current) return null;
        if (after !== null && !state.items.some((item) => item.id === after)) return null;
        const rest = state.items.filter((item) => item.id !== id);
        const anchor = after === null ? -1 : rest.findIndex((item) => item.id === after);
        const next = [...rest];
        next.splice(anchor + 1, 0, current);
        return { items: next };
      }
      default:
        return null;
    }
  },
  hasTarget: (state, target: ActionTarget) =>
    target.type === 'artifact' || state.items.some((item) => item.id === target.id),
  describe: (action) => ({
    title: action.type,
    targetLabel: action.target.id,
    tone: 'update',
  }),
  serialize: (action) => `${action.type} ${action.target.id}`,
  resolveNavigation: (_state, nav: Navigation) => nav,
  commentTargets: (state) =>
    state.items.map((item) => ({
      value: `item:${item.id}`,
      label: item.name,
      group: 'Item',
    })),
  title: () => 'Tiny artifact',
};
