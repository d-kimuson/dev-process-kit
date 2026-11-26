#!/usr/bin/env node
/**
 * Readability probe for `dpk-board-dependency-graph`, against the built bundle
 * on the sample origin. It measures what is drawn — `el.layout` routes, the
 * DOM boxes of the modules, the rendered paths and the computed colours — and
 * fails when a route gate or a contrast floor is broken.
 *
 * Route gates (each must count 0), on the sample page and on the chaos stress
 * fixture, before and after a module is dragged:
 * - `through`   a segment runs through a module (its own included)
 * - `endpoint`  an end is not on its module's border, or arrives from inside
 * - `lane`      two edges of different modules run along one lane
 * - `jog`       a run between two bends is shorter than 12px
 * - `drawn`     a rendered path or module box is not where the layout says
 * - `smallText` text below 11px at 100% zoom
 *
 * Contrast floors, in light and dark: text 4.5:1 against its own background;
 * lines, arrowheads and state borders 3:1 against the canvas.
 *
 * AGENT_BROWSER_SESSION must name an isolated browser session.
 * Usage: node dev/qa/dependency-graph-probe.ts <lp-url> [--shots <dir>]
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

/** Evaluates an expression that returns a JSON string, and parses it against `schema`. */
const evaluate = <const TSchema extends v.GenericSchema>(
  schema: TSchema,
  expression: string,
): v.InferOutput<TSchema> => {
  // agent-browser prints the value as JSON, and the expression's own value is a JSON string.
  const printed: unknown = JSON.parse(ab('eval', expression));
  return v.parse(schema, typeof printed === 'string' ? JSON.parse(printed) : printed);
};

const BOARD = "document.querySelector('dpk-board-dependency-graph')";

