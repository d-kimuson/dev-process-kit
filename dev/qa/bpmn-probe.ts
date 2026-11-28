#!/usr/bin/env node
/**
 * Readability probe for `dpk-board-bpmn`, against the built bundle on the
 * sample origin. It measures what is drawn — `el.layout` routes and boxes, the
 * DOM boxes of elements and labels, the rendered paths and the computed
 * colours — and fails when a gate or a contrast floor is broken.
 *
 * Gates (each must count 0), on the sample page and on the chaos stress
 * fixture, in light and dark:
 * - `through`     a segment runs through a node
 * - `outline`     an end is more than 1px off its node's outline
 * - `inLane`      a node is outside its lane band
 * - `poolLeak`    a sequence flow leaves its pool
 * - `lane`        two flows run along one lane
 * - `touch`       two flows meet end to end on one line
 * - `gatewaySide` a gateway is entered from the side away from its source
 * - `jog`         a run between two bends is shorter than 12px, or diagonal
 * - `labelNode`   a label lies over a node
 * - `labelLabel`  two labels overlap
 * - `labelLine`   a flow label lies over another flow's line
 * - `labelArrow`  a label lies over an end glyph
 * - `drawn`       a rendered path or node is not where the layout says
 * - `smallText`   text below 11px at 100% zoom
 *
 * Contrast floors: text 4.5:1, lines/glyphs/frames 3:1.
 *
 * AGENT_BROWSER_SESSION must name an isolated browser session.
 * Usage: node dev/qa/bpmn-probe.ts <lp-url> [--shots <dir>]
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import * as v from 'valibot';

const base = process.argv[2];
const session = process.env['AGENT_BROWSER_SESSION'];
if (!base || !session) throw new Error('Provide the lp URL and AGENT_BROWSER_SESSION');
const shotsAt = process.argv.indexOf('--shots');
const shots = shotsAt < 0 ? null : (process.argv[shotsAt + 1] ?? null);
if (shots !== null) mkdirSync(shots, { recursive: true });

const ab = (...args: string[]): string =>
  execFileSync('pnpm', ['exec', 'agent-browser', '--session', session, '--headed', 'false', ...args], {
    encoding: 'utf8',
  }).trim();

const evaluate = <const TSchema extends v.GenericSchema>(
  schema: TSchema,
  expression: string,
): v.InferOutput<TSchema> => {
  const printed: unknown = JSON.parse(ab('eval', expression));
  if (typeof printed !== 'string') return v.parse(schema, printed);
  try {
    return v.parse(schema, JSON.parse(printed));
  } catch {
    return v.parse(schema, printed);
  }
};

const BOARD = "document.querySelector('dpk-board-bpmn')";

const settle = `new Promise((resolve) => {
  const started = Date.now();
  const check = () => {
    const el = ${BOARD};
    if (el?.layout && el.shadowRoot?.querySelector('[data-node]')) {
      requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(() => resolve('"ready"'), 450)));
    } else if (Date.now() - started > 15000) resolve('"timeout"');
    else setTimeout(check, 100);
  };
  check();
})`;

const gates = `(() => {
  const el = ${BOARD};
  const root = el.shadowRoot;
  const { nodes, routes, width } = el.layout;
  const edges = el.visible.edges;
  const domains = new Map(el.visible.nodes.map((node) => [node.id, node]));
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const routeOf = new Map(routes.map((route) => [route.id, route.points]));
  const bands = el.bands;
  const laneOf = new Map(bands.pools.flatMap((pool) => pool.lanes.map((lane) => [lane.id, { lane, pool }])));
  const poolOf = new Map(bands.pools.map((pool) => [pool.id, pool]));
  const count = { through: 0, outline: 0, inLane: 0, poolLeak: 0, lane: 0, crowd: 0, touch: 0, gatewaySide: 0, frameHug: 0, borderRun: 0, jog: 0, labelNode: 0, nodeLabelLine: 0, labelLabel: 0, labelLine: 0, labelArrow: 0, drawn: 0, smallText: 0 };
  const notes = [];
  const note = (gate, text) => { count[gate]++; if (notes.length < 18) notes.push(gate + ': ' + text); };
  const segmentsOf = (points) => points.slice(1).map((point, index) => [points[index], point]);
  const inside = (p, box) => p.x > box.x + 0.01 && p.x < box.x + box.width - 0.01 && p.y > box.y + 0.01 && p.y < box.y + box.height - 0.01;
  const enters = ([a, b], box) =>
    Math.max(a.x, b.x) > box.x + 0.01 && Math.min(a.x, b.x) < box.x + box.width - 0.01 &&
    Math.max(a.y, b.y) > box.y + 0.01 && Math.min(a.y, b.y) < box.y + box.height - 0.01;
  const overlap = (a, b) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
  const close = (a, b) => Math.abs(a - b) <= 1.5;

  const onOutline = (node, placed, point) => {
    if (node === undefined) return true;
    const cx = placed.x + placed.width / 2, cy = placed.y + placed.height / 2;
    if (node.kind === 'event') {
      const rx = placed.width / 2, ry = placed.height / 2;
      return Math.abs(((point.x - cx) / rx) ** 2 + ((point.y - cy) / ry) ** 2 - 1) <= 0.14;
    }
    if (node.kind === 'gateway') {
      return Math.abs(Math.abs(point.x - cx) / (placed.width / 2) + Math.abs(point.y - cy) / (placed.height / 2) - 1) <= 0.14;
    }
    if (node.kind === 'annotation') return close(point.x, placed.x) && point.y >= placed.y - 1.5 && point.y <= placed.y + placed.height + 1.5;
    const nearX = close(point.x, placed.x) || close(point.x, placed.x + placed.width);
    const nearY = close(point.y, placed.y) || close(point.y, placed.y + placed.height);
    const inX = point.x >= placed.x - 1.5 && point.x <= placed.x + placed.width + 1.5;
    const inY = point.y >= placed.y - 1.5 && point.y <= placed.y + placed.height + 1.5;
    return (nearX && inY) || (nearY && inX);
  };

  for (const edge of edges) {
    const points = routeOf.get(edge.id);
    if (!points || points.length < 2) { note('outline', edge.id + ' has no route'); continue; }
    const fromNode = domains.get(edge.from);
    const toNode = domains.get(edge.to);
    if (fromNode !== undefined && !onOutline(fromNode, byId.get(edge.from), points[0])) note('outline', edge.id + ' start');
    if (toNode !== undefined && !onOutline(toNode, byId.get(edge.to), points.at(-1))) note('outline', edge.id + ' end');
    for (const segment of segmentsOf(points)) {
      const [a, b] = segment;
      if (a.x !== b.x && a.y !== b.y) note('jog', edge.id + ' diagonal');
      if (Math.abs(b.x - a.x) + Math.abs(b.y - a.y) < 12) note('jog', edge.id + ' ' + JSON.stringify(segment));
      for (const box of nodes) if (enters(segment, box)) note('through', edge.id + ' through ' + box.id);
    }
    if (edge.kind === 'sequence') {
      const pool = poolOf.get(fromNode?.pool);
      if (pool) {
        for (const point of points) {
          if (point.y < pool.y - 0.5 || point.y > pool.y + pool.height + 0.5 || point.x < -0.5 || point.x > width + 0.5)
            note('poolLeak', edge.id + ' ' + JSON.stringify(point));
        }
      }
    }
  }

  for (const node of el.visible.nodes) {
    const placed = byId.get(node.id);
    if (!placed) continue;
    const band = node.lane === null ? undefined : laneOf.get(node.lane);
    if (band && (placed.y < band.lane.y - 0.5 || placed.y + placed.height > band.lane.y + band.lane.height + 0.5))
      note('inLane', node.id);
  }

  const LANE = 4;
  const run = ([a, b], [c, d]) => {
    if (a.x === b.x && c.x === d.x && Math.abs(a.x - c.x) < LANE)
      return Math.min(Math.max(a.y, b.y), Math.max(c.y, d.y)) - Math.max(Math.min(a.y, b.y), Math.min(c.y, d.y));
    if (a.y === b.y && c.y === d.y && Math.abs(a.y - c.y) < LANE)
      return Math.min(Math.max(a.x, b.x), Math.max(c.x, d.x)) - Math.max(Math.min(a.x, b.x), Math.min(c.x, d.x));
    return 0;
  };
  for (let i = 0; i < edges.length; i++) {
    for (let j = i + 1; j < edges.length; j++) {
      const first = routeOf.get(edges[i].id);
      const second = routeOf.get(edges[j].id);
      if (!first || !second) continue;
      for (const a of segmentsOf(first)) for (const b of segmentsOf(second)) if (run(a, b) > 1) note('lane', edges[i].id + ' / ' + edges[j].id);
    }
  }

  // Two collinear runs that only touch (or nearly do) read as one stroke.
  for (let i = 0; i < edges.length; i++) {
    for (let j = i + 1; j < edges.length; j++) {
      const first = routeOf.get(edges[i].id);
      const second = routeOf.get(edges[j].id);
      if (!first || !second) continue;
      for (const a of segmentsOf(first)) for (const b of segmentsOf(second)) {
        const [p, q] = a;
        const [r, s] = b;
        const vertical = p.x === q.x && r.x === s.x;
        const horizontal = p.y === q.y && r.y === s.y;
        if (!vertical && !horizontal) continue;
        const at = vertical ? p.x : p.y;
        const other = vertical ? r.x : r.y;
        if (Math.abs(at - other) >= 1.5) continue;
        const lo = vertical ? Math.max(Math.min(p.y, q.y), Math.min(r.y, s.y)) : Math.max(Math.min(p.x, q.x), Math.min(r.x, s.x));
        const hi = vertical ? Math.min(Math.max(p.y, q.y), Math.max(r.y, s.y)) : Math.min(Math.max(p.x, q.x), Math.max(r.x, s.x));
        const gap = lo - hi;
        if (gap >= -0.5 && gap <= 2.5) note('touch', edges[i].id + ' / ' + edges[j].id + ' gap=' + gap.toFixed(1));
      }
    }
  }

  // A sequence flow enters a gateway from the side facing its source when
  // that side is free; entering from the opposite side means it climbed over.
  const sideAt = (target, point) => {
    if (Math.abs(point.x - target.x) <= 1.5) return 'left';
    if (Math.abs(point.x - (target.x + target.width)) <= 1.5) return 'right';
    if (Math.abs(point.y - target.y) <= 1.5) return 'top';
    if (Math.abs(point.y - (target.y + target.height)) <= 1.5) return 'bottom';
    return null;
  };
  for (const edge of edges) {
    if (edge.kind !== 'sequence') continue;
    const target = byId.get(edge.to);
    const source = byId.get(edge.from);
    const domain = domains.get(edge.to);
    if (target === undefined || source === undefined || domain?.kind !== 'gateway') continue;
    const dx = source.x + source.width / 2 - (target.x + target.width / 2);
    const dy = source.y + source.height / 2 - (target.y + target.height / 2);
    const preferred = Math.abs(dx) >= Math.abs(dy) ? (dx >= 0 ? 'right' : 'left') : dy >= 0 ? 'bottom' : 'top';
    const points = routeOf.get(edge.id);
    const actual = points === undefined ? null : sideAt(target, points.at(-1));
    if (actual === null || actual === preferred) continue;
    const occupied = edges.some((other) => {
      if (other.id === edge.id || other.kind !== 'sequence' || other.to !== edge.to) return false;
      const otherPoints = routeOf.get(other.id);
      return otherPoints !== undefined && sideAt(target, otherPoints.at(-1)) === preferred;
    });
    if (!occupied) note('gatewaySide', edge.id + ' enters ' + edge.to + ' from ' + actual + ', source ' + preferred);
  }

  // Two parallel runs closer than 16px read as one corridor.
  for (let i = 0; i < edges.length; i++) {
    for (let j = i + 1; j < edges.length; j++) {
      const first = routeOf.get(edges[i].id);
      const second = routeOf.get(edges[j].id);
      if (!first || !second) continue;
      for (const a of segmentsOf(first)) for (const b of segmentsOf(second)) {
        const [p, q] = a;
        const [r, s] = b;
        const parallel = (p.x === q.x && r.x === s.x) || (p.y === q.y && r.y === s.y);
        if (!parallel) continue;
        const at = p.x === q.x ? p.x : p.y;
        const other = r.x === s.x ? r.x : r.y;
        const lo = p.x === q.x ? Math.max(Math.min(p.y, q.y), Math.min(r.y, s.y)) : Math.max(Math.min(p.x, q.x), Math.min(r.x, s.x));
        const hi = p.x === q.x ? Math.min(Math.max(p.y, q.y), Math.max(r.y, s.y)) : Math.min(Math.max(p.x, q.x), Math.max(r.x, s.x));
        if (Math.abs(at - other) < 16 && hi - lo > 12) note('crowd', edges[i].id + ' / ' + edges[j].id + ' d=' + Math.abs(at - other).toFixed(1));
      }
    }
  }

  // A run parallel to a node border, lane border or pool frame, within 6px.
  const nodeBorders = nodes.flatMap((node) => [
    { horizontal: true, at: node.y, lo: node.x, hi: node.x + node.width, id: node.id },
    { horizontal: true, at: node.y + node.height, lo: node.x, hi: node.x + node.width, id: node.id },
    { horizontal: false, at: node.x, lo: node.y, hi: node.y + node.height, id: node.id },
    { horizontal: false, at: node.x + node.width, lo: node.y, hi: node.y + node.height, id: node.id },
  ]);
  const frameBorders = bands.pools.flatMap((pool) =>
    [pool, ...pool.lanes].flatMap((band) => [
      { horizontal: true, at: band.y, lo: 0, hi: width, id: band.id },
      { horizontal: true, at: band.y + band.height, lo: 0, hi: width, id: band.id },
      { horizontal: false, at: 0, lo: band.y, hi: band.y + band.height, id: band.id },
      { horizontal: false, at: width, lo: band.y, hi: band.y + band.height, id: band.id },
    ]),
  );
  for (const edge of edges) {
    const points = routeOf.get(edge.id);
    if (!points) continue;
    for (const segment of segmentsOf(points)) {
      const [p, q] = segment;
      if (p.x !== q.x && p.y !== q.y) continue;
      const horizontal = p.y === q.y;
      const at = horizontal ? p.y : p.x;
      const lo = horizontal ? Math.min(p.x, q.x) : Math.min(p.y, q.y);
      const hi = horizontal ? Math.max(p.x, q.x) : Math.max(p.y, q.y);
      for (const border of nodeBorders) {
        if (border.horizontal !== horizontal) continue;
        if (Math.abs(at - border.at) >= 6) continue;
        if (Math.min(hi, border.hi) - Math.max(lo, border.lo) > 4) note('borderRun', edge.id + ' beside ' + border.id);
      }
      for (const border of frameBorders) {
        if (border.horizontal !== horizontal) continue;
        if (Math.abs(at - border.at) >= 6) continue;
        if (Math.min(hi, border.hi) - Math.max(lo, border.lo) > 4) note('frameHug', edge.id + ' beside ' + border.id);
      }
    }
  }

  const svg = root.querySelector('.diagram-edges').getBoundingClientRect();
  const sample = root.querySelector('[data-node]');
  const scale = sample.getBoundingClientRect().width / byId.get(sample.dataset.node).width;
  const toLayout = (rect) => ({ x: (rect.left - svg.left) / scale, y: (rect.top - svg.top) / scale, width: rect.width / scale, height: rect.height / scale });
  const off = (a, b) => Math.abs(a - b) > 1.6;
  for (const button of root.querySelectorAll('[data-node]')) {
    const rect = toLayout(button.getBoundingClientRect());
    const box = byId.get(button.dataset.node);
    if (off(rect.x, box.x) || off(rect.y, box.y) || off(rect.width, box.width) || off(rect.height, box.height))
      note('drawn', 'node ' + box.id);
  }
  const paths = root.querySelectorAll('[data-flow]');
  for (const group of paths) {
    const path = group.querySelector('.d-edge-path');
    const points = routeOf.get(group.dataset.flow);
    const start = path.getPointAtLength(0);
    const end = path.getPointAtLength(path.getTotalLength());
    // An end glyph trims its line by its own footprint (up to a hollow arrow's
    // 12px), so the stroke stops short of the routed endpoint by that much.
    const near = (a, b) => Math.hypot(a.x - b.x, a.y - b.y) <= 16;
    if (!near(start, points[0]) || !near(end, points.at(-1))) note('drawn', 'path ' + group.dataset.flow);
  }
  if (paths.length !== edges.length) note('drawn', 'flow count ' + paths.length + ' of ' + edges.length);

  const labels = [];
  for (const button of root.querySelectorAll('[data-flow-label]')) {
    const flow = edges.find((edge) => edge.id === button.dataset.flowLabel);
    if (!flow) continue;
    const box = toLayout(button.getBoundingClientRect());
    labels.push({ id: 'flow ' + flow.id, box, own: flow.id, kind: 'flow' });
    if (button.scrollWidth > button.clientWidth + 1) note('drawn', 'clipped label ' + flow.id);
  }
  for (const button of root.querySelectorAll('[data-node-label]')) {
    const node = domains.get(button.dataset.nodeLabel);
    if (!node) continue;
    labels.push({ id: 'node label ' + node.id, box: toLayout(button.getBoundingClientRect()), own: null, kind: 'node' });
  }
  const expectedFlowLabels = edges.filter((edge) => edge.label !== null && edge.label !== '').length;
  if (labels.filter((label) => label.kind === 'flow').length !== expectedFlowLabels)
    note('drawn', 'flow label count ' + labels.filter((label) => label.kind === 'flow').length + ' of ' + expectedFlowLabels);
  const expectedNodeLabels = el.visible.nodes.filter((node) => (node.kind === 'event' || node.kind === 'gateway' || node.kind === 'dataObject') && node.name).length;
  if (labels.filter((label) => label.kind === 'node').length !== expectedNodeLabels)
    note('drawn', 'node label count ' + labels.filter((label) => label.kind === 'node').length + ' of ' + expectedNodeLabels);

  for (const [index, label] of labels.entries()) {
    if (label.kind === 'node') {
      for (const edge of edges) {
        const points = routeOf.get(edge.id);
        if (!points) continue;
        if (segmentsOf(points).some((segment) => {
          const [a, b] = segment;
          const x1 = Math.min(a.x, b.x), x2 = Math.max(a.x, b.x), y1 = Math.min(a.y, b.y), y2 = Math.max(a.y, b.y);
          return label.box.x < x2 + 0.5 && label.box.x + label.box.width > x1 - 0.5 && label.box.y < y2 + 0.5 && label.box.y + label.box.height > y1 - 0.5;
        })) note('nodeLabelLine', label.id + ' over ' + edge.id);
      }
    }
    for (const box of nodes) if (overlap(label.box, box)) note('labelNode', label.id + ' over ' + box.id);
    for (const other of labels.slice(index + 1)) if (overlap(label.box, other.box)) note('labelLabel', label.id + ' / ' + other.id);
    if (label.kind !== 'flow') continue;
    for (const edge of edges) {
      if (edge.id === label.own) continue;
      const points = routeOf.get(edge.id);
      if (!points) continue;
      if (segmentsOf(points).some((segment) => {
        const [a, b] = segment;
        const x1 = Math.min(a.x, b.x), x2 = Math.max(a.x, b.x), y1 = Math.min(a.y, b.y), y2 = Math.max(a.y, b.y);
        return label.box.x < x2 && label.box.x + label.box.width > x1 && label.box.y < y2 && label.box.y + label.box.height > y1;
      })) note('labelLine', label.id + ' over ' + edge.id);
    }
    for (const points of routes.map((route) => route.points)) {
      for (const end of [points[0], points.at(-1)]) {
        if (!end) continue;
        if (overlap(label.box, { x: end.x - 12, y: end.y - 12, width: 24, height: 24 })) note('labelArrow', label.id);
      }
    }
  }

  const seen = new Set();
  const measureText = (scope) => {
    const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
    for (let text = walker.nextNode(); text; text = walker.nextNode()) {
      const parent = text.parentElement;
      if (!parent || text.textContent.trim() === '' || seen.has(parent) || parent.closest('style, title, defs')) continue;
      seen.add(parent);
      if (parent.getClientRects().length === 0) continue;
      const size = parseFloat(getComputedStyle(parent).fontSize);
      if (size < 11) note('smallText', (parent.className || parent.tagName) + ' ' + size + 'px');
    }
    for (const host of scope.querySelectorAll('*')) if (host.shadowRoot) measureText(host.shadowRoot);
  };
  measureText(root);

  return JSON.stringify({ nodes: nodes.length, edges: edges.length, labels: labels.length, count, notes });
})()`;

const contrast = `(() => {
  const el = ${BOARD};
  const root = el.shadowRoot;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  const rgba = (color) => {
    context.clearRect(0, 0, 1, 1);
    context.fillStyle = '#000';
    context.fillStyle = color;
    context.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data;
    return a === 0 ? [0, 0, 0, 0] : [r, g, b, a / 255];
  };
  const over = (top, under) => {
    const a = top[3];
    return [0, 1, 2].map((i) => top[i] * a + under[i] * (1 - a)).concat(1);
  };
  const parentOf = (node) => node.parentElement ?? node.getRootNode().host ?? null;
  const backdrop = (element, includeSelf) => {
    const layers = [];
    for (let at = includeSelf ? element : parentOf(element); at; at = parentOf(at)) {
      const style = getComputedStyle(at);
      layers.push(rgba(style.backgroundColor));
    }
    const scheme = getComputedStyle(document.documentElement).colorScheme.includes('dark') ? [0, 0, 0, 1] : [255, 255, 255, 1];
    return layers.reduceRight((under, layer) => over(layer, under), scheme);
  };
  const luminance = (c) => {
    const [r, g, b] = c.slice(0, 3).map((v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const ratio = (a, b) => { const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };
  const hex = (c) => '#' + c.slice(0, 3).map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
  const rows = new Map();
  const add = (item, fg, bg, floor) => {
    const front = over(fg, bg);
    const value = ratio(front, bg);
    const known = rows.get(item);
    if (!known || value < known.ratio) rows.set(item, { item, fg: hex(front), bg: hex(bg), ratio: Math.round(value * 100) / 100, floor });
  };
  const live = (element) => !element.closest('.is-dimmed') && element.getClientRects().length > 0;

  const ground = backdrop(root.querySelector('.diagram-edges'), false);
  for (const group of root.querySelectorAll('[data-flow]')) {
    if (!live(group)) continue;
    const kind = group.classList.contains('is-message') ? 'message' : group.classList.contains('is-association') ? 'association' : 'sequence';
    const state = group.classList.contains('is-selected') ? 'selected' : group.classList.contains('is-related') ? 'related' : 'normal';
    const style = getComputedStyle(group.querySelector('.d-edge-path'));
    add('line ' + kind + ' @' + state, rgba(style.stroke), ground, 3);
    for (const end of group.querySelectorAll('.d-edge-end')) {
      const endStyle = getComputedStyle(end);
      const paint = end.querySelector('[data-paint="line"]');
      add('glyph ' + kind, rgba(paint ? getComputedStyle(paint).fill : endStyle.stroke), ground, 3);
    }
  }
  for (const node of root.querySelectorAll('[data-node]')) {
    if (!live(node)) continue;
    const kind = [...node.classList].find((name) => name.startsWith('is-')) ?? 'node';
    for (const part of node.querySelectorAll('.bpmn-shape .surface, .bpmn-shape .line')) {
      const style = getComputedStyle(part);
      add('node line ' + kind, rgba(style.stroke), backdrop(node, false), 3);
    }
    for (const part of node.querySelectorAll('.bpmn-task-label, .bpmn-annotation-text')) {
      add('text ' + part.className, rgba(getComputedStyle(part).color), backdrop(part, true), 4.5);
    }
  }
  for (const head of root.querySelectorAll('.bpmn-pool-head, .bpmn-lane-head')) {
    if (!live(head)) continue;
    add('text ' + head.className, rgba(getComputedStyle(head).color), backdrop(head, true), 4.5);
    add('frame ' + head.className, rgba(getComputedStyle(head).borderTopColor), ground, 3);
  }
  for (const frame of root.querySelectorAll('.bpmn-pool, .bpmn-lane')) {
    if (!live(frame)) continue;
    add('frame ' + frame.className, rgba(getComputedStyle(frame).borderTopColor), ground, 3);
  }
  for (const label of root.querySelectorAll('[data-flow-label], [data-node-label]')) {
    if (!live(label)) continue;
    add('text label ' + (label.dataset.flowLabel ? 'flow' : 'node'), rgba(getComputedStyle(label).color), backdrop(label, true), 4.5);
  }
  const stats = root.querySelector('.diagram-stats');
  if (stats) add('text stats', rgba(getComputedStyle(stats).color), backdrop(stats, true), 4.5);
  return JSON.stringify({ canvas: hex(ground), rows: [...rows.values()] });
})()`;

const gateReport = v.object({
  nodes: v.number(),
  edges: v.number(),
  labels: v.number(),
  count: v.record(v.string(), v.number()),
  notes: v.array(v.string()),
});
const contrastReport = v.object({
  canvas: v.string(),
  rows: v.array(v.object({ item: v.string(), fg: v.string(), bg: v.string(), ratio: v.number(), floor: v.number() })),
});
type ContrastRow = v.InferOutput<typeof contrastReport>['rows'][number];

const failures: string[] = [];

const checkGates = (label: string): void => {
  const report = evaluate(gateReport, gates);
  const summary = Object.entries(report.count)
    .map(([gate, value]) => `${gate}=${value}`)
    .join(' ');
  console.log(`[gates] ${label}: ${report.nodes} nodes, ${report.edges} flows, ${report.labels} labels — ${summary}`);
  if (Object.values(report.count).some((value) => value > 0)) {
    failures.push(`gates ${label}: ${summary}`);
    for (const note of report.notes) console.log(`    ${note}`);
  }
};

const contrastRows = new Map<string, Map<string, ContrastRow>>();
const checkContrast = (theme: string): void => {
  const report = evaluate(contrastReport, contrast);
  const rows = contrastRows.get(theme) ?? new Map<string, ContrastRow>();
  contrastRows.set(theme, rows);
  for (const row of report.rows) {
    const known = rows.get(row.item);
    if (known === undefined || row.ratio < known.ratio) rows.set(row.item, row);
  }
};

const pause = (): void => {
  ab(
    'eval',
    'new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(() => resolve(1), 350))))',
  );
};

const open = (url: string, theme: string, width: number, height: number): void => {
  ab('open', url);
  ab('eval', '(() => { localStorage.clear(); sessionStorage.clear(); return 1; })()');
  for (let attempt = 0; attempt < 3; attempt++) {
    ab('open', url);
    ab('set', 'viewport', String(width), String(height));
    ab('eval', `(() => { document.documentElement.dataset.theme = '${theme}'; return 1; })()`);
    if (evaluate(v.string(), settle) === 'ready') return;
  }
  throw new Error(`board did not render: ${url}`);
};

const shot = (name: string): void => {
  if (shots !== null) ab('screenshot', join(shots, `${name}.png`));
};

const click = (selector: string): void => {
  ab(
    'eval',
    `(() => { ${BOARD}.shadowRoot.querySelector(${JSON.stringify(selector)}).dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true })); return '"ok"'; })()`,
  );
  pause();
};

const classesOf = (selector: string): readonly string[] =>
  evaluate(
    v.array(v.string()),
    `JSON.stringify([...${BOARD}.shadowRoot.querySelector(${JSON.stringify(selector)}).classList])`,
  );

const expectClass = (selector: string, name: string, label: string): void => {
  if (classesOf(selector).includes(name)) console.log(`[interaction] PASS ${label}`);
  else failures.push(`interaction ${label}: ${selector} is not ${name}`);
};

const expectSelectedPaint = (flowId: string, label: string): void => {
  const paint = evaluate(
    v.object({ line: v.string(), head: v.string(), accent: v.string() }),
    `(() => {
      const group = ${BOARD}.shadowRoot.querySelector(${JSON.stringify(`[data-flow="${flowId}"]`)});
      const label = ${BOARD}.shadowRoot.querySelector('.bpmn-flow-label.is-selected');
      const accent = label ? getComputedStyle(label).borderColor : '';
      return JSON.stringify({
        line: getComputedStyle(group.querySelector('.d-edge-path')).stroke,
        head: getComputedStyle(group.querySelector('.d-edge-end')).stroke,
        accent,
      });
    })()`,
  );
  if (paint.line !== paint.head) failures.push(`interaction ${label}: line ${paint.line} != head ${paint.head}`);
  else if (paint.line !== paint.accent)
    failures.push(`interaction ${label}: line ${paint.line} != accent ${paint.accent}`);
  else console.log(`[interaction] PASS ${label}: line and head are ${paint.line}`);
};

const PAGES = [
  { name: 'sample', path: '/bpmn.html', viewport: [1440, 900], node: 'review', flow: 'f-confirm' },
  {
    name: 'stress',
    path: '/chaos/bpmn.html?fixture=stress',
    viewport: [3400, 1200],
    node: 'review',
    flow: 'f-decline',
  },
  { name: 'diagrams', path: '/diagrams.html', viewport: [1440, 900], node: 'review', flow: 'm3' },
] as const;

try {
  for (const page of PAGES) {
    for (const theme of ['light', 'dark']) {
      const url = `${base}${page.path}${page.path.includes('?') ? `&theme=${theme}` : `?theme=${theme}`}`;
      open(url, theme, page.viewport[0], page.viewport[1]);
      ab('eval', `${BOARD}.scrollIntoView({ block: 'center' }); 1`);
      pause();
      checkGates(`${page.name} ${theme}`);
      checkContrast(theme);
      shot(`${page.name}-${theme}`);
      click(`[data-node="${page.node}"]`);
      checkContrast(theme);
      shot(`${page.name}-${theme}-node-selected`);
      click(`[data-flow-label="${page.flow}"]`);
      expectSelectedPaint(page.flow, `${page.name} ${theme} selected flow paint`);
      checkContrast(theme);
      shot(`${page.name}-${theme}-flow-selected`);
    }
  }

  open(`${base}/bpmn.html`, 'light', 1440, 900);
  click('[data-node="review"]');
  expectClass('[data-node="review"]', 'is-selected', 'select: the clicked node is selected');
  expectClass('[data-flow="f-start"]', 'is-related', 'select: an incoming flow is related');
  expectClass('[data-flow="f-done"]', 'is-dimmed', 'select: an unrelated flow is dimmed');
  click('[data-flow-label="f-confirm"]');
  expectClass('[data-flow="f-confirm"]', 'is-selected', 'select: a flow is selected from its label');

  for (const [theme, rows] of contrastRows) {
    console.log(`[contrast] ${theme}`);
    for (const row of [...rows.values()].sort((a, b) => a.item.localeCompare(b.item))) {
      const ok = row.ratio >= row.floor;
      if (!ok) failures.push(`contrast ${theme} ${row.item}: ${row.ratio} < ${row.floor}`);
      console.log(
        `  ${ok ? 'ok  ' : 'FAIL'} ${row.ratio.toFixed(2).padStart(5)} (>= ${row.floor})  ${row.fg} on ${row.bg}  ${row.item}`,
      );
    }
  }
} finally {
  ab('close');
}

if (failures.length > 0) {
  console.error(`\n${failures.length} failure(s):`);
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}
console.log('\nbpmn probe: all gates and contrast floors hold');
