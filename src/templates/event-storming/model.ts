import * as v from 'valibot';

import { entityIdSchema } from '../../core/schema';

export const NOTE_TYPES = [
  'actor',
  'command',
  'aggregate',
  'event',
  'policy',
  'readmodel',
  'external',
  'hotspot',
] as const;
export type NoteType = (typeof NOTE_TYPES)[number];

export type BoundedContext = {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
};

export type StickyNote = {
  readonly id: string;
  readonly type: NoteType;
  readonly name: string;
  readonly description?: string;
  readonly contextId?: string;
};

/**
 * What a link means for placement: a `member` link folds both notes into one
 * slice, a `flow` link is temporal succession drawn as an arrow. Links without
 * a kind are inferred from the note-type pair.
 */
export type LinkKind = 'member' | 'flow';

export type NoteLink = {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly label?: string;
  readonly kind?: LinkKind;
};

export type EventStormingState = {
  readonly title?: string;
  readonly contexts: readonly BoundedContext[];
  readonly elements: readonly StickyNote[];
  readonly links: readonly NoteLink[];
};

const contextSchema = v.strictObject({
  id: entityIdSchema,
  name: v.pipe(v.string(), v.minLength(1)),
  description: v.exactOptional(v.string()),
});

const noteSchema = v.strictObject({
  id: entityIdSchema,
  type: v.picklist(NOTE_TYPES),
  name: v.pipe(v.string(), v.minLength(1)),
  description: v.exactOptional(v.string()),
  contextId: v.exactOptional(v.string()),
});

const linkSchema = v.strictObject({
  id: entityIdSchema,
  from: v.pipe(v.string(), v.minLength(1)),
  to: v.pipe(v.string(), v.minLength(1)),
  label: v.exactOptional(v.string()),
  kind: v.exactOptional(v.picklist(['member', 'flow'])),
});

export const eventStormingBaseSchema = v.strictObject({
  title: v.exactOptional(v.string()),
  contexts: v.optional(v.array(contextSchema), []),
  elements: v.optional(v.array(noteSchema), []),
  links: v.optional(v.array(linkSchema), []),
});

export const parseEventStormingBase = (input: unknown): EventStormingState => {
  const parsed = v.parse(eventStormingBaseSchema, input);
  const noteIds = new Set(parsed.elements.map((n) => n.id));
  const contextIds = new Set(parsed.contexts.map((c) => c.id));
  for (const note of parsed.elements) {
    if (note.contextId !== undefined && !contextIds.has(note.contextId)) {
      throw new Error(`unknown context "${note.contextId}" for note "${note.id}"`);
    }
  }
  for (const link of parsed.links) {
    if (!noteIds.has(link.from)) throw new Error(`unknown note "${link.from}" in link "${link.id}"`);
    if (!noteIds.has(link.to)) throw new Error(`unknown note "${link.to}" in link "${link.id}"`);
  }
  return parsed;
};

export const emptyEventStormingBase = (): EventStormingState => {
  return { contexts: [], elements: [], links: [] };
};

export const findNote = (state: EventStormingState, id: string | undefined): StickyNote | undefined => {
  if (id === undefined) return undefined;
  return state.elements.find((n) => n.id === id);
};

export const findContext = (state: EventStormingState, id: string | undefined): BoundedContext | undefined => {
  if (id === undefined) return undefined;
  return state.contexts.find((c) => c.id === id);
};

export const findLink = (state: EventStormingState, id: string | undefined): NoteLink | undefined => {
  if (id === undefined) return undefined;
  return state.links.find((l) => l.id === id);
};

export const allNoteIds = (state: EventStormingState): string[] => {
  return state.elements.map((n) => n.id);
};
