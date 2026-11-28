#!/usr/bin/env node
/**
 * Readability probe for `dpk-board-state-diagram`, against the built bundle on
 * the sample origin. It measures what is drawn — `el.layout` routes, the DOM
 * boxes of the states and the transition labels, the rendered paths and the
 * computed colours — and fails when a gate or a contrast floor is broken.
 *
 * Gates (each must count 0), on the sample page (authored positions) and on
 * the chaos stress fixture (automatic layout), before and after a state is
 * dragged:
 * - `through`    a segment runs through a state (its own included)
 * - `endpoint`   an end is not on its state's border, or arrives from inside
 * - `lane`       two transitions run along one lane
 * - `jog`        a run between two bends is shorter than 12px, or is diagonal
 * - `labelNode`  a label lies over a state
 * - `labelLabel` two labels overlap
 * - `labelArrow` a label lies over an arrowhead
 * - `labelLine`  a label lies over the line of another transition
 * - `labelCover` a label hides more than half of its own transition
 * - `drawn`      a rendered path, state or label is not where the layout says
 * - `smallText`  text below 11px at 100% zoom
 *
 * Contrast floors, in light and dark: text 4.5:1 against its own background;
 * lines, arrowheads, kind marks and meaning-carrying borders 3:1.
 *
 * AGENT_BROWSER_SESSION must name an isolated browser session.
 * Usage: node dev/qa/state-diagram-probe.ts <lp-url> [--shots <dir>]
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

/** Evaluates an expression that returns a JSON string, and parses it. */
const evaluate = <const TSchema extends v.GenericSchema>(
  schema: TSchema,
  expression: string,
): v.InferOutput<TSchema> => {
  // agent-browser prints the value as JSON, and the expression's own value is a JSON string.
  const printed: unknown = JSON.parse(ab('eval', expression));
  if (typeof printed !== 'string') return v.parse(schema, printed);
  try {
    return v.parse(schema, JSON.parse(printed));
  } catch {
    return v.parse(schema, printed);
  }
};

const BOARD = "document.querySelector('dpk-board-state-diagram')";

const settle = `new Promise((resolve) => {
  const started = Date.now();
  const check = () => {
    const el = ${BOARD};
    if (el?.layout && el.shadowRoot?.querySelector('[data-state]')) {
      requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(() => resolve('"ready"'), 450)));
    } else if (Date.now() - started > 15000) resolve('"timeout"');
    else setTimeout(check, 100);
  };
  check();
})`;

