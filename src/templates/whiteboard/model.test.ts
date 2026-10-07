import { describe, expect, it } from 'vitest';

import type { DraftAction } from '../../core/types';

import { whiteboardAction } from './actions';
import { applyWhiteboardAction } from './apply';
import { whiteboardDefinitionFor } from './definition';
import { whiteboardMessages } from './messages';
import { findItem, frameMembers, frameOf, parseWhiteboardBase, type WhiteboardState } from './model';
import { resolveWhiteboardNavigation, whiteboardCommentTargets, whiteboardCurrentTarget } from './present';

const SAMPLE_BASE = {
  title: 'Retro',
  items: [
    { id: 'went-well', kind: 'frame', x: 0, y: 0, w: 400, h: 300, title: 'Went well' },
    { id: 'to-improve', kind: 'frame', x: 500, y: 0, w: 400, h: 300, title: 'To improve', color: 'pink' },
    { id: 'pairing', kind: 'sticky', x: 20, y: 60, text: 'Pairing on the parser' },
    { id: 'flaky', kind: 'sticky', x: 520, y: 60, text: 'Flaky CI', color: 'orange' },
    { id: 'note', kind: 'text', x: 0, y: -80, text: 'Sprint 12' },
    { id: 'goal', kind: 'shape', shape: 'ellipse', x: 1000, y: 40, text: 'Ship v1' },
  ],
  connectors: [{ id: 'flaky-goal', from: 'flaky', to: 'goal', label: 'blocks' }],
};

const state = (): WhiteboardState => parseWhiteboardBase(SAMPLE_BASE);

const action = (input: { type: string; target: unknown; payload?: unknown }): DraftAction => {
  const target =
    typeof input.target === 'object' && input.target !== null && 'type' in input.target && 'id' in input.target
      ? { type: String(input.target.type), id: String(input.target.id) }
      : { type: 'page', id: 'whiteboard' };
  return { id: 'a', type: input.type, target, payload: input.payload ?? {}, createdAt: '2026-01-01T00:00:00Z' };
};

const apply = (s: WhiteboardState, input: { type: string; target: unknown; payload?: unknown }) =>
  applyWhiteboardAction(s, action(input));

describe('whiteboard base data', () => {
  it('fills in sizes and colors the author left out', () => {
    const parsed = state();
    expect(findItem(parsed, 'pairing')).toMatchObject({ w: 160, h: 160, color: 'yellow' });
    expect(findItem(parsed, 'goal')).toMatchObject({ shape: 'ellipse', color: 'blue', w: 180, h: 110 });
    expect(findItem(parsed, 'went-well')).toMatchObject({ color: 'gray' });
    expect(parsed.connectors[0]).toMatchObject({ style: 'arrow', label: 'blocks' });
  });

  it('rejects unknown kinds, fields and dangling or duplicate references', () => {
    expect(() => parseWhiteboardBase({ items: [{ id: 'a', kind: 'circle', x: 0, y: 0 }] })).toThrow();
    expect(() => parseWhiteboardBase({ items: [{ id: 'a', kind: 'sticky', x: 0, y: 0, oops: 1 }] })).toThrow();
    // A frame encloses other items, so its size is required.
    expect(() => parseWhiteboardBase({ items: [{ id: 'f', kind: 'frame', x: 0, y: 0, title: 'F' }] })).toThrow();
    expect(() =>
      parseWhiteboardBase({ ...SAMPLE_BASE, connectors: [{ id: 'c', from: 'pairing', to: 'nope' }] }),
    ).toThrow(/unknown item/);
    expect(() =>
      parseWhiteboardBase({ ...SAMPLE_BASE, connectors: [{ id: 'pairing', from: 'flaky', to: 'goal' }] }),
    ).toThrow(/duplicate/);
    expect(() => parseWhiteboardBase({ ...SAMPLE_BASE, connectors: [{ id: 'c', from: 'goal', to: 'goal' }] })).toThrow(
      /itself/,
    );
  });

  it('places items in the smallest frame that holds their center', () => {
    const parsed = parseWhiteboardBase({
      items: [...SAMPLE_BASE.items, { id: 'inner', kind: 'frame', x: 10, y: 40, w: 200, h: 200, title: 'Inner' }],
    });
    expect(frameOf(parsed, findItem(parsed, 'pairing')!)?.id).toBe('inner');
    expect(frameOf(parsed, findItem(parsed, 'inner')!)?.id).toBe('went-well');
    expect(frameOf(parsed, findItem(parsed, 'note')!)).toBeUndefined();
    const wentWell = findItem(parsed, 'went-well');
    if (wentWell?.kind !== 'frame') throw new Error('expected a frame');
    expect(frameMembers(parsed, wentWell).map((item) => item.id)).toEqual(['pairing', 'inner']);
  });
});