const settle = `new Promise((resolve) => {
  const started = Date.now();
  const check = () => {
    const el = ${BOARD};
    if (el?.layout && el.shadowRoot?.querySelector('[data-module]')) {
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
  const count = { through: 0, endpoint: 0, lane: 0, jog: 0, drawn: 0, smallText: 0 };
  const notes = [];
  const note = (gate, text) => { count[gate]++; if (notes.length < 12) notes.push(gate + ': ' + text); };
  const segmentsOf = (points) => points.slice(1).map((point, index) => [points[index], point]);
  const inside = (p, box) => p.x > box.x && p.x < box.x + box.width && p.y > box.y && p.y < box.y + box.height;
  const onBorder = (p, box) =>
    p.x >= box.x && p.x <= box.x + box.width && p.y >= box.y && p.y <= box.y + box.height && !inside(p, box);
  const enters = ([a, b], box) =>
    Math.max(a.x, b.x) > box.x && Math.min(a.x, b.x) < box.x + box.width &&
    Math.max(a.y, b.y) > box.y && Math.min(a.y, b.y) < box.y + box.height;

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
    const vertical = a.x === b.x && c.x === d.x && Math.abs(a.x - c.x) < LANE;
    const horizontal = a.y === b.y && c.y === d.y && Math.abs(a.y - c.y) < LANE;
    if (vertical && !(a.y === b.y && c.y === d.y))
      return Math.min(Math.max(a.y, b.y), Math.max(c.y, d.y)) - Math.max(Math.min(a.y, b.y), Math.min(c.y, d.y));
    if (horizontal)
      return Math.min(Math.max(a.x, b.x), Math.max(c.x, d.x)) - Math.max(Math.min(a.x, b.x), Math.min(c.x, d.x));
    return 0;
  };
  for (let i = 0; i < edges.length; i++) {
    for (let j = i + 1; j < edges.length; j++) {
      const first = routeOf.get(edges[i].id);
      const second = routeOf.get(edges[j].id);
      if (!first || !second) continue;
      const trunk =
        edges[i].from === edges[j].from && first[0].x === second[0].x && first[0].y === second[0].y;
      if (trunk) continue;
      for (const a of segmentsOf(first)) for (const b of segmentsOf(second)) {
        if (run(a, b) > 1) note('lane', edges[i].id + ' / ' + edges[j].id);
      }
    }
  }

  const svg = root.querySelector('.diagram-edges').getBoundingClientRect();
  const sample = root.querySelector('[data-module]');
  const scale = sample.getBoundingClientRect().width / byId.get(sample.dataset.module).width;
  const off = (a, b) => Math.abs(a - b) > 1.5;
  for (const button of root.querySelectorAll('[data-module]')) {
    const rect = button.getBoundingClientRect();
    const box = byId.get(button.dataset.module);
    if (off((rect.left - svg.left) / scale, box.x) || off((rect.top - svg.top) / scale, box.y) ||
        off(rect.width / scale, box.width) || off(rect.height / scale, box.height)) note('drawn', 'module ' + box.id);
  }
  for (const group of root.querySelectorAll('[data-dependency]')) {
    const path = group.querySelector('.d-edge-path');
    const points = routeOf.get(group.dataset.dependency);
    const start = path.getPointAtLength(0);
    const end = path.getPointAtLength(path.getTotalLength());
    if (off(start.x, points[0].x) || off(start.y, points[0].y) || off(end.x, points.at(-1).x) || off(end.y, points.at(-1).y))
      note('drawn', 'path ' + group.dataset.dependency);
    if (!path.getAttribute('marker-end')) note('drawn', 'no arrowhead ' + group.dataset.dependency);
  }
  if (root.querySelectorAll('[data-dependency]').length !== edges.length) note('drawn', 'edge count');

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

  return JSON.stringify({ modules: nodes.length, edges: edges.length, labels: root.querySelectorAll('.d-edge-label').length, count, notes });
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
  const stateOf = (node) =>
    ['is-selected', 'is-dependency', 'is-dependent', 'is-cyclic'].find((name) => node.classList.contains(name)) ?? 'plain';

  const ground = backdrop(root.querySelector('.diagram-edges'), false);
  for (const node of root.querySelectorAll('[data-module]')) {
    if (!live(node)) continue;
    const state = stateOf(node).replace('is-', '');
    for (const part of node.querySelectorAll('.dep-name, .dep-layer, .dep-path, .dep-cycle-badge')) {
      if (part.textContent.trim() === '') continue;
      add('text ' + part.className + ' @' + state + ' module', rgba(getComputedStyle(part).color), backdrop(part, true), 4.5);
    }
    add('border ' + state + ' module', rgba(getComputedStyle(node).borderTopColor), ground, 3);
  }
  for (const group of root.querySelectorAll('[data-dependency]')) {
    if (!live(group)) continue;
    const kind = ['selected', 'outgoing', 'incoming', 'cycle', 'neutral'].find((name) => group.classList.contains('is-' + name));
    add('line ' + kind, rgba(getComputedStyle(group.querySelector('.d-edge-path')).stroke), ground, 3);
    const marker = /#([\\w-]+)/.exec(group.querySelector('.d-edge-path').getAttribute('marker-end'))[1];
    add('arrowhead ' + kind, rgba(getComputedStyle(root.getElementById(marker).querySelector('.diagram-arrow')).fill), ground, 3);
    const dot = group.querySelector('.dep-junction');
    if (dot) add('junction ' + kind, rgba(getComputedStyle(dot).fill), ground, 3);
  }
  const legend = root.querySelector('.diagram-legend');
  if (legend) {
    for (const entry of legend.querySelectorAll('span')) {
      add('text legend', rgba(getComputedStyle(entry).color), backdrop(entry, true), 4.5);
      const swatch = entry.querySelector('i');
      add('swatch ' + swatch.className, rgba(getComputedStyle(swatch).borderTopColor), backdrop(swatch, true), 3);
    }
  }
  const stats = root.querySelector('.diagram-stats');
  if (stats) add('text stats', rgba(getComputedStyle(stats).color), backdrop(stats, true), 4.5);
  for (const button of root.querySelectorAll('.dep-direction button, .dep-toggle')) {
    if (button.disabled) continue;
    const pressed = button.getAttribute('aria-pressed') === 'true' ? 'on' : 'off';
    add('text toolbar ' + (button.dataset.direction ? 'direction' : button.dataset.toggle) + ' ' + pressed,
      rgba(getComputedStyle(button).color), backdrop(button, true), 4.5);
  }
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

const gateReportSchema = v.object({
  modules: v.number(),
  edges: v.number(),
  labels: v.number(),
  count: v.record(v.string(), v.number()),
  notes: v.array(v.string()),
});
const contrastRowSchema = v.object({
  item: v.string(),
  fg: v.string(),
  bg: v.string(),
  ratio: v.number(),
  floor: v.number(),
});
type ContrastRow = v.InferOutput<typeof contrastRowSchema>;
const contrastReportSchema = v.object({ canvas: v.string(), rows: v.array(contrastRowSchema) });
const pointSchema = v.object({ x: v.number(), y: v.number() });

const failures: string[] = [];

const checkGates = (label: string): void => {
  const report = evaluate(gateReportSchema, gates);
  const summary = Object.entries(report.count)
    .map(([gate, value]) => `${gate}=${value}`)
    .join(' ');
  console.log(
    `[gates] ${label}: ${report.modules} modules, ${report.edges} edges, ${report.labels} labels — ${summary}`,
  );
  if (Object.values(report.count).some((value) => value > 0)) {
    failures.push(`gates ${label}: ${summary}`);
    for (const note of report.notes) console.log(`    ${note}`);
  }
};

const contrastRows = new Map<string, Map<string, ContrastRow>>();
const checkContrast = (theme: string): void => {
  const report = evaluate(contrastReportSchema, contrast);
  const rows = contrastRows.get(theme) ?? new Map<string, ContrastRow>();
  contrastRows.set(theme, rows);
  for (const row of report.rows) {
    const known = rows.get(row.item);
    if (known === undefined || row.ratio < known.ratio) rows.set(row.item, row);
  }
};

const click = (selector: string): void => {
  ab(
    'eval',
    `(() => { ${BOARD}.shadowRoot.querySelector(${JSON.stringify(selector)}).dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true })); return '"ok"'; })()`,
  );
  ab(
    'eval',
    'new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(() => resolve(1), 350))))',
  );
};

const classesOf = (module: string): readonly string[] =>
  evaluate(
    v.array(v.string()),
    `JSON.stringify([...${BOARD}.shadowRoot.querySelector('[data-module="${module}"]').classList])`,
  );

const expectClass = (module: string, name: string, label: string): void => {
  if (classesOf(module).includes(name)) console.log(`[interaction] PASS ${label}`);
  else failures.push(`interaction ${label}: ${module} is not ${name}`);
};

const open = (url: string, theme: string): void => {
  ab('open', url);
  ab('set', 'viewport', '1440', '900');
  ab('eval', `(() => { document.documentElement.dataset.theme = '${theme}'; return 1; })()`);
  if (evaluate(v.string(), settle) !== 'ready') throw new Error(`board did not render: ${url}`);
};

const shot = (name: string): void => {
  if (shots !== null) ab('screenshot', join(shots, `${name}.png`));
};

const drag = (module: string, dx: number, dy: number): void => {
  const centre = evaluate(
    pointSchema,
    `(() => { const r = ${BOARD}.shadowRoot.querySelector('[data-module="${module}"]').getBoundingClientRect(); return JSON.stringify({ x: r.left + r.width / 2, y: r.top + r.height / 2 }); })()`,
  );
  const before = evaluate(pointSchema, `JSON.stringify(${BOARD}.layout.nodes.find((node) => node.id === '${module}'))`);
  ab('mouse', 'move', String(Math.round(centre.x)), String(Math.round(centre.y)));
  ab('mouse', 'down');
  for (let step = 1; step <= 4; step++) {
    ab('mouse', 'move', String(Math.round(centre.x + (dx * step) / 4)), String(Math.round(centre.y + (dy * step) / 4)));
  }
  ab('mouse', 'up');
  ab('eval', 'new Promise((resolve) => setTimeout(() => resolve(1), 400))');
  const after = evaluate(pointSchema, `JSON.stringify(${BOARD}.layout.nodes.find((node) => node.id === '${module}'))`);
  if (before.x === after.x && before.y === after.y) failures.push(`drag ${module}: the module did not move`);
  else console.log(`[drag] ${module}: (${before.x}, ${before.y}) → (${Math.round(after.x)}, ${Math.round(after.y)})`);
};

const PAGES = [
  { name: 'sample', path: '/dependency-graph.html', module: 'orders', edge: 'orders-pricing', cyclic: 'pricing' },
  {
    name: 'stress',
    path: '/chaos/dependency-graph.html?fixture=stress',
    module: 'pricing',
    edge: 'checkout--pricing',
    cyclic: 'account',
  },
] as const;

try {
  for (const page of PAGES) {
    for (const theme of ['light', 'dark']) {
      const url = `${base}${page.path}${page.path.includes('?') ? `&theme=${theme}` : ''}`;
      open(url, theme);
      checkGates(`${page.name} ${theme}`);
      checkContrast(theme);
      shot(`${page.name}-${theme}`);
      click(`[data-module="${page.module}"]`);
      checkContrast(theme);
      shot(`${page.name}-${theme}-module-selected`);
      click(`[data-module="${page.cyclic}"]`);
      checkContrast(theme);
      click(`[data-dependency="${page.edge}"] .d-edge-hit`);
      checkContrast(theme);
      shot(`${page.name}-${theme}-edge-selected`);
    }
  }

  open(`${base}/dependency-graph.html`, 'light');
  click('[data-module="orders"]');
  expectClass('pricing', 'is-dependency', 'both: Pricing is a dependency of Order service');
  expectClass('api', 'is-dependent', 'both: Order API depends on Order service');
  click('[data-direction="outgoing"]');
  expectClass('pricing', 'is-dependency', 'depends on: Pricing stays');
  expectClass('api', 'is-dimmed', 'depends on: Order API is dimmed');
  click('[data-direction="incoming"]');
  expectClass('api', 'is-dependent', 'depended on by: Order API stays');
  expectClass('pricing', 'is-dimmed', 'depended on by: Pricing is dimmed');
  click('[data-direction="both"]');
  click('[data-module="checkout"]');
  expectClass('orders', 'is-dimmed', 'direct only: Order service is out of reach of Checkout UI');
  click('[data-toggle="transitive"]');
  expectClass('orders', 'is-dependency', 'include indirect: Order service is reached from Checkout UI');
  click('[data-toggle="transitive"]');
  drag('pricing', 60, 150);
  checkGates('sample light, Pricing dragged');
  shot('sample-light-dragged');

  open(`${base}/chaos/dependency-graph.html?fixture=stress&theme=light`, 'light');
  drag('kernel', -170, -110);
  checkGates('stress light, Shared kernel dragged');
  drag('checkout', 120, 140);
  checkGates('stress light, Checkout dragged too');
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

  const errors = ab('errors');
  if (errors !== '') failures.push(`page errors: ${errors}`);
} finally {
  ab('close');
}

if (failures.length > 0) {
  console.error(`FAIL\n${failures.map((failure) => `  ${failure}`).join('\n')}`);
  process.exit(1);
}
console.log('PASS');