const gates = `(() => {
  const el = ${BOARD};
  const root = el.shadowRoot;
  const { nodes, routes } = el.layout;
  const edges = el.visible.edges;
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const routeOf = new Map(routes.map((route) => [route.id, route.points]));
  const count = {
    through: 0, endpoint: 0, lane: 0, jog: 0, labelNode: 0, labelLabel: 0, labelArrow: 0, labelLine: 0,
    labelCover: 0, drawn: 0, smallText: 0,
  };
  const notes = [];
  const note = (gate, text) => { count[gate]++; if (notes.length < 16) notes.push(gate + ': ' + text); };
  const segmentsOf = (points) => points.slice(1).map((point, index) => [points[index], point]);
  const inside = (p, box) => p.x > box.x && p.x < box.x + box.width && p.y > box.y && p.y < box.y + box.height;
  const onBorder = (p, box) =>
    p.x >= box.x && p.x <= box.x + box.width && p.y >= box.y && p.y <= box.y + box.height && !inside(p, box);
  const enters = ([a, b], box) =>
    Math.max(a.x, b.x) > box.x && Math.min(a.x, b.x) < box.x + box.width &&
    Math.max(a.y, b.y) > box.y && Math.min(a.y, b.y) < box.y + box.height;
  /** Length of a segment that lies inside a box. */
  const covered = ([a, b], box) => {
    if (!enters([a, b], box)) return 0;
    return a.y === b.y
      ? Math.min(Math.max(a.x, b.x), box.x + box.width) - Math.max(Math.min(a.x, b.x), box.x)
      : Math.min(Math.max(a.y, b.y), box.y + box.height) - Math.max(Math.min(a.y, b.y), box.y);
  };
  const overlap = (a, b) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;

  for (const edge of edges) {
    const points = routeOf.get(edge.id);
    if (!points || points.length < 2) { note('endpoint', edge.id + ' has no route'); continue; }
    const from = byId.get(edge.from);
    const to = byId.get(edge.to);
    if (!onBorder(points[0], from) || inside(points[1], from)) note('endpoint', edge.id + ' start');
    if (!onBorder(points.at(-1), to) || inside(points.at(-2), to)) note('endpoint', edge.id + ' end');
    for (const segment of segmentsOf(points)) {
      const [a, b] = segment;
      if (a.x !== b.x && a.y !== b.y) note('jog', edge.id + ' diagonal');
      if (Math.abs(b.x - a.x) + Math.abs(b.y - a.y) < 12) note('jog', edge.id + ' ' + JSON.stringify(segment));
      for (const box of nodes) if (enters(segment, box)) note('through', edge.id + ' through ' + box.id);
    }
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
      for (const a of segmentsOf(first)) for (const b of segmentsOf(second)) {
        if (run(a, b) > 1) note('lane', edges[i].id + ' / ' + edges[j].id);
      }
    }
  }

  const svg = root.querySelector('.diagram-edges').getBoundingClientRect();
  const sample = root.querySelector('[data-state]');
  const scale = sample.getBoundingClientRect().width / byId.get(sample.dataset.state).width;
  const toLayout = (rect) => ({
    x: (rect.left - svg.left) / scale, y: (rect.top - svg.top) / scale, width: rect.width / scale, height: rect.height / scale,
  });
  const off = (a, b) => Math.abs(a - b) > 1.5;
  for (const button of root.querySelectorAll('[data-state]')) {
    const rect = toLayout(button.getBoundingClientRect());
    const box = byId.get(button.dataset.state);
    if (off(rect.x, box.x) || off(rect.y, box.y) || off(rect.width, box.width) || off(rect.height, box.height))
      note('drawn', 'state ' + box.id);
  }
  const paths = root.querySelectorAll('[data-transition]');
  for (const group of paths) {
    const path = group.querySelector('.d-edge-path');
    const points = routeOf.get(group.dataset.transition);
    const start = path.getPointAtLength(0);
    const end = path.getPointAtLength(path.getTotalLength());
    if (off(start.x, points[0].x) || off(start.y, points[0].y) || off(end.x, points.at(-1).x) || off(end.y, points.at(-1).y))
      note('drawn', 'path ' + group.dataset.transition);
    if (!group.querySelector('.d-edge-end [data-paint="line"]')) note('drawn', 'no arrowhead ' + group.dataset.transition);
  }
  if (paths.length !== edges.length) note('drawn', 'edge count ' + paths.length + ' of ' + edges.length);

  const ARROW = 11;
  const arrowOf = (points) => {
    const tip = points.at(-1);
    const before = points.at(-2);
    const dx = Math.sign(tip.x - before.x);
    const dy = Math.sign(tip.y - before.y);
    const half = ARROW / 2;
    return dx !== 0
      ? { x: Math.min(tip.x, tip.x - dx * ARROW), y: tip.y - half, width: ARROW, height: ARROW }
      : { x: tip.x - half, y: Math.min(tip.y, tip.y - dy * ARROW), width: ARROW, height: ARROW };
  };
  const labels = [...root.querySelectorAll('[data-transition-label]')].map((button) => ({
    id: button.dataset.transitionLabel,
    box: toLayout(button.getBoundingClientRect()),
    clipped: button.scrollWidth > button.clientWidth + 1,
  }));
  if (labels.length !== edges.length) note('drawn', 'label count ' + labels.length + ' of ' + edges.length);
  const layoutWidth = el.layout.width;
  const layoutHeight = el.layout.height;
  let clipped = 0;
  for (const [index, label] of labels.entries()) {
    if (label.clipped) clipped++;
    if (label.box.x < 0 || label.box.y < 0 || label.box.x + label.box.width > layoutWidth || label.box.y + label.box.height > layoutHeight)
      note('drawn', 'label outside the canvas ' + label.id);
    for (const box of nodes) if (overlap(label.box, box)) note('labelNode', label.id + ' over ' + box.id);
    for (const other of labels.slice(index + 1)) if (overlap(label.box, other.box)) note('labelLabel', label.id + ' / ' + other.id);
    for (const edge of edges) {
      const points = routeOf.get(edge.id);
      if (!points) continue;
      if (overlap(label.box, arrowOf(points))) note('labelArrow', label.id + ' over the arrowhead of ' + edge.id);
      const hidden = segmentsOf(points).reduce((sum, segment) => sum + covered(segment, label.box), 0);
      if (edge.id !== label.id) { if (hidden > 0) note('labelLine', label.id + ' over the line of ' + edge.id); continue; }
      const total = segmentsOf(points).reduce((sum, [a, b]) => sum + Math.abs(b.x - a.x) + Math.abs(b.y - a.y), 0);
      if (hidden > total / 2) note('labelCover', label.id + ' hides ' + Math.round(hidden) + ' of ' + Math.round(total));
    }
  }

  // The toolbar, tag row, subtitle and zoom readout live in the shadow roots of the shell elements.
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

  return JSON.stringify({ states: nodes.length, edges: edges.length, labels: labels.length, clipped, count, notes });
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
  /** The opaque colour behind an element: every ancestor's background, composited bottom-up. */
  const backdrop = (element, includeSelf) => {
    const layers = [];
    for (let at = includeSelf ? element : parentOf(element); at; at = parentOf(at)) {
      const style = getComputedStyle(at);
      const tint = /^linear-gradient\\((.+)\\)$/.exec(style.backgroundImage);
      if (tint) {
        const first = /^(rgba?\\([^)]*\\)|color\\([^)]*\\)|#[0-9a-f]+)/i.exec(tint[1]);
        if (first) layers.push(rgba(first[1]));
      }
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
  const pick = (element, names, fallback) => names.find((name) => element.classList.contains('is-' + name)) ?? fallback;

  const ground = backdrop(root.querySelector('.diagram-edges'), false);
  for (const node of root.querySelectorAll('[data-state]')) {
    if (!live(node)) continue;
    const kind = pick(node, ['initial', 'terminal', 'compensation'], 'normal');
    const state = pick(node, ['selected', 'related'], 'plain');
    const tag = kind + ' state @' + state;
    for (const part of node.querySelectorAll('.state-name, .state-code')) {
      add('text ' + part.className + ' ' + tag, rgba(getComputedStyle(part).color), backdrop(part, true), 4.5);
    }
    for (const mark of node.querySelectorAll('.state-initial-mark, .state-terminal-mark')) {
      const style = getComputedStyle(mark);
      const colour = mark.classList.contains('state-initial-mark') ? style.backgroundColor : style.borderTopColor;
      add('mark ' + tag, rgba(colour), backdrop(mark, false), 3);
    }
    add('border ' + tag, rgba(getComputedStyle(node).borderTopColor), ground, 3);
  }
  for (const group of root.querySelectorAll('[data-transition]')) {
    if (!live(group)) continue;
    const kind = pick(group, ['selected', 'related', 'exception'], 'normal');
    const path = group.querySelector('.d-edge-path');
    add('line ' + kind, rgba(getComputedStyle(path).stroke), ground, 3);
    // The head is drawn inline (no <marker>), so read the glyph's own fill.
    add('arrowhead ' + kind, rgba(getComputedStyle(group.querySelector('.d-edge-end [data-paint="line"]')).fill), ground, 3);
  }
  for (const label of root.querySelectorAll('[data-transition-label]')) {
    if (!live(label)) continue;
    const kind = pick(label, ['selected', 'related', 'exception'], 'normal');
    add('text label ' + kind, rgba(getComputedStyle(label).color), backdrop(label, true), 4.5);
    if (kind === 'selected' || kind === 'related') add('border label ' + kind, rgba(getComputedStyle(label).borderTopColor), ground, 3);
  }
  const stats = root.querySelector('.diagram-stats');
  if (stats) add('text stats', rgba(getComputedStyle(stats).color), backdrop(stats, true), 4.5);
  // Text of the shell (toolbar, tag row, subtitle, zoom readout), which sits in nested shadow roots.
  const chromeText = (scope, owner) => {
    const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
    const seen = new Set();
    for (let text = walker.nextNode(); text; text = walker.nextNode()) {
      const parent = text.parentElement;
      if (!parent || text.textContent.trim() === '' || seen.has(parent) || parent.closest('style, title, defs')) continue;
      seen.add(parent);
      if (parent.getClientRects().length === 0 || parent.closest(':disabled')) continue;
      const colour = rgba(getComputedStyle(parent).color);
      for (let at = parent; at; at = parentOf(at)) colour[3] *= Number(getComputedStyle(at).opacity);
      const pressed = parent.closest('[aria-pressed]')?.getAttribute('aria-pressed');
      const name = owner + ' ' + (parent.className || parent.tagName.toLowerCase()) + (pressed ? ' pressed=' + pressed : '');
      add('text chrome ' + name, colour, backdrop(parent, true), 4.5);
    }
    for (const host of scope.querySelectorAll('*')) if (host.shadowRoot) chromeText(host.shadowRoot, host.localName);
  };
  for (const host of root.querySelectorAll('dpk-dialog-panel, dpk-tag-filter')) chromeText(host.shadowRoot, host.localName);
  return JSON.stringify({ canvas: hex(ground), rows: [...rows.values()] });
})()`;

