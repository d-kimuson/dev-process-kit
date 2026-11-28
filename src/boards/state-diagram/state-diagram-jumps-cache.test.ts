import { afterEach, describe, expect, it, vi } from 'vitest';

import type * as LineJumps from '../../lib/layout/line-jumps';

import { jumpedPaths } from '../../lib/layout/line-jumps';
import { DpkBoardStateDiagram } from './element';
import { defineStateDiagram } from './index';
import { parseStateData } from './model';

// Wrap the real pass so a test can count how often the board recomputes jumps.
vi.mock('../../lib/layout/line-jumps', async (importOriginal) => {
  const actual = await importOriginal<typeof LineJumps>();
  return { ...actual, jumpedPaths: vi.fn(actual.jumpedPaths) };
});

defineStateDiagram();

const settle = async (element: DpkBoardStateDiagram): Promise<void> => {
  for (let index = 0; index < 3; index++) await element.updateComplete;
};

const mount = async (): Promise<DpkBoardStateDiagram> => {
  const element = new DpkBoardStateDiagram();
  element.data = parseStateData({
    states: [
      { id: 'a', name: 'A', position: { x: 0, y: 300 } },
      { id: 'c', name: 'C', position: { x: 640, y: 300 } },
      { id: 'e', name: 'E', position: { x: 300, y: 0 } },
      { id: 'f', name: 'F', position: { x: 300, y: 600 } },
    ],
    transitions: [
      { id: 'ac', from: 'a', to: 'c', title: 'across' },
      { id: 'ef', from: 'e', to: 'f', title: 'over' },
    ],
  });
  document.body.append(element);
  await settle(element);
  return element;
};

const pointer = (target: HTMLElement, type: string, clientX: number, clientY: number): void => {
  target.dispatchEvent(new PointerEvent(type, { pointerId: 1, button: 0, clientX, clientY, bubbles: true }));
};

const calls = (): number => vi.mocked(jumpedPaths).mock.calls.length;

describe('state diagram jump memo', () => {
  afterEach(() => {
    vi.mocked(jumpedPaths).mockClear();
  });

  it('keeps its jumped paths across a selection re-render and a drag, which both rebuild the layout object', async () => {
    if (!('setPointerCapture' in HTMLElement.prototype)) {
      Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', { configurable: true, value: () => {} });
    }
    const element = await mount();
    const initial = calls();
    expect(initial).toBeGreaterThan(0);

    // A selection only changes classes; the routes are unchanged, so no recompute.
    element.select({ kind: 'node', id: 'a' });
    await settle(element);
    expect(calls()).toBe(initial);

    // A whole drag/drop cycle re-routes the moved state on every render, but
    // once dropped the routes are the same again — and the memo holds, where a
    // layout-object key would have missed every time.
    const card = element.renderRoot.querySelector<HTMLElement>('[data-state="a"]');
    if (!card) throw new Error('missing state card');
    pointer(card, 'pointerdown', 10, 10);
    pointer(card, 'pointermove', 80, 60);
    await settle(element);
    pointer(card, 'pointerup', 80, 60);
    await settle(element);
    const afterDrag = calls();
    element.select({ kind: 'node', id: 'e' });
    await settle(element);
    expect(calls()).toBe(afterDrag);
  });
});
