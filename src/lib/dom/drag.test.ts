import type { ReactiveController, ReactiveControllerHost } from 'lit';

import { describe, expect, it, vi } from 'vitest';

import { DragController, formatDragData, parseDragData, placeWithin, type Drop } from './drag';

const fakeHost = (): ReactiveControllerHost & {
  controllers: ReactiveController[];
  requestUpdate: ReturnType<typeof vi.fn>;
} => {
  const controllers: ReactiveController[] = [];
  return {
    controllers,
    addController: (controller: ReactiveController) => {
      controllers.push(controller);
    },
    removeController: () => {},
    requestUpdate: vi.fn(),
    updateComplete: Promise.resolve(true),
  };
};

type FakeTransfer = {
  data: Record<string, string>;
  effectAllowed: string;
  dropEffect: string;
  setData(format: string, value: string): void;
  getData(format: string): string;
};

const transfer = (initial: Record<string, string> = {}): FakeTransfer => {
  return {
    data: { ...initial },
    effectAllowed: 'uninitialized',
    dropEffect: 'none',
    setData(format, value) {
      this.data[format] = value;
    },
    getData(format) {
      return this.data[format] ?? '';
    },
  };
};

const dragEvent = (
  overrides: Partial<{ dataTransfer: FakeTransfer | null; clientY: number; target: unknown }> = {},
) => {
  return {
    preventDefault: vi.fn(),
    dataTransfer: overrides.dataTransfer === undefined ? transfer() : overrides.dataTransfer,
    clientY: overrides.clientY ?? 0,
    target: overrides.target ?? null,
  } as unknown as DragEvent & { preventDefault: ReturnType<typeof vi.fn> };
};

describe('drag payload', () => {
  it('round-trips a typed item through the data transfer string', () => {
    expect(formatDragData({ type: 'story', id: 'u1' })).toBe('story:u1');
    expect(parseDragData('story:u1', 'story')).toEqual({ type: 'story', id: 'u1' });
    expect(parseDragData('milestone:mvp', 'story')).toEqual({ type: 'milestone', id: 'mvp' });
  });

  it('treats a bare string as an id of the expected type', () => {
    expect(parseDragData('u1', 'story')).toEqual({ type: 'story', id: 'u1' });
    expect(parseDragData('  u1 ', 'story')).toEqual({ type: 'story', id: 'u1' });
  });

  it('returns null for empty payloads', () => {
    expect(parseDragData('', 'story')).toBeNull();
    expect(parseDragData(undefined, 'story')).toBeNull();
    expect(parseDragData('story:', 'story')).toBeNull();
  });
});

describe('placeWithin', () => {
  it('splits an element at its vertical midpoint', () => {
    expect(placeWithin({ top: 100, height: 40 }, 110)).toBe('before');
    expect(placeWithin({ top: 100, height: 40 }, 120)).toBe('before');
    expect(placeWithin({ top: 100, height: 40 }, 121)).toBe('after');
  });
});

/** The `dragging` state lands a task after `dragstart` (see `DragController.source`). */
const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

