import { afterEach, describe, expect, it } from 'vitest';

import { DpkBoardArchitectureMap } from '../../src/boards/architecture-map/element';
import { defineArchitectureMap } from '../../src/boards/architecture-map/index';
import { parseArchitectureData } from '../../src/boards/architecture-map/model';
import { DpkBoardBpmn } from '../../src/boards/bpmn/element';
import { defineBpmn } from '../../src/boards/bpmn/index';
import { parseBpmnData } from '../../src/boards/bpmn/model';
import { DpkBoardDependencyGraph } from '../../src/boards/dependency-graph/element';
import { defineDependencyGraph } from '../../src/boards/dependency-graph/index';
import { parseDependencyData } from '../../src/boards/dependency-graph/model';
import { DpkBoardSequenceDiagram } from '../../src/boards/sequence-diagram/element';
import { defineSequenceDiagram } from '../../src/boards/sequence-diagram/index';
import { parseSequenceData } from '../../src/boards/sequence-diagram/model';
import { DpkBoardStateDiagram } from '../../src/boards/state-diagram/element';
import { defineStateDiagram } from '../../src/boards/state-diagram/index';
import { parseStateData } from '../../src/boards/state-diagram/model';

/**
 * Every board that draws with `src/boards/base/edge` colours its line, its
 * inline arrowhead and its flow from one `--d-edge-line`. A state can set that
 * property on a rule that loses the stroke (a base `.d-edge.is-selected
 * .d-edge-path` of equal specificity wins it), leaving the line a different
 * colour from its head — the regression this guards. Checked here, not in a
 * board's own tests, because a board may not import another (see
 * `dev/lints/conventions.js`).
 */

defineStateDiagram();
defineDependencyGraph();
defineArchitectureMap();
defineSequenceDiagram();
defineBpmn();

const settle = async (element: { updateComplete: Promise<unknown> }): Promise<void> => {
  for (let index = 0; index < 3; index++) await element.updateComplete;
};

const append = <T extends HTMLElement>(element: T): T => {
  document.body.append(element);
  return element;
};

const read = (group: Element, lineSelector = '.d-edge-path'): { line: string; head: string } => ({
  line: getComputedStyle(group.querySelector(lineSelector)!).stroke,
  head: getComputedStyle(group.querySelector('.d-edge-end [data-paint="line"]')!).fill,
});

afterEach(() => {
  document.body.replaceChildren();
});

