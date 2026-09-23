// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';

import type { DraftAction } from '../../core/types';
import type { DpkTemplateEventStorming } from './element';

import { applyEventStormingAction } from './apply';
import { eventStormingDefinition } from './definition';
import { parseEventStormingBase, emptyEventStormingBase, type EventStormingState } from './model';
import '../../index';

const base = {
  title: 'Test',
  contexts: [{ id: 'c1', name: 'Ctx1' }],
  elements: [
    { id: 'n1', type: 'event', name: 'E1', description: '説明テキスト', contextId: 'c1' },
    { id: 'n2', type: 'command', name: 'C1' },
  ],
  links: [{ id: 'l1', from: 'n1', to: 'n2' }],
};

const action = (type: string, target: { type: string; id: string }, payload: unknown): DraftAction => {
  return { id: 'a1', type, target, payload, createdAt: 'now' };
};

describe('event-storming', () => {
  it('strict base parsing rejects unknown keys', () => {
    expect(() => parseEventStormingBase({ ...base, oops: true })).toThrow();
    expect(() => parseEventStormingBase({ ...base, links: [{ id: 'x', from: 'n1', to: 'ghost' }] })).toThrow();
    expect(() =>
      parseEventStormingBase({ ...base, elements: [{ id: 'z', type: 'event', name: 'Z', contextId: 'ghost' }] }),
    ).toThrow();
  });

  it('apply is pure (input untouched)', () => {
    const state = parseEventStormingBase(base);
    const snap = JSON.stringify(state);
    applyEventStormingAction(state, action('SET_ELEMENT_NAME', { type: 'element', id: 'n1' }, { name: 'R' }));
    expect(JSON.stringify(state)).toBe(snap);
  });

  it('idempotency: apply twice = same result', () => {
    const state = parseEventStormingBase(base);
    const a = action('SET_ELEMENT_NAME', { type: 'element', id: 'n1' }, { name: 'R' });
    const once = applyEventStormingAction(state, a) as EventStormingState;
    const twice = applyEventStormingAction(once, a) as EventStormingState;
    expect(twice).toEqual(once);
    const add = action('ADD_ELEMENT', { type: 'page', id: 'event-storming' }, { id: 'n3', type: 'event', name: 'N' });
    const s1 = applyEventStormingAction(state, add) as EventStormingState;
    const s2 = applyEventStormingAction(s1, add) as EventStormingState;
    expect(s2).toEqual(s1);
  });

  it('inapplicability returns null', () => {
    const state = parseEventStormingBase(base);
    expect(
      applyEventStormingAction(state, action('SET_ELEMENT_NAME', { type: 'element', id: 'ghost' }, { name: 'x' })),
    ).toBeNull();
    expect(applyEventStormingAction(state, action('NOPE', { type: 'element', id: 'n1' }, {}))).toBeNull();
  });

  it('describe/serialize never throw on stale actions', () => {
    const state = parseEventStormingBase(base);
    const stale = action('SET_ELEMENT_NAME', { type: 'element', id: 'gone' }, { name: 'x' });
    expect(() => eventStormingDefinition.describe(stale, state)).not.toThrow();
    expect(eventStormingDefinition.serialize(stale)).toContain('SET_ELEMENT_NAME');
  });

  it('resolveNavigation drops unknown ids', () => {
    const state = parseEventStormingBase(base);
    expect(eventStormingDefinition.resolveNavigation(state, { note: 'ghost', context: 'ghost' })).toEqual({});
    expect(eventStormingDefinition.resolveNavigation(state, { note: 'n1', context: 'c1' })).toEqual({
      note: 'n1',
      context: 'c1',
    });
  });

  it('emptyBase parses', () => {
    expect(parseEventStormingBase(emptyEventStormingBase())).toBeDefined();
  });

  it('mounts, dispatches and navigates', async () => {
    window.location.hash = '';
    document.body.innerHTML = `<dpk-template-event-storming storage="memory"><script type="application/json">${JSON.stringify(base)}</script></dpk-template-event-storming>`;
    const el = document.querySelector('dpk-template-event-storming') as unknown as DpkTemplateEventStorming;
    await el.api.ready;
    await el.updateComplete;
    expect(el.shadowRoot?.querySelectorAll('dpk-internal-event-storming-note').length).toBeGreaterThan(0);
    el.api.dispatch({ type: 'SET_ELEMENT_NAME', target: 'n1', payload: { name: 'Renamed' } });
    await el.updateComplete;
    await Promise.resolve();
    await el.updateComplete;
    // The name renders inside the nested inline editor's shadow root.
    const cards = Array.from(el.shadowRoot?.querySelectorAll('dpk-internal-event-storming-note') ?? []);
    await Promise.all(cards.map((card) => (card as HTMLElement & { updateComplete: Promise<boolean> }).updateComplete));
    const editors = cards.flatMap((card) =>
      Array.from(card.shadowRoot?.querySelectorAll('dpk-component-inline-edit') ?? []),
    );
    await Promise.all(
      editors.map((edit) => (edit as HTMLElement & { updateComplete: Promise<boolean> }).updateComplete),
    );
    const names = editors.map((edit) => edit.shadowRoot?.textContent ?? '');
    expect(names.join('\n')).toContain('Renamed');
    el.api.navigate({ note: 'n2' });
    await el.updateComplete;
    expect(location.hash).toContain('note=n2');
    document.body.innerHTML = '';
  });

  it('an empty board starts its first event from the empty state', async () => {
    window.location.hash = '';
    document.body.innerHTML = `<dpk-template-event-storming storage="memory"><script type="application/json">{}</script></dpk-template-event-storming>`;
    const el = document.querySelector('dpk-template-event-storming') as unknown as DpkTemplateEventStorming;
    await el.api.ready;
    await el.updateComplete;
    const button = el.shadowRoot?.querySelector<HTMLButtonElement>('.empty button');
    expect(button?.textContent).toContain('最初のイベント');
    // New notes come from the context they belong to (the empty state, a
    // slice's role chips, a note's hotspot tool) — never from a wall toolbar.
    expect(el.shadowRoot?.querySelector('[data-testid="es-add"]')).toBeNull();
    button?.click();
    await el.updateComplete;
    const notes = Array.from(el.shadowRoot?.querySelectorAll('dpk-internal-event-storming-note') ?? []);
    expect(notes).toHaveLength(1);
    expect(notes[0]?.getAttribute('data-mode')).toBe('editing');
    document.body.innerHTML = '';
  });

  it('renders causality links as SVG-namespaced elements', async () => {
    window.location.hash = '';
    document.body.innerHTML = `<dpk-template-event-storming storage="memory"><script type="application/json">${JSON.stringify(base)}</script></dpk-template-event-storming>`;
    const el = document.querySelector('dpk-template-event-storming') as unknown as DpkTemplateEventStorming;
    await el.api.ready;
    await el.updateComplete;
    const path = el.shadowRoot?.querySelector('.links-layer path.link-path');
    // Regression: a child template whose root is an SVG element must use lit's `svg`
    // tag, otherwise it is parsed in the HTML namespace and never painted.
    expect(path?.namespaceURI).toBe('http://www.w3.org/2000/svg');
    // Both notes fit in the first band here, so every link paints as one stroke.
    expect(el.shadowRoot?.querySelectorAll('.links-layer path.link-path').length).toBe(el.api.state.links.length);
    document.body.innerHTML = '';
  });

  it('a note paints its name only: the description is a tooltip', async () => {
    window.location.hash = '';
    document.body.innerHTML = `<dpk-template-event-storming storage="memory"><script type="application/json">${JSON.stringify(base)}</script></dpk-template-event-storming>`;
    const el = document.querySelector('dpk-template-event-storming') as unknown as DpkTemplateEventStorming;
    await el.api.ready;
    await el.updateComplete;
    const card = el.shadowRoot?.querySelector('dpk-internal-event-storming-note');
    await (card as (HTMLElement & { updateComplete: Promise<boolean> }) | null)?.updateComplete;
    expect(card?.getAttribute('title')).toBe('説明テキスト');
    expect(card?.shadowRoot?.textContent ?? '').not.toContain('説明テキスト');
    document.body.innerHTML = '';
  });

  it('a wrapped run continues directly under the slice it was cut from', async () => {
    window.location.hash = '';
    const chain = Array.from({ length: 6 }, (_, i) => ({ id: `e${i + 1}`, type: 'event', name: `E${i + 1}` }));
    const links = chain.slice(1).map((note, i) => ({ id: `l${i + 1}`, from: `e${i + 1}`, to: note.id }));
    const board = { elements: chain, links };
    document.body.innerHTML = `<dpk-template-event-storming storage="memory"><script type="application/json">${JSON.stringify(board)}</script></dpk-template-event-storming>`;
    const el = document.querySelector('dpk-template-event-storming') as unknown as DpkTemplateEventStorming;
    await el.api.ready;
    await el.updateComplete;
    const bands = Array.from(el.shadowRoot?.querySelectorAll('.band') ?? []);
    expect(bands.length).toBeGreaterThan(1);
    // The wrapped band starts level with the slice it continues from, so the
    // connector is a straight drop rather than a line travelling back to the
    // wall margin.
    const sliceX = (band: Element | undefined, index: number): number => {
      const left = band?.querySelectorAll<HTMLElement>('[data-slice-id]')[index]?.style.left ?? '';
      return parseFloat(band instanceof HTMLElement ? band.style.left : '0') + parseFloat(left);
    };
    const lastOfFirstBand = (bands[0]?.querySelectorAll('[data-slice-id]').length ?? 0) - 1;
    expect(sliceX(bands[1], 0)).toBe(sliceX(bands[0], lastOfFirstBand));
    document.body.innerHTML = '';
  });

  it('edits the name in place, with no pencil or detail button', async () => {
    window.location.hash = '';
    document.body.innerHTML = `<dpk-template-event-storming storage="memory"><script type="application/json">${JSON.stringify(base)}</script></dpk-template-event-storming>`;
    const el = document.querySelector('dpk-template-event-storming') as unknown as DpkTemplateEventStorming;
    await el.api.ready;
    await el.updateComplete;
    const card = el.shadowRoot?.querySelector('dpk-internal-event-storming-note');
    await (card as (HTMLElement & { updateComplete: Promise<boolean> }) | null)?.updateComplete;
    // The name itself is the editor; the card only carries comment, delete and
    // the labelled hotspot chip.
    const edit = card?.shadowRoot?.querySelector<HTMLElement>('dpk-component-inline-edit.note-name');
    expect(edit).not.toBeNull();
    expect(card?.shadowRoot?.querySelector('[data-role="edit"]')).toBeNull();
    expect(card?.shadowRoot?.querySelector('[data-role="detail"]')).toBeNull();
    expect(card?.shadowRoot?.querySelector('.note-hotspot')?.textContent).toContain('ホットスポット');
    expect(card?.shadowRoot?.querySelectorAll('.note-tools button')).toHaveLength(2);
    await (edit as unknown as { updateComplete: Promise<boolean> }).updateComplete;
    edit?.shadowRoot?.querySelector<HTMLElement>('.view')?.click();
    await (edit as unknown as { updateComplete: Promise<boolean> }).updateComplete;
    const input = edit?.shadowRoot?.querySelector<HTMLInputElement | HTMLTextAreaElement>('input, textarea');
    expect(input).not.toBeNull();
    if (input) {
      input.value = '注文する';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    }
    await el.updateComplete;
    await Promise.resolve();
    await el.updateComplete;
    expect(el.api.state.elements.find((note) => note.id === 'n1')?.name).toBe('注文する');
    document.body.innerHTML = '';
  });

  it('selects a link stroke and deletes it with the Delete key', async () => {
    window.location.hash = '';
    document.body.innerHTML = `<dpk-template-event-storming storage="memory"><script type="application/json">${JSON.stringify(base)}</script></dpk-template-event-storming>`;
    const el = document.querySelector('dpk-template-event-storming') as unknown as DpkTemplateEventStorming;
    await el.api.ready;
    await el.updateComplete;
    el.shadowRoot?.querySelector('path.link-hit')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await el.updateComplete;
    expect(el.shadowRoot?.querySelectorAll('path.link-path.is-selected').length).toBe(1);
    el.shadowRoot
      ?.querySelector('.board-viewport')
      ?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }));
    await el.updateComplete;
    expect(el.api.state.links).toHaveLength(0);
    expect(el.shadowRoot?.querySelector('.board-selection')).toBeNull();
    document.body.innerHTML = '';
  });

  beforeEach(() => {
    window.location.hash = '';
    document.body.innerHTML = '';
  });
});
