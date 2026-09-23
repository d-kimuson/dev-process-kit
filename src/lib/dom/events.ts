/** Listener helpers shared by template renderers. */
import * as v from 'valibot';

import { elementOf } from './element';

/**
 * Event payloads are external input: validate the detail instead of asserting
 * its shape.
 */
const commitDetailSchema = v.object({ value: v.string() });

/** `@dpk-commit` from `<dpk-component-inline-edit>`: hand the committed text on. */
export const onCommit = (fn: (value: string) => void): ((event: Event) => void) => {
  return (event) => {
    if (!(event instanceof CustomEvent)) return;
    const detail = v.safeParse(commitDetailSchema, event.detail);
    if (detail.success) fn(detail.output.value);
  };
};

/** `@change` on a `<select>`: hand the chosen value on. */
export const onSelectChange = (fn: (value: string) => void): ((event: Event) => void) => {
  return (event) => {
    const select = elementOf(event.target, HTMLSelectElement);
    if (select !== null) fn(select.value);
  };
};