describe('edge line and arrowhead colours', () => {
  it('state diagram: line and head match, at rest and selected', async () => {
    const element = append(new DpkBoardStateDiagram());
    element.data = parseStateData({
      states: [
        { id: 'a', name: 'A', position: { x: 0, y: 0 } },
        { id: 'b', name: 'B', position: { x: 300, y: 0 } },
      ],
      transitions: [{ id: 'a-b', from: 'a', to: 'b', title: 'go' }],
    });
    await settle(element);
    const group = (): Element =>
      element.renderRoot.querySelector('.state-edge.is-selected') ?? element.renderRoot.querySelector('.state-edge')!;
    expect(read(group())).toMatchObject({ line: expect.any(String) });
    const rest = read(group());
    expect(rest.line).toBe(rest.head);
    element.select({ kind: 'edge', id: 'a-b' });
    await settle(element);
    const selected = read(group());
    expect(selected.line).toBe(selected.head);
  });

  it('dependency graph: line and head match, at rest and selected', async () => {
    const element = append(new DpkBoardDependencyGraph());
    element.data = parseDependencyData({
      modules: [
        { id: 'a', name: 'A' },
        { id: 'b', name: 'B' },
      ],
      dependencies: [{ id: 'a-b', from: 'a', to: 'b' }],
    });
    await settle(element);
    const group = (): Element => element.renderRoot.querySelector('[data-dependency="a-b"]')!;
    const rest = read(group());
    expect(rest.line).toBe(rest.head);
    element.select({ kind: 'edge', id: 'a-b' });
    await settle(element);
    const selected = read(group());
    expect(selected.line).toBe(selected.head);
  });

  it('architecture map: line and head match, at rest and selected', async () => {
    const element = append(new DpkBoardArchitectureMap());
    element.data = parseArchitectureData({
      services: [
        { id: 'a', name: 'A', position: { x: 0, y: 0 } },
        { id: 'b', name: 'B', position: { x: 300, y: 0 } },
      ],
      links: [{ id: 'a-b', from: 'a', to: 'b', label: 'x' }],
    });
    await settle(element);
    const group = (): Element => element.renderRoot.querySelector('[data-link="a-b"]')!;
    const rest = read(group());
    expect(rest.line).toBe(rest.head);
    element.select({ kind: 'edge', id: 'a-b' });
    await settle(element);
    const selected = read(group());
    expect(selected.line).toBe(selected.head);
  });

  it('BPMN sequence flow: line and head match, at rest and selected', async () => {
    const element = append(new DpkBoardBpmn());
    element.data = parseBpmnData({
      pools: [
        { id: 'p', name: 'P', lanes: [{ id: 'l', name: 'L' }] },
        { id: 'q', name: 'Q', lanes: [{ id: 'm', name: 'M' }] },
      ],
      nodes: [
        { id: 'a', kind: 'task', lane: 'l', name: 'A' },
        { id: 'b', kind: 'task', lane: 'l', name: 'B' },
        { id: 'c', kind: 'task', lane: 'm', name: 'C' },
      ],
      flows: [
        { id: 'f', from: 'a', to: 'b' },
        { id: 'msg', kind: 'message', from: 'a', to: 'c', name: 'M' },
      ],
    });
    await settle(element);
    const group = (): Element => element.renderRoot.querySelector('[data-flow="f"]')!;
    const readBpmn = (target: Element): { line: string; head: string } => ({
      line: getComputedStyle(target.querySelector('.d-edge-path')!).stroke,
      head: getComputedStyle(target.querySelector('.d-edge-end')!).stroke,
    });
    const rest = readBpmn(group());
    expect(rest.line).toBe(rest.head);
    element.select({ kind: 'edge', id: 'f' });
    await settle(element);
    const selected = readBpmn(group());
    expect(selected.line).toBe(selected.head);
    expect(selected.line).toContain('#3563d9');
  });

  it('BPMN message flow: line and head match, at rest and selected', async () => {
    const element = append(new DpkBoardBpmn());
    element.data = parseBpmnData({
      pools: [
        { id: 'p', name: 'P', lanes: [{ id: 'l', name: 'L' }] },
        { id: 'q', name: 'Q', lanes: [{ id: 'm', name: 'M' }] },
      ],
      nodes: [
        { id: 'a', kind: 'task', lane: 'l', name: 'A' },
        { id: 'c', kind: 'task', lane: 'm', name: 'C' },
      ],
      flows: [{ id: 'msg', kind: 'message', from: 'a', to: 'c', name: 'M' }],
    });
    await settle(element);
    const group = (): Element => element.renderRoot.querySelector('[data-flow="msg"]')!;
    const readBpmn = (target: Element): { line: string; head: string } => ({
      line: getComputedStyle(target.querySelector('.d-edge-path')!).stroke,
      head: getComputedStyle(target.querySelector('.d-edge-end')!).stroke,
    });
    const rest = readBpmn(group());
    expect(rest.line).toBe(rest.head);
    element.select({ kind: 'edge', id: 'msg' });
    await settle(element);
    const selected = readBpmn(group());
    expect(selected.line).toBe(selected.head);
    expect(selected.line).toContain('#3563d9');
  });

  it('sequence diagram: line and head match, at rest and selected', async () => {
    const element = append(new DpkBoardSequenceDiagram());
    element.data = parseSequenceData({
      participants: [
        { id: 'ui', name: 'UI' },
        { id: 'api', name: 'API' },
      ],
      items: [{ kind: 'message', id: 'req', from: 'ui', to: 'api', title: 'request' }],
    });
    await settle(element);
    const group = (): Element => element.renderRoot.querySelector('[data-message="req"]')!;
    const rest = read(group(), '.sequence-message');
    expect(rest.line).toBe(rest.head);
    element.select({ kind: 'message', id: 'req' });
    await settle(element);
    const selected = read(group(), '.sequence-message');
    expect(selected.line).toBe(selected.head);
  });
});