const gateReport = v.object({
  states: v.number(),
  edges: v.number(),
  labels: v.number(),
  clipped: v.number(),
  count: v.record(v.string(), v.number()),
  notes: v.array(v.string()),
});
const contrastReport = v.object({
  canvas: v.string(),
  rows: v.array(v.object({ item: v.string(), fg: v.string(), bg: v.string(), ratio: v.number(), floor: v.number() })),
});
type ContrastRow = v.InferOutput<typeof contrastReport>['rows'][number];
const point = v.object({ x: v.number(), y: v.number() });

const failures: string[] = [];

const checkGates = (label: string): void => {
  const report = evaluate(gateReport, gates);
  const summary = Object.entries(report.count)
    .map(([gate, value]) => `${gate}=${value}`)
    .join(' ');
  console.log(
    `[gates] ${label}: ${report.states} states, ${report.edges} transitions, ${report.labels} labels (${report.clipped} ellipsized) — ${summary}`,
  );
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

const open = (url: string, theme: string, width: number, height: number): void => {
  // A state the last run dragged is remembered by the page: start from the layout the data asks for.
  ab('open', url);
  ab('eval', '(() => { localStorage.clear(); sessionStorage.clear(); return 1; })()');
  // The dev server swaps the bundle while it rebuilds, so a page that came up empty is loaded once more.
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

const drag = (state: string, dx: number, dy: number): void => {
  const centre = evaluate(
    point,
    `(() => { const r = ${BOARD}.shadowRoot.querySelector('[data-state="${state}"]').getBoundingClientRect(); return JSON.stringify({ x: r.left + r.width / 2, y: r.top + r.height / 2 }); })()`,
  );
  const placed = `JSON.stringify(${BOARD}.layout.nodes.find((node) => node.id === '${state}'))`;
  const before = evaluate(point, placed);
  ab('mouse', 'move', String(Math.round(centre.x)), String(Math.round(centre.y)));
  ab('mouse', 'down');
  for (let step = 1; step <= 4; step++) {
    ab('mouse', 'move', String(Math.round(centre.x + (dx * step) / 4)), String(Math.round(centre.y + (dy * step) / 4)));
  }
  ab('mouse', 'up');
  ab('eval', 'new Promise((resolve) => setTimeout(() => resolve(1), 400))');
  const after = evaluate(point, placed);
  if (before.x === after.x && before.y === after.y) failures.push(`drag ${state}: the state did not move`);
  else console.log(`[drag] ${state}: (${before.x}, ${before.y}) → (${Math.round(after.x)}, ${Math.round(after.y)})`);
};

const PAGES = [
  {
    name: 'sample',
    path: '/state-diagram.html',
    viewport: [1440, 900],
    state: 'paid',
    states: ['pending', 'cancelled', 'refunding'],
    transition: 'declined',
  },
  {
    name: 'stress',
    path: '/chaos/state-diagram.html?fixture=stress',
    viewport: [3400, 1100],
    state: 'active',
    states: ['draft', 'rejected', 'refunding'],
    transition: 'send-back',
  },
] as const;

try {
  for (const page of PAGES) {
    for (const theme of ['light', 'dark']) {
      const url = `${base}${page.path}${page.path.includes('?') ? `&theme=${theme}` : ''}`;
      open(url, theme, page.viewport[0], page.viewport[1]);
      checkGates(`${page.name} ${theme}`);
      checkContrast(theme);
      shot(`${page.name}-${theme}`);
      click(`[data-state="${page.state}"]`);
      checkContrast(theme);
      shot(`${page.name}-${theme}-state-selected`);
      for (const state of page.states) {
        click(`[data-state="${state}"]`);
        checkContrast(theme);
      }
      click(`[data-transition-label="${page.transition}"]`);
      checkContrast(theme);
      shot(`${page.name}-${theme}-transition-selected`);
    }
  }

  open(`${base}/state-diagram.html`, 'light', 1440, 900);
  click('[data-state="paid"]');
  expectClass('[data-state="paid"]', 'is-selected', 'select: the clicked state is selected');
  expectClass('[data-transition="dispatch"]', 'is-related', 'select: its outgoing transition is related');
  expectClass('[data-state="pending"]', 'is-dimmed', 'select: an unrelated state is dimmed');
  click('[data-state="paid"]');
  click('[data-transition-label="dispatch"]');
  expectClass('[data-transition="dispatch"]', 'is-selected', 'select: a transition is selected from its label');
  open(`${base}/state-diagram.html`, 'light', 1440, 900);
  drag('refunding', 190, 130);
  checkGates('sample light, 返金待ち dragged');
  drag('processing', -40, 210);
  checkGates('sample light, 決済待ち dragged too');
  shot('sample-light-dragged');

  open(`${base}/chaos/state-diagram.html?fixture=stress&theme=light`, 'light', 3400, 1100);
  drag('active', 60, 220);
  checkGates('stress light, 利用中 dragged');
  drag('screening', -80, -170);
  checkGates('stress light, 一次審査中 dragged too');
  shot('stress-light-dragged');

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
console.log('\nstate diagram probe: all gates and contrast floors hold');
