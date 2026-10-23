import * as v from 'valibot';

import type { ActionInput } from '../../core/types';

import {
  defineAction,
  entityDedupeKey,
  entityIdSchema,
  type ActionSpecs,
  type TemplateAction,
} from '../../core/schema';
import { NOTE_TYPES } from './model';

export const eventStormingActions = {
  SET_ELEMENT_NAME: defineAction('SET_ELEMENT_NAME', 'element', v.object({ name: v.pipe(v.string(), v.minLength(1)) })),
  SET_ELEMENT_DESCRIPTION: defineAction('SET_ELEMENT_DESCRIPTION', 'element', v.object({ description: v.string() })),
  SET_ELEMENT_TYPE: defineAction('SET_ELEMENT_TYPE', 'element', v.object({ type: v.picklist(NOTE_TYPES) })),
  SET_ELEMENT_CONTEXT: defineAction('SET_ELEMENT_CONTEXT', 'element', v.object({ contextId: v.nullable(v.string()) })),
  MOVE_ELEMENT: defineAction('MOVE_ELEMENT', 'element', v.object({ after: v.nullable(v.string()) }), {
    mode: 'sequence',
  }),
  ADD_ELEMENT: defineAction(
    'ADD_ELEMENT',
    'page',
    v.object({
      id: entityIdSchema,
      type: v.picklist(NOTE_TYPES),
      name: v.pipe(v.string(), v.minLength(1)),
      description: v.exactOptional(v.string()),
      contextId: v.exactOptional(v.string()),
    }),
    { dedupeKey: entityDedupeKey },
  ),
  DELETE_ELEMENT: defineAction('DELETE_ELEMENT', 'element', v.object({})),
  LINK_ELEMENTS: defineAction(
    'LINK_ELEMENTS',
    'page',
    v.object({
      id: entityIdSchema,
      from: v.pipe(v.string(), v.minLength(1)),
      to: v.pipe(v.string(), v.minLength(1)),
      label: v.exactOptional(v.string()),
      kind: v.exactOptional(v.picklist(['member', 'flow'])),
    }),
    { dedupeKey: entityDedupeKey },
  ),
  SET_LINK_LABEL: defineAction('SET_LINK_LABEL', 'link', v.object({ label: v.string() })),
  UNLINK_ELEMENTS: defineAction(
    'UNLINK_ELEMENTS',
    'page',
    v.object({ from: v.pipe(v.string(), v.minLength(1)), to: v.pipe(v.string(), v.minLength(1)) }),
    { mode: 'sequence' },
  ),
  ADD_CONTEXT: defineAction(
    'ADD_CONTEXT',
    'page',
    v.object({
      id: entityIdSchema,
      name: v.pipe(v.string(), v.minLength(1)),
      description: v.exactOptional(v.string()),
    }),
    { dedupeKey: entityDedupeKey },
  ),
  SET_CONTEXT_NAME: defineAction('SET_CONTEXT_NAME', 'context', v.object({ name: v.pipe(v.string(), v.minLength(1)) })),
  DELETE_CONTEXT: defineAction('DELETE_CONTEXT', 'context', v.object({})),
} satisfies ActionSpecs;

/** The discriminated union of this template's actions. */
export type EventStormingAction = TemplateAction<typeof eventStormingActions>;

export const eventStormingAction = {
  setElementName: (id: string, name: string): ActionInput => ({
    type: 'SET_ELEMENT_NAME',
    target: { type: 'element', id },
    payload: { name },
  }),
  setElementDescription: (id: string, description: string): ActionInput => ({
    type: 'SET_ELEMENT_DESCRIPTION',
    target: { type: 'element', id },
    payload: { description },
  }),
  setElementType: (id: string, type: string): ActionInput => ({
    type: 'SET_ELEMENT_TYPE',
    target: { type: 'element', id },
    payload: { type },
  }),
  setElementContext: (id: string, contextId: string | null): ActionInput => ({
    type: 'SET_ELEMENT_CONTEXT',
    target: { type: 'element', id },
    payload: { contextId },
  }),
  moveElement: (id: string, after: string | null): ActionInput => ({
    type: 'MOVE_ELEMENT',
    target: { type: 'element', id },
    payload: { after },
  }),
  addElement: (id: string, type: string, name: string): ActionInput => ({
    type: 'ADD_ELEMENT',
    target: { type: 'page', id: 'event-storming' },
    payload: { id, type, name },
  }),
  deleteElement: (id: string): ActionInput => ({
    type: 'DELETE_ELEMENT',
    target: { type: 'element', id },
    payload: {},
  }),
  linkElements: (
    id: string,
    from: string,
    to: string,
    options?: { label?: string; kind?: 'member' | 'flow' },
  ): ActionInput => ({
    type: 'LINK_ELEMENTS',
    target: { type: 'page', id: 'event-storming' },
    payload: {
      id,
      from,
      to,
      ...(options?.label === undefined ? {} : { label: options.label }),
      ...(options?.kind === undefined ? {} : { kind: options.kind }),
    },
  }),
  setLinkLabel: (id: string, label: string): ActionInput => ({
    type: 'SET_LINK_LABEL',
    target: { type: 'link', id },
    payload: { label },
  }),
  unlinkElements: (from: string, to: string): ActionInput => ({
    type: 'UNLINK_ELEMENTS',
    target: { type: 'page', id: 'event-storming' },
    payload: { from, to },
  }),
  addContext: (id: string, name: string): ActionInput => ({
    type: 'ADD_CONTEXT',
    target: { type: 'page', id: 'event-storming' },
    payload: { id, name },
  }),
  setContextName: (id: string, name: string): ActionInput => ({
    type: 'SET_CONTEXT_NAME',
    target: { type: 'context', id },
    payload: { name },
  }),
  deleteContext: (id: string): ActionInput => ({
    type: 'DELETE_CONTEXT',
    target: { type: 'context', id },
    payload: {},
  }),
};