describe('whiteboard actions', () => {
  it('adds an item once and refuses an id that is taken by another kind', () => {
    const add = whiteboardAction.addItem({ id: 'idea', kind: 'sticky', x: 40, y: 40, text: 'Idea' });
    const once = apply(state(), add);
    expect(findItem(once!, 'idea')).toMatchObject({ kind: 'sticky', text: 'Idea', w: 160, color: 'yellow' });
    expect(apply(once!, add)).toBe(once);
    expect(apply(state(), whiteboardAction.addItem({ id: 'flaky-goal', kind: 'text', x: 0, y: 0 }))).toBeNull();
  });

  it('edits text, and renames a frame but never to nothing', () => {
    expect(findItem(apply(state(), whiteboardAction.setText('pairing', 'Mob'))!, 'pairing')).toMatchObject({
      text: 'Mob',
    });
    expect(findItem(apply(state(), whiteboardAction.setText('went-well', 'Kept'))!, 'went-well')).toMatchObject({
      title: 'Kept',
    });
    expect(apply(state(), whiteboardAction.setText('went-well', '  '))).toBeNull();
    expect(apply(state(), whiteboardAction.setText('nope', 'x'))).toBeNull();
  });

  it('moves, resizes and recolors, but a text box has no color', () => {
    const moved = apply(state(), whiteboardAction.move('pairing', 600, 80));
    expect(findItem(moved!, 'pairing')).toMatchObject({ x: 600, y: 80 });
    const resized = apply(state(), whiteboardAction.resize('goal', 240, 140));
    expect(findItem(resized!, 'goal')).toMatchObject({ w: 240, h: 140 });
    expect(apply(state(), whiteboardAction.resize('goal', 2, 140))).toBeNull();
    const recolored = apply(state(), whiteboardAction.setColor('pairing', 'green'));
    expect(findItem(recolored!, 'pairing')).toMatchObject({ color: 'green' });
    expect(apply(state(), whiteboardAction.setColor('note', 'green'))).toBeNull();
  });

  it('deletes an item together with its connectors', () => {
    const next = apply(state(), whiteboardAction.deleteItem('goal'));
    expect(findItem(next!, 'goal')).toBeUndefined();
    expect(next?.connectors).toEqual([]);
    expect(apply(next!, whiteboardAction.deleteItem('goal'))).toBeNull();
  });

  it('connects two existing items, relabels and removes the connector', () => {
    const linked = apply(state(), whiteboardAction.connect('p-f', 'pairing', 'flaky', 'helps'));
    expect(linked?.connectors.at(-1)).toEqual({
      id: 'p-f',
      from: 'pairing',
      to: 'flaky',
      style: 'arrow',
      label: 'helps',
    });
    expect(apply(state(), whiteboardAction.connect('x', 'pairing', 'nope'))).toBeNull();
    expect(apply(state(), whiteboardAction.connect('x', 'pairing', 'pairing'))).toBeNull();
    const relabeled = apply(state(), whiteboardAction.setConnectorLabel('flaky-goal', ''));
    expect(relabeled?.connectors[0]).toEqual({ id: 'flaky-goal', from: 'flaky', to: 'goal', style: 'arrow' });
    expect(apply(state(), whiteboardAction.deleteConnector('flaky-goal'))?.connectors).toEqual([]);
    expect(apply(state(), whiteboardAction.deleteConnector('nope'))).toBeNull();
  });
});

