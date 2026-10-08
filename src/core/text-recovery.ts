import * as v from 'valibot';

/**
 * Text the reader has typed but not committed yet (a comment being written, a
 * name being edited) lives only in the memory of the page. A reload, an update
 * of the page the agent republished, or a stray Escape would lose it, so each
 * field's unsent text is kept for the tab's session and offered back the next
 * time the same field opens from the same starting text.
 */

/** What a field shows when the reader starts typing, and what they have typed since. */
export type UnsentText = {
  readonly base: string;
  readonly value: string;
};

export type UnsentTexts = Readonly<Record<string, UnsentText>>;

/** Enough for every field a reader leaves half written in one page; the oldest go first. */
export const UNSENT_TEXT_LIMIT = 30;

const unsentTextsSchema = v.record(v.string(), v.object({ base: v.string(), value: v.string() }));

export const parseUnsentTexts = (input: unknown): UnsentTexts | null => {
  const parsed = v.safeParse(unsentTextsSchema, input);
  return parsed.success ? parsed.output : null;
};

/** Where in the page a field sits, as the element reads it from the DOM. */
export type TextFieldIdentity = {
  /** `data-dpk-text-key` of the field or its nearest ancestor: what the field is about (a comment target). */
  readonly key?: string;
  /** Tag names of the custom elements from the template down to the field. */
  readonly hosts: readonly string[];
  /** The field's accessible name (its label, placeholder or name). */
  readonly name: string;
  /** What the field showed when the reader started typing. */
  readonly base: string;
};

/**
 * The record a field's unsent text is filed under. A field the template keys
 * explicitly is found again by that key alone; any other field by where it sits
 * and the text it started from, so the text of one entity never lands in the
 * editor of another.
 */
export const unsentTextId = (field: TextFieldIdentity): string =>
  field.key === undefined
    ? JSON.stringify(['field', field.hosts, field.name, field.base])
    : JSON.stringify(['key', field.key, field.name]);

/** Records what the reader typed; typing back to where they started forgets it. */
export const recordUnsentText = (texts: UnsentTexts, id: string, text: UnsentText): UnsentTexts => {
  const { [id]: _previous, ...rest } = texts;
  if (text.value === text.base) return rest;
  // Re-inserted last, so the record stays ordered from least to most recently typed.
  const entries = Object.entries({ ...rest, [id]: text });
  return Object.fromEntries(entries.slice(Math.max(0, entries.length - UNSENT_TEXT_LIMIT)));
};

export const forgetUnsentText = (texts: UnsentTexts, id: string): UnsentTexts => {
  if (!(id in texts)) return texts;
  const { [id]: _removed, ...rest } = texts;
  return rest;
};

/**
 * The text to put back into a field that just opened showing `current`, or
 * `null`. Only a field that still starts where the reader left it gets the text
 * back: one that already shows something else holds newer text of its own.
 */
export const textToRestore = (texts: UnsentTexts, id: string, current: string): string | null => {
  const unsent = texts[id];
  if (unsent === undefined || unsent.base !== current || unsent.value === current) return null;
  return unsent.value;
};
