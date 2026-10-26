import * as v from 'valibot';
import { describe, expect, it } from 'vitest';

import { readJsonChild } from './base-data';

/**
 * A board's or a component's base data must be readable whatever the order of the option blocks
 * around it: `<dpk-board-*>` elements read their JSON child through this helper, and a page may
 * carry a `data-dpk-grill` or `data-dpk-changes` block next to it (`docs/index.md`, Base data).
 * The docs prescribe base data first, but the parser itself must not depend on that order.
 */
const schema = v.strictObject({ states: v.array(v.string()) });
const parse = (input: unknown): { readonly states: readonly string[] } => v.parse(schema, input);

const read = (html: string) => {
  const host = document.createElement('div');
  host.innerHTML = html;
  return readJsonChild(host, parse);
};

const base = '<script type="application/json">{ "states": ["requested"] }</script>';
const grill = '<script type="application/json" data-dpk-grill>{ "questions": [] }</script>';
const changes = '<script type="application/json" data-dpk-changes>{ "revisions": [] }</script>';

describe('readJsonChild picks the base data script, not an option block', () => {
  it('reads base data written first', () => {
    expect(read(`${base}${grill}${changes}`)).toEqual({ ok: true, value: { states: ['requested'] } });
  });

  it('reads base data written after a questions block', () => {
    expect(read(`${grill}${base}`)).toEqual({ ok: true, value: { states: ['requested'] } });
  });

  it('reads base data written after a change log', () => {
    expect(read(`${changes}${base}`)).toEqual({ ok: true, value: { states: ['requested'] } });
  });

  it('reads base data written after both option blocks', () => {
    expect(read(`${grill}${changes}${base}`)).toEqual({ ok: true, value: { states: ['requested'] } });
  });

  it('finds no base data when the element carries only option blocks', () => {
    expect(read(`${grill}${changes}`)).toBeNull();
  });

  it('reports a base data block that does not parse', () => {
    const result = read('<script type="application/json">{ "states": "nope" }</script>');
    expect(result?.ok).toBe(false);
  });
});
