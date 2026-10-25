/**
 * Pure pieces shared by the board tier and the components it composes.
 *
 * Tags, element-reference paths and selections are not board-specific: a
 * table, a checklist and the tag filter read the same shapes. They live in
 * core so neither tier has to import the other.
 */

export type TagMatch = 'single' | 'all' | 'any';

export type TagState = {
  readonly active: readonly string[];
  readonly match: TagMatch;
};

export const EMPTY_TAG_STATE: TagState = { active: [], match: 'single' };

export const tagStateMatches = (tags: readonly string[], state: TagState): boolean => {
  if (state.active.length === 0) return true;
  return state.match === 'all'
    ? state.active.every((tag) => tags.includes(tag))
    : state.active.some((tag) => tags.includes(tag));
};

/** The decoded segments of an element reference (`table/orders/field/id`), or `null` when it is malformed. */
export const elementRefSegments = (id: string): readonly string[] | null => {
  try {
    return id.split('/').map((segment) => decodeURIComponent(segment));
  } catch {
    return null;
  }
};

export type SelectionRef = { readonly kind: string; readonly id: string };

/** A bounded context's tag is shared by the ER diagram and the generic tag filter. */
export const BC_TAG_PREFIX = 'BC:';

export const boundedContextTag = (boundedContext: string): string => `${BC_TAG_PREFIX}${boundedContext}`;
