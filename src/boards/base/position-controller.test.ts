import type { ReactiveController, ReactiveControllerHost } from 'lit';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { nearestPageName, PositionController } from './position-controller';

class FakeHost implements ReactiveControllerHost {
  readonly updateComplete = Promise.resolve(true);
  requestUpdateCount = 0;
  addController(_controller: ReactiveController): void {
    /* not needed: the controller under test is wired directly */
  }
  removeController(_controller: ReactiveController): void {
    /* unused */
  }
  requestUpdate(): void {
    this.requestUpdateCount += 1;
  }
}

const makeController = (host: FakeHost, element: Element, diagram = 'd'): PositionController => {
  const controller = new PositionController(host, { host: () => element, diagram: () => diagram });
  controller.hostConnected();
  return controller;
};

describe('nearestPageName', () => {
  it('reads the nearest ancestor page name', () => {
    document.body.innerHTML = '<dpk-page name="scope"><section><span id="target"></span></section></dpk-page>';
    const target = document.getElementById('target');
    expect(target && nearestPageName(target)).toBe('scope');
  });

  it('is empty outside any page (an embedded board)', () => {
    document.body.innerHTML = '<div><span id="lone"></span></div>';
    const target = document.getElementById('lone');
    expect(target && nearestPageName(target)).toBe('');
  });
});

describe('PositionController', () => {
  let element: Element;

  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '<div id="host"></div>';
    element = document.getElementById('host') as Element;
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('starts with no overrides', () => {
    const controller = makeController(new FakeHost(), element);
    expect(controller.hasOverrides()).toBe(false);
    expect(controller.overrides().size).toBe(0);
  });

  it('commits a dragged node and persists it across a fresh controller', () => {
    const host = new FakeHost();
    const controller = makeController(host, element);
    controller.commit('a', { x: 10, y: 20 });
    expect(controller.overrides().get('a')).toEqual({ x: 10, y: 20 });
    expect(host.requestUpdateCount).toBeGreaterThan(0);

    const reloaded = makeController(new FakeHost(), element);
    expect(reloaded.overrides().get('a')).toEqual({ x: 10, y: 20 });
  });

  it('prunes overrides for nodes no longer in the diagram, keeping the rest', () => {
    const controller = makeController(new FakeHost(), element);
    controller.commit('gone', { x: 1, y: 1 });
    controller.commit('kept', { x: 2, y: 2 });
    controller.prune(new Set(['kept']));
    expect(controller.overrides().get('gone')).toBeUndefined();
    expect(controller.overrides().get('kept')).toEqual({ x: 2, y: 2 });
  });

  it('resets just this diagram, leaving other diagrams and boards alone', () => {
    const controller = makeController(new FakeHost(), element, 'diagram-a');
    controller.commit('a', { x: 10, y: 20 });
    const other = makeController(new FakeHost(), element, 'diagram-b');
    other.commit('b', { x: 1, y: 1 });

    controller.reset();

    expect(controller.hasOverrides()).toBe(false);
    expect(other.overrides().get('b')).toEqual({ x: 1, y: 1 });
  });

  it('is a no-op when resetting a diagram with nothing moved', () => {
    const host = new FakeHost();
    const controller = makeController(host, element);
    controller.reset();
    expect(host.requestUpdateCount).toBe(0);
  });

  it('commits several nodes at once, as one persisted change', () => {
    const host = new FakeHost();
    const controller = makeController(host, element);
    controller.commitMany(
      new Map([
        ['a', { x: 1, y: 2 }],
        ['b', { x: 3, y: 4 }],
      ]),
    );
    expect(controller.overrides().get('a')).toEqual({ x: 1, y: 2 });
    expect(controller.overrides().get('b')).toEqual({ x: 3, y: 4 });

    const reloaded = makeController(new FakeHost(), element);
    expect(reloaded.overrides().get('a')).toEqual({ x: 1, y: 2 });
    expect(reloaded.overrides().get('b')).toEqual({ x: 3, y: 4 });
  });

  it('picks up another instance of the same diagram committing a move', () => {
    const a = makeController(new FakeHost(), element);
    const b = makeController(new FakeHost(), element);
    a.commit('shared', { x: 7, y: 8 });
    expect(b.overrides().get('shared')).toEqual({ x: 7, y: 8 });
  });

  it('keeps overrides scoped to this diagram id', () => {
    const controller = makeController(new FakeHost(), element, 'diagram-a');
    controller.commit('n', { x: 1, y: 1 });
    const other = makeController(new FakeHost(), element, 'diagram-b');
    expect(other.overrides().size).toBe(0);
  });

  it('resolves the board and diagram at commit time, then reloads the same scope', () => {
    document.body.innerHTML = '<div board="catalog"><div id="host"></div></div>';
    element = document.getElementById('host') as Element;
    let diagram = '';
    const controller = new PositionController(new FakeHost(), { host: () => element, diagram: () => diagram });
    controller.hostConnected();
    diagram = 'order-lifecycle';
    controller.commit('pending', { x: 144, y: 134 });

    const reloaded = new PositionController(new FakeHost(), { host: () => element, diagram: () => diagram });
    reloaded.hostConnected();
    expect(reloaded.overrides().get('pending')).toEqual({ x: 144, y: 134 });
  });
});
