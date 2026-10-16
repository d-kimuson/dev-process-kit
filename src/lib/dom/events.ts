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

/** `@change` on an `<input>`: hand its value on, with the input to put a refused value back. */
export const onInputChange = (fn: (value: string, input: HTMLInputElement) => void): ((event: Event) => void) => {
  return (event) => {
    const input = elementOf(event.target, HTMLInputElement);
    if (input !== null) fn(input.value, input);
  };
};

/** `@change` on a checkbox: hand the checked state on. */
export const onCheckedChange = (fn: (checked: boolean) => void): ((event: Event) => void) => {
  return (event) => {
    const input = elementOf(event.target, HTMLInputElement);
    if (input !== null) fn(input.checked);
  };
};
