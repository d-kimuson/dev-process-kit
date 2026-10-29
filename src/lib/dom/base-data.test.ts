import * as v from 'valibot';
import { afterEach, describe, expect, it } from 'vitest';

import { observeJsonChild, readJsonChild, type JsonChildResult } from './base-data';

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

describe('observeJsonChild follows a block that changes after it is read', () => {
  type Data = { readonly states: readonly string[] };
  const fill = (host: Element, html: string): void => {
    const parsed = new DOMParser().parseFromString(html, 'text/html');
    host.append(...Array.from(parsed.body.childNodes, (node) => node.cloneNode(true)));
  };
  const mount = (html: string) => {
    const host = document.createElement('div');
    fill(host, html);
    document.body.append(host);
    const reads: JsonChildResult<Data>[] = [];
    const stop = observeJsonChild<Data>(host, parse, (result) => reads.push(result));
    return { host, reads, stop };
  };
  const tick = async (): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  };

  afterEach(() => {
    document.body.replaceChildren();
  });

  it('reads a block appended after the element connected', async () => {
    const { host, reads } = mount('');
    expect(reads).toEqual([]);
    fill(host, base);
    await tick();
    expect(reads).toEqual([{ ok: true, value: { states: ['requested'] } }]);
  });

  it('reports an empty block, then reads it once it is filled in', async () => {
    const { host, reads } = mount('<script type="application/json"></script>');
    expect(reads).toEqual([{ ok: false, error: 'JSON block is empty' }]);
    const script = host.querySelector('script');
    if (script === null) throw new Error('no script');
    script.textContent = '{ "states": ["paid"] }';
    await tick();
    expect(reads.at(-1)).toEqual({ ok: true, value: { states: ['paid'] } });
  });

  it('reads a fixed block after a parse error', async () => {
    const { host, reads } = mount('<script type="application/json">{ "states": "nope" }</script>');
    expect(reads.at(-1)?.ok).toBe(false);
    const script = host.querySelector('script');
    if (script === null) throw new Error('no script');
    script.textContent = '{ "states": ["fixed"] }';
    await tick();
    expect(reads.at(-1)).toEqual({ ok: true, value: { states: ['fixed'] } });
  });

  it('reads nothing more once disposed', async () => {
    const { host, reads, stop } = mount('<script type="application/json"></script>');
    stop();
    fill(host, base);
    await tick();
    expect(reads).toEqual([{ ok: false, error: 'JSON block is empty' }]);
  });
});