describe('whiteboard descriptions', () => {
  const definition = whiteboardDefinitionFor('en');
  const describeOn = (input: { type: string; target: unknown; payload?: unknown }) => {
    const base = state();
    const after = applyWhiteboardAction(base, action(input)) ?? base;
    return definition.describe(action(input), after, base);
  };

  it('says which frame a move leaves and joins', () => {
    expect(describeOn(whiteboardAction.move('pairing', 540, 80))).toEqual({
      title: 'Moved the sticky note',
      tone: 'move',
      targetLabel: 'Sticky note · Pairing on the parser',
      summary: 'frame “Went well” → frame “To improve” (540, 80)',
    });
    expect(describeOn(whiteboardAction.move('pairing', 30, 70)).summary).toBe('(20, 60) → (30, 70)');
    expect(describeOn(whiteboardAction.move('note', 40, 40)).summary).toBe('into frame “Went well” (40, 40)');
    expect(describeOn(whiteboardAction.move('flaky', 1400, 40)).summary).toBe('out of frame “To improve” (1400, 40)');
  });

  it('describes every other action with its before and after', () => {
    expect(describeOn(whiteboardAction.setText('pairing', 'Mob programming'))).toMatchObject({
      title: 'Edited the sticky note',
      summary: '“Pairing on the parser” → “Mob programming”',
    });
    expect(describeOn(whiteboardAction.setText('went-well', 'Kept'))).toMatchObject({ title: 'Renamed the frame' });
    expect(describeOn(whiteboardAction.resize('goal', 240, 140))).toMatchObject({
      title: 'Resized the shape',
      summary: '180×110 → 240×140',
      targetLabel: 'Ellipse · Ship v1',
    });
    expect(describeOn(whiteboardAction.setColor('flaky', 'pink'))).toMatchObject({ summary: 'Orange → Pink' });
    expect(describeOn(whiteboardAction.deleteItem('flaky'))).toMatchObject({
      title: 'Deleted the sticky note',
      tone: 'delete',
      summary: '− “Flaky CI”',
    });
    expect(
      describeOn(whiteboardAction.addItem({ id: 'n', kind: 'sticky', x: 520, y: 200, text: 'Retry less' })),
    ).toMatchObject({ title: 'Added a sticky note', tone: 'create', summary: '+ “Retry less” in frame “To improve”' });
    expect(describeOn(whiteboardAction.connect('c', 'pairing', 'goal', 'leads to'))).toMatchObject({
      title: 'Connected two items',
      summary: '“Pairing on the parser” → “Ship v1” · labeled “leads to”',
    });
    expect(describeOn(whiteboardAction.setConnectorLabel('flaky-goal', 'delays'))).toMatchObject({
      summary: '“blocks” → “delays”',
      targetLabel: 'Connector · “Flaky CI” → “Ship v1”',
    });
    expect(describeOn(whiteboardAction.deleteConnector('flaky-goal'))).toMatchObject({
      title: 'Removed the connector',
      summary: '“Flaky CI” → “Ship v1”',
    });
  });

  it('speaks Japanese too', () => {
    const ja = whiteboardDefinitionFor('ja');
    const base = state();
    const input = action(whiteboardAction.move('pairing', 540, 80));
    expect(ja.describe(input, applyWhiteboardAction(base, input)!, base)).toMatchObject({
      title: '付箋を移動',
      summary: 'フレーム「Went well」→「To improve」 (540, 80)',
    });
  });
});

describe('whiteboard navigation and comment targets', () => {
  const m = whiteboardMessages('en');

  it('keeps only a frame in focus and an item or connector that exist', () => {
    expect(resolveWhiteboardNavigation(state(), { frame: 'went-well', item: 'flaky-goal' })).toEqual({
      frame: 'went-well',
      item: 'flaky-goal',
    });
    expect(resolveWhiteboardNavigation(state(), { frame: 'pairing', item: 'nope', other: 'x' })).toEqual({
      other: 'x',
    });
  });

  it('lists the board, every item (frames first) and every connector', () => {
    const targets = whiteboardCommentTargets(m, state());
    expect(targets.map((target) => target.value)).toEqual([
      'page:whiteboard',
      'item:went-well',
      'item:to-improve',
      'item:pairing',
      'item:flaky',
      'item:note',
      'item:goal',
      'connector:flaky-goal',
    ]);
    expect(targets.find((target) => target.value === 'item:pairing')?.label).toBe('Went well › Pairing on the parser');
  });

  it('attaches composer notes to the selection, else to the frame in focus', () => {
    expect(whiteboardCurrentTarget(m, state(), { item: 'flaky' })?.value).toBe('item:flaky');
    expect(whiteboardCurrentTarget(m, state(), { item: 'flaky-goal' })?.value).toBe('connector:flaky-goal');
    expect(whiteboardCurrentTarget(m, state(), { frame: 'went-well' })?.value).toBe('item:went-well');
    expect(whiteboardCurrentTarget(m, state(), {})).toBeNull();
  });
});