describe('DragController', () => {
  it('registers itself with the host and starts idle', () => {
    const host = fakeHost();
    const drag = new DragController<'story' | 'milestone'>(host);
    expect(host.controllers).toContain(drag);
    expect(drag.state).toEqual({ kind: 'idle' });
    expect(drag.item).toBeNull();
    expect(drag.isDragging('story', 'u1')).toBe(false);
  });

  it('tracks the dragged item and writes the transfer payload on dragstart', async () => {
    const host = fakeHost();
    const drag = new DragController<'story' | 'milestone'>(host);
    const source = drag.source({ type: 'story', id: 'u1' });
    const event = dragEvent();
    source.dragstart(event);
    expect((event.dataTransfer as unknown as FakeTransfer).data['text/plain']).toBe('story:u1');
    expect((event.dataTransfer as unknown as FakeTransfer).effectAllowed).toBe('move');
    await settle();
    expect(drag.isDragging('story', 'u1')).toBe(true);
    expect(drag.isDragging('milestone', 'u1')).toBe(false);
    expect(host.requestUpdate).toHaveBeenCalledTimes(1);
    source.dragend();
    expect(drag.state).toEqual({ kind: 'idle' });
  });

  it('does not re-render inside dragstart: the browser still has to snapshot and hit-test the source', async () => {
    const host = fakeHost();
    const drag = new DragController<'story'>(host);
    const source = drag.source({ type: 'story', id: 'u1' });
    source.dragstart(dragEvent());
    expect(drag.state).toEqual({ kind: 'idle' });
    expect(host.requestUpdate).not.toHaveBeenCalled();
    // a drag the browser aborts right away ends before the state ever lands
    source.dragend();
    await settle();
    expect(drag.state).toEqual({ kind: 'idle' });
    expect(host.requestUpdate).not.toHaveBeenCalled();
  });

  it('highlights a target only for the item type it accepts', async () => {
    const host = fakeHost();
    const drag = new DragController<'story' | 'milestone'>(host);
    drag.source({ type: 'milestone', id: 'mvp' }).dragstart(dragEvent());
    await settle();
    const cell = drag.target({ key: 'cell:s1', accepts: 'story', onDrop: vi.fn() });
    const row = drag.target({ key: 'row:v1', accepts: 'milestone', onDrop: vi.fn() });

    const enterCell = dragEvent();
    cell.dragenter(enterCell);
    expect(enterCell.preventDefault).not.toHaveBeenCalled();
    expect(drag.isOver('cell:s1')).toBe(false);

    const enterRow = dragEvent();
    row.dragenter(enterRow);
    expect(enterRow.preventDefault).toHaveBeenCalled();
    expect(drag.isOver('row:v1')).toBe(true);

    const over = dragEvent();
    row.dragover(over);
    expect((over.dataTransfer as unknown as FakeTransfer).dropEffect).toBe('move');

    row.dragleave();
    expect(drag.isOver('row:v1')).toBe(false);
  });

  it('accepts an unknown drag (started outside this host) until the drop reveals its type', () => {
    const host = fakeHost();
    const drag = new DragController<'story' | 'milestone'>(host);
    const onDrop = vi.fn();
    const cell = drag.target({ key: 'cell:s1', accepts: 'story', onDrop });
    const enter = dragEvent();
    cell.dragenter(enter);
    expect(enter.preventDefault).toHaveBeenCalled();
    expect(drag.isOver('cell:s1')).toBe(true);
    const over = dragEvent();
    cell.dragover(over);
    expect(over.preventDefault).toHaveBeenCalled();
    expect(drag.item).toBeNull();
    cell.dragleave();
    expect(drag.state).toEqual({ kind: 'idle' });
    // a milestone payload landing on a story cell is ignored
    cell.drop(dragEvent({ dataTransfer: transfer({ 'text/plain': 'milestone:mvp' }) }));
    expect(onDrop).not.toHaveBeenCalled();
    // a bare id is read as the accepted type
    cell.drop(dragEvent({ dataTransfer: transfer({ 'text/plain': 'u1' }) }));
    expect(onDrop).toHaveBeenCalledTimes(1);
    const drop = onDrop.mock.calls[0]![0] as Drop<'story'>;
    expect(drop.item).toEqual({ type: 'story', id: 'u1' });
    expect(drop.hoveredId).toBeNull();
    expect(drop.place).toBe('end');
    expect(drag.state).toEqual({ kind: 'idle' });
  });

  it('resolves the hovered element and the before/after placement on drop', async () => {
    const host = fakeHost();
    const drag = new DragController<'story'>(host);
    drag.source({ type: 'story', id: 'u2' }).dragstart(dragEvent({ dataTransfer: null }));
    await settle();
    const onDrop = vi.fn();
    const hoveredElement = { getBoundingClientRect: () => ({ top: 100, height: 40 }) } as unknown as Element;
    const cell = drag.target({
      key: 'cell:s1',
      accepts: 'story',
      hovered: () => ({ id: 'u1', element: hoveredElement }),
      onDrop,
    });
    const event = dragEvent({ dataTransfer: null, clientY: 105 });
    cell.drop(event);
    expect(event.preventDefault).toHaveBeenCalled();
    // no transfer payload: the controller's own item is used
    expect(onDrop).toHaveBeenCalledWith(
      expect.objectContaining({ item: { type: 'story', id: 'u2' }, hoveredId: 'u1', place: 'before' }),
    );
  });

  it('clears everything when the host disconnects', async () => {
    const host = fakeHost();
    const drag = new DragController<'story'>(host);
    drag.source({ type: 'story', id: 'u1' }).dragstart(dragEvent());
    await settle();
    drag.target({ key: 'k', accepts: 'story', onDrop: vi.fn() }).dragenter(dragEvent());
    drag.hostDisconnected();
    expect(drag.state).toEqual({ kind: 'idle' });
  });
});
