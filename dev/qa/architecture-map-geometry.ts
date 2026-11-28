#!/usr/bin/env node
/** Readability gates of `dpk-board-architecture-map`, measured in a real browser against the built bundle.
 *
 * Geometry comes from the element's own layout (`el.layout`) and from the DOM rects of what is
 * actually drawn (cards, label chips, boundary frames and their titles), converted back to layout
 * coordinates. Contrast comes from computed colours, composited over what is painted behind them,
 * in the light and the dark scheme.
 *
 * Every gate must count 0, and every contrast must reach its floor (4.5 for text, 3 for lines and
 * borders); the script exits non-zero otherwise. `details.labelAcrossFrame` is listed without
 * failing: two cards a boundary apart leave their link no stretch that holds a label clear of the
 * borders between them.
 *
 * AGENT_BROWSER_SESSION must identify an isolated browser session.
 * Every map on the page is measured; `--drag` moves a card of the first one.
 * Usage: node dev/qa/architecture-map-geometry.ts <page-url> [--drag <service-id>:<dx>,<dy>] [--shot <path-prefix>]
 *   --drag  drags one card by the given screen offset before measuring, to check a reader's placement
 *   --shot  saves <path-prefix>-light.png and <path-prefix>-dark.png
 */
import { execFileSync } from 'node:child_process';
import * as v from 'valibot';

const [url, ...flags] = process.argv.slice(2);
const session = process.env['AGENT_BROWSER_SESSION'];
if (!url || !session) throw new Error('Provide the page URL and AGENT_BROWSER_SESSION');
const flag = (name: string): string | undefined => {
  const index = flags.indexOf(name);
  return index === -1 ? undefined : flags[index + 1];
};
const drag = flag('--drag');
const shot = flag('--shot');

const ab = (...args: string[]) =>
  execFileSync('pnpm', ['exec', 'agent-browser', '--session', session, '--headed', 'false', ...args], {
    encoding: 'utf8',
  }).trim();
/** `eval` prints the value as JSON; a string result is JSON inside JSON. */
const evaluate = <const TSchema extends v.GenericSchema>(schema: TSchema, script: string): v.InferOutput<TSchema> => {
  const parsed: unknown = JSON.parse(ab('eval', script));
  return v.parse(schema, typeof parsed === 'string' ? JSON.parse(parsed) : parsed);
};

/** Every map on the page, the ones inside another element's shadow root included. */
const BOARDS = `(() => {
  const all = [];
  const walk = (root) => {
    for (const node of root.querySelectorAll('*')) {
      if (node.localName === 'dpk-board-architecture-map') all.push(node);
      if (node.shadowRoot) walk(node.shadowRoot);
    }
  };
  walk(document);
  return all;
})()`;
const boardAt = (index: number): string => `${BOARDS}[${index}]`;

const geometryProbe = (board: string): string => `(() => {
  const el = ${board};
  const root = el.shadowRoot;
  const layout = el.layout;
  const visible = new Set(el.visible.nodes.map((node) => node.id));
  const cards = layout.nodes.filter((node) => visible.has(node.id));
  const anchor = root.querySelector('[data-service="' + cards[0].id + '"]').getBoundingClientRect();
  const scale = anchor.width / cards[0].width;
  const originX = anchor.left - cards[0].x * scale;
  const originY = anchor.top - cards[0].y * scale;
  const world = (rect) => ({
    x: (rect.left - originX) / scale,
    y: (rect.top - originY) / scale,
    width: rect.width / scale,
    height: rect.height / scale,
  });
  const boxes = (selector, id) => [...root.querySelectorAll(selector)].map((node) => ({ id: id(node), ...world(node.getBoundingClientRect()) }));
  const chips = boxes('.arch-link-chip', (node) => node.dataset.linkLabel);
  const frames = boxes('.arch-boundary', (node) => node.dataset.boundary);
  const titles = boxes('.arch-boundary-title', (node) => node.parentElement.dataset.boundary);
  const links = new Map(el.visible.edges.map((edge) => [edge.id, edge]));
  const routes = layout.routes.filter((route) => links.has(route.id));
  const overlap = (a, b, slack = 0.5) =>
    a.x < b.x + b.width - slack && b.x < a.x + a.width - slack && a.y < b.y + b.height - slack && b.y < a.y + a.height - slack;
  const segments = routes.flatMap((route) =>
    route.points.slice(1).map((to, index) => {
      const from = route.points[index];
      return {
        id: route.id, index, last: index === route.points.length - 2, from, to,
        horizontal: from.y === to.y, vertical: from.x === to.x,
        length: Math.abs(to.x - from.x) + Math.abs(to.y - from.y),
        box: { x: Math.min(from.x, to.x), y: Math.min(from.y, to.y), width: Math.abs(to.x - from.x), height: Math.abs(to.y - from.y) },
      };
    }),
  );
  const found = { throughCard: [], looseEnd: [], diagonal: [], labelOnCard: [], labelOnLabel: [], labelOnArrow: [], labelOnTitle: [], labelOnLink: [], labelOnFrame: [], labelOffLink: [], labelHidesLink: [], sharedLane: [], shortJog: [], alongFrame: [], onFrameTitle: [], smallText: [], clippedChip: [] };
  // Reported without failing: a chip across a frame border whose link has no stretch clear of the borders.
  const noted = { labelAcrossFrame: [] };

  // A link through a card, its own two included: only its end points may touch a border.
  for (const segment of segments) {
    if (!segment.horizontal && !segment.vertical) found.diagonal.push(segment.id);
    for (const card of cards) {
      const inside = segment.horizontal
        ? segment.from.y > card.y + 0.5 && segment.from.y < card.y + card.height - 0.5 && segment.box.x < card.x + card.width - 0.5 && segment.box.x + segment.box.width > card.x + 0.5
        : segment.from.x > card.x + 0.5 && segment.from.x < card.x + card.width - 0.5 && segment.box.y < card.y + card.height - 0.5 && segment.box.y + segment.box.height > card.y + 0.5;
      if (inside) found.throughCard.push(segment.id + ' × ' + card.id);
    }
    if (segment.length < 12) found.shortJog.push(segment.id + ' #' + segment.index + ' ' + segment.length);
  }

  // Both ends on the border of their card, the link arriving from outside.
  const onBorder = (point, card, towards) => {
    const left = Math.abs(point.x - card.x) < 0.5, right = Math.abs(point.x - card.x - card.width) < 0.5;
    const top = Math.abs(point.y - card.y) < 0.5, bottom = Math.abs(point.y - card.y - card.height) < 0.5;
    const withinX = point.x > card.x - 0.5 && point.x < card.x + card.width + 0.5;
    const withinY = point.y > card.y - 0.5 && point.y < card.y + card.height + 0.5;
    return (
      (left && withinY && towards.x < point.x) || (right && withinY && towards.x > point.x) ||
      (top && withinX && towards.y < point.y) || (bottom && withinX && towards.y > point.y)
    );
  };
  const pileOf = (card) => {
    const members = [card];
    for (let grown = true; grown; ) {
      grown = false;
      for (const other of cards) {
        if (!members.includes(other) && members.some((member) => overlap(member, other, 0))) { members.push(other); grown = true; }
      }
    }
    const x = Math.min(...members.map((member) => member.x)), y = Math.min(...members.map((member) => member.y));
    return { x, y, width: Math.max(...members.map((member) => member.x + member.width)) - x, height: Math.max(...members.map((member) => member.y + member.height)) - y };
  };
  for (const route of routes) {
    const edge = links.get(route.id);
    const from = cards.find((card) => card.id === edge.from), to = cards.find((card) => card.id === edge.to);
    // Cards dropped onto each other stand as one pile: a link ends on the pile's edge, and a link
    // between two cards of the pile is not drawn until they are apart.
    const start = pileOf(from), end = pileOf(to);
    if (route.points.length === 0 && from !== to && overlap(start, end)) continue;
    if (route.points.length < 2 || !onBorder(route.points[0], start, route.points[1])) found.looseEnd.push(route.id + ' from');
    if (route.points.length < 2 || !onBorder(route.points.at(-1), end, route.points.at(-2))) found.looseEnd.push(route.id + ' to');
  }

  // Arrowheads: the inline glyph is 10px long and 9px across (markerZone of END_MARKERS.arrow).
  const arrows = routes.filter((route) => route.points.length >= 2).map((route) => {
    const tip = route.points.at(-1), before = route.points.at(-2);
    const dx = Math.sign(tip.x - before.x), dy = Math.sign(tip.y - before.y);
    return dx === 0
      ? { id: route.id, x: tip.x - 4.5, y: Math.min(tip.y, tip.y - dy * 10), width: 9, height: 10 }
      : { id: route.id, x: Math.min(tip.x, tip.x - dx * 10), y: tip.y - 4.5, width: 10, height: 9 };
  });
  const lengthUnder = (points, box) => points.slice(1).reduce((sum, to, index) => {
    const from = points[index];
    if (from.y === to.y) {
      if (from.y <= box.y || from.y >= box.y + box.height) return sum;
      return sum + Math.max(0, Math.min(Math.max(from.x, to.x), box.x + box.width) - Math.max(Math.min(from.x, to.x), box.x));
    }
    if (from.x <= box.x || from.x >= box.x + box.width) return sum;
    return sum + Math.max(0, Math.min(Math.max(from.y, to.y), box.y + box.height) - Math.max(Math.min(from.y, to.y), box.y));
  }, 0);
  const lengthOf = (points) => points.slice(1).reduce((sum, to, index) => sum + Math.abs(to.x - points[index].x) + Math.abs(to.y - points[index].y), 0);
  chips.forEach((chip, index) => {
    for (const card of cards) if (overlap(chip, card)) found.labelOnCard.push(chip.id + ' × ' + card.id);
    for (const other of chips.slice(index + 1)) if (overlap(chip, other)) found.labelOnLabel.push(chip.id + ' × ' + other.id);
    for (const arrow of arrows) if (overlap(chip, arrow)) found.labelOnArrow.push(chip.id + ' × ' + arrow.id);
    for (const title of titles) if (overlap(chip, title)) found.labelOnTitle.push(chip.id + ' × ' + title.id);
    // Nothing but its own link runs under a chip, and a chip sits clear of every frame border
    // wherever its link has a stretch that holds it clear of them all.
    const clearOf = (box) => frames.every((frame) => !overlap(box, frame) || (box.x >= frame.x && box.y >= frame.y && box.x + box.width <= frame.x + frame.width && box.y + box.height <= frame.y + frame.height));
    const own = routes.find((candidate) => candidate.id === chip.id)?.points ?? [];
    const room = own.slice(1).some((to, at) => {
      const from = own[at];
      const steps = Math.floor((Math.abs(to.x - from.x) + Math.abs(to.y - from.y)) / 4);
      for (let step = 0; step <= steps; step++) {
        const x = from.x + Math.sign(to.x - from.x) * step * 4, y = from.y + Math.sign(to.y - from.y) * step * 4;
        const along = from.y === to.y ? Math.abs(to.x - from.x) : Math.abs(to.y - from.y);
        const need = from.y === to.y ? chip.width : chip.height;
        if (step * 4 < need / 2 || along - step * 4 < need / 2) continue;
        if (clearOf({ x: x - chip.width / 2 - 2, y: y - chip.height / 2 - 2, width: chip.width + 4, height: chip.height + 4 })) return true;
      }
      return false;
    });
    const around = { x: chip.x - 2, y: chip.y - 2, width: chip.width + 4, height: chip.height + 4 };
    for (const other of routes) if (other.id !== chip.id && lengthUnder(other.points, around) > 0) found.labelOnLink.push(chip.id + ' × ' + other.id);
    for (const frame of frames) {
      const inside = chip.x >= frame.x && chip.y >= frame.y && chip.x + chip.width <= frame.x + frame.width && chip.y + chip.height <= frame.y + frame.height;
      if (overlap(chip, frame) && !inside) (room ? found.labelOnFrame : noted.labelAcrossFrame).push(chip.id + ' × ' + frame.id);
    }
    const route = routes.find((candidate) => candidate.id === chip.id);
    const reach = { x: chip.x - 8, y: chip.y - 8, width: chip.width + 16, height: chip.height + 16 };
    if (route === undefined || lengthUnder(route.points, reach) === 0) found.labelOffLink.push(chip.id);
    else if (lengthUnder(route.points, chip) / lengthOf(route.points) > 0.5) found.labelHidesLink.push(chip.id);
  });
  // A chip sized for its whole label must show it: one line unclipped, or two lines without a third.
  for (const chip of root.querySelectorAll('.arch-link-chip:not([data-shortened]) > span')) {
    const wrapped = chip.parentElement.hasAttribute('data-wrapped');
    const clipped = wrapped
      ? chip.scrollHeight > chip.clientHeight + 1
      : chip.scrollWidth > chip.clientWidth + 1 && chip.parentElement.offsetWidth < 160;
    if (clipped) found.clippedChip.push(chip.textContent);
  }

  // Two links in one lane: parallel runs closer than 6px that overlap for more than 4px.
  segments.forEach((a, index) => {
    for (const b of segments.slice(index + 1)) {
      if (a.id === b.id || a.horizontal !== b.horizontal) continue;
      const apart = a.horizontal ? Math.abs(a.from.y - b.from.y) : Math.abs(a.from.x - b.from.x);
      if (apart >= 6) continue;
      const shared = a.horizontal
        ? Math.min(a.box.x + a.box.width, b.box.x + b.box.width) - Math.max(a.box.x, b.box.x)
        : Math.min(a.box.y + a.box.height, b.box.y + b.box.height) - Math.max(a.box.y, b.box.y);
      if (shared > 4) found.sharedLane.push(a.id + ' ∥ ' + b.id);
    }
  });

  // A frame may be crossed, not followed: a run within 6px of a border for more than 12px.
  for (const frame of frames) {
    for (const segment of segments) {
      const borders = segment.horizontal ? [frame.y, frame.y + frame.height] : [frame.x, frame.x + frame.width];
      const at = segment.horizontal ? segment.from.y : segment.from.x;
      if (!borders.some((border) => Math.abs(border - at) < 6)) continue;
      const shared = segment.horizontal
        ? Math.min(segment.box.x + segment.box.width, frame.x + frame.width) - Math.max(segment.box.x, frame.x)
        : Math.min(segment.box.y + segment.box.height, frame.y + frame.height) - Math.max(segment.box.y, frame.y);
      if (shared > 12) found.alongFrame.push(segment.id + ' ∥ ' + frame.id);
    }
  }
  for (const title of titles) {
    for (const route of routes) if (lengthUnder(route.points, title) > 0) found.onFrameTitle.push(route.id + ' × ' + title.id);
    for (const card of cards) if (overlap(title, card)) found.onFrameTitle.push('card ' + card.id + ' × ' + title.id);
  }

  for (const node of root.querySelectorAll('.arch-service *, .arch-boundary-title, .arch-link-chip, .arch-link-chip *')) {
    const own = [...node.childNodes].some((child) => child.nodeType === 3 && child.textContent.trim() !== '');
    const size = Number.parseFloat(getComputedStyle(node).fontSize);
    if (own && size < 11) found.smallText.push(node.className + ' ' + size);
  }
  return JSON.stringify({
    counted: {
      cards: cards.length, links: routes.length, labels: chips.length, frames: frames.length,
      wrappedLabels: root.querySelectorAll('.arch-link-chip[data-wrapped]').length,
      shortenedLabels: root.querySelectorAll('.arch-link-chip[data-shortened]').length,
    },
    gates: Object.fromEntries(Object.entries(found).map(([name, list]) => [name, list.length])),
    details: Object.fromEntries(Object.entries({ ...found, ...noted }).filter(([, list]) => list.length > 0)),
  });
})()`;

const contrastProbe = (board: string): string => `(async () => {
  const el = ${board};
  const root = el.shadowRoot;
  const context = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  const rgba = (colour) => {
    context.clearRect(0, 0, 1, 1);
    context.fillStyle = '#000';
    context.fillStyle = colour;
    context.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data;
    return [r, g, b, a / 255];
  };
  const over = (top, base) => top.slice(0, 3).map((value, index) => value * top[3] + base[index] * (1 - top[3]));
  const parentOf = (node) => node.assignedSlot ?? node.parentElement ?? node.getRootNode().host ?? null;
  /** What is painted behind \`node\`: every ancestor's background colour, composited from the page down. */
  const behind = (node, self) => {
    const chain = [];
    for (let at = self ? node : parentOf(node); at; at = parentOf(at)) chain.unshift(at);
    const dark = getComputedStyle(document.documentElement).colorScheme.includes('dark') && document.documentElement.dataset.theme !== 'light';
    return chain.reduce((base, at) => over(rgba(getComputedStyle(at).backgroundColor), base), dark ? [18, 18, 18] : [255, 255, 255]);
  };
  const luminance = (colour) => {
    const [r, g, b] = colour.map((value) => {
      const channel = value / 255;
      return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const ratio = (a, b) => {
    const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return Math.round(((high + 0.05) / (low + 0.05)) * 100) / 100;
  };
  const text = (node) => ratio(over(rgba(getComputedStyle(node).color), behind(node, true)), behind(node, true));
  const paint = (node, property) => {
    const canvas = behind(node.closest('svg') ?? node, false);
    return ratio(over(rgba(getComputedStyle(node)[property]), canvas), canvas);
  };
  const first = (selector) => root.querySelector(selector);
  const settle = async () => {
    await el.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 450));
  };
  const measured = {};
  const put = (name, floor, value) => { if (value !== null) measured[name] = { ratio: value, floor }; };
  const on = (selector, measure) => { const node = first(selector); return node ? measure(node) : null; };

  el.select(null);
  await settle();
  put('service name', 4.5, on('.arch-service .arch-name', text));
  put('service description', 4.5, on('.arch-service .arch-description', text));
  put('service symbol', 4.5, on('.arch-service .arch-symbol', text));
  put('service border', 3, on('.arch-service', (node) => paint(node, 'borderTopColor')));
  put('boundary title', 4.5, on('.arch-boundary:not(.is-external) > .arch-boundary-title', text));
  put('boundary border', 3, on('.arch-boundary:not(.is-external)', (node) => paint(node, 'borderTopColor')));
  put('external boundary title', 4.5, on('.arch-boundary.is-external > .arch-boundary-title', text));
  put('external boundary border', 3, on('.arch-boundary.is-external', (node) => paint(node, 'borderTopColor')));
  put('link label', 4.5, on('.arch-link-chip', text));
  put('link', 3, on('.arch-link .d-edge-path', (node) => paint(node, 'stroke')));
  put('arrowhead', 3, on('.arch-link .d-edge-end [data-paint="line"]', (node) => paint(node, 'fill')));

  const edges = el.visible.edges;
  const hub = [...el.visible.nodes].sort((a, b) =>
    edges.filter((edge) => edge.from === b.id || edge.to === b.id).length - edges.filter((edge) => edge.from === a.id || edge.to === a.id).length)[0];
  el.select({ kind: 'node', id: hub.id });
  await settle();
  put('selected service name', 4.5, on('.arch-service.is-selected .arch-name', text));
  put('selected service border', 3, on('.arch-service.is-selected', (node) => paint(node, 'borderTopColor')));
  put('related service name', 4.5, on('.arch-service.is-related .arch-name', text));
  put('related service description', 4.5, on('.arch-service.is-related .arch-description', text));
  put('related service border', 3, on('.arch-service.is-related', (node) => paint(node, 'borderTopColor')));
  put('related link', 3, on('.arch-link.is-related .d-edge-path', (node) => paint(node, 'stroke')));
  put('related arrowhead', 3, on('.arch-link.is-related .d-edge-end [data-paint="line"]', (node) => paint(node, 'fill')));
  put('related link label', 4.5, on('.arch-link-chip.is-related', text));

  const labelled = edges.find((edge) => edge.label !== null) ?? edges[0];
  el.select({ kind: 'edge', id: labelled.id });
  await settle();
  put('selected link', 3, on('.arch-link.is-selected .d-edge-path', (node) => paint(node, 'stroke')));
  put('selected arrowhead', 3, on('.arch-link.is-selected .d-edge-end [data-paint="line"]', (node) => paint(node, 'fill')));
  put('selected link label', 4.5, on('.arch-link-chip.is-selected', text));
  el.select(null);
  await settle();
  return JSON.stringify(measured);
})()`;

const counts = v.record(v.string(), v.number());
const geometrySchema = v.object({ counted: counts, gates: counts, details: v.record(v.string(), v.array(v.string())) });
const contrastSchema = v.record(v.string(), v.object({ ratio: v.number(), floor: v.number() }));
const pointSchema = v.object({ x: v.number(), y: v.number() });
const coloursSchema = v.record(v.string(), v.object({ line: v.string(), head: v.string() }));
type Contrast = v.InferOutput<typeof contrastSchema>;

/** The raw computed line stroke and arrowhead fill of a link in each state, to compare them. */
const colourProbe = (board: string): string => `(async () => {
  const el = ${board};
  const root = el.shadowRoot;
  const settle = async () => {
    await el.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 450));
  };
  const read = (group) => ({
    line: getComputedStyle(group.querySelector('.d-edge-path')).stroke,
    head: getComputedStyle(group.querySelector('.d-edge-end [data-paint="line"]')).fill,
  });
  const out = {};
  el.select(null);
  await settle();
  const neutral = root.querySelector('.arch-link:not(.is-related):not(.is-selected)');
  if (neutral) out.neutral = read(neutral);
  const edges = el.visible.edges;
  const hub = [...el.visible.nodes].sort((a, b) =>
    edges.filter((edge) => edge.from === b.id || edge.to === b.id).length - edges.filter((edge) => edge.from === a.id || edge.to === a.id).length)[0];
  el.select({ kind: 'node', id: hub.id });
  await settle();
  const related = root.querySelector('.arch-link.is-related');
  if (related) out.related = read(related);
  const labelled = edges.find((edge) => edge.label !== null) ?? edges[0];
  el.select({ kind: 'edge', id: labelled.id });
  await settle();
  const selected = root.querySelector('.arch-link.is-selected');
  if (selected) out.selected = read(selected);
  el.select(null);
  await settle();
  return JSON.stringify(out);
})()`;

const setTheme = (theme: 'light' | 'dark') => {
  ab('eval', `document.documentElement.dataset.theme = '${theme}'`);
  ab('wait', '500');
};

try {
  ab('set', 'viewport', '1680', '1050');
  ab('open', url);
  const drawn = `${boardAt(0)}?.shadowRoot?.querySelector('.arch-service') != null`;
  for (let attempt = 0; !evaluate(v.boolean(), drawn); attempt++) {
    if (attempt === 20) throw new Error('The map did not render');
    ab('wait', '500');
  }
  ab('wait', '800');
  setTheme('light');
  const toggled = evaluate(
    v.object({ hidden: v.number(), shown: v.number() }),
    `(async () => {
    const el = ${boardAt(0)};
    const button = el.shadowRoot.querySelector('[data-toggle="boundaries"]');
    button.click();
    await el.updateComplete;
    const hidden = el.shadowRoot.querySelectorAll('.arch-boundary').length;
    button.click();
    await el.updateComplete;
    return JSON.stringify({ hidden, shown: el.shadowRoot.querySelectorAll('.arch-boundary').length });
  })()`,
  );
  if (drag !== undefined) {
    const [id, offset] = drag.split(':');
    const [dx, dy] = (offset ?? '').split(',').map(Number);
    if (!id || dx === undefined || dy === undefined || Number.isNaN(dx) || Number.isNaN(dy)) {
      throw new Error('--drag takes <service-id>:<dx>,<dy>');
    }
    const start = evaluate(
      pointSchema,
      `(() => {
      const rect = ${boardAt(0)}.shadowRoot.querySelector('[data-service="${id}"]').getBoundingClientRect();
      return JSON.stringify({ x: Math.round(rect.left + rect.width / 2), y: Math.round(rect.top + rect.height / 2) });
    })()`,
    );
    ab('mouse', 'move', String(start.x), String(start.y));
    ab('mouse', 'down');
    for (let step = 1; step <= 6; step++) {
      ab('mouse', 'move', String(Math.round(start.x + (dx * step) / 6)), String(Math.round(start.y + (dy * step) / 6)));
    }
    ab('mouse', 'up');
    ab('wait', '400');
    const moved = evaluate(
      pointSchema,
      `(() => {
      const rect = ${boardAt(0)}.shadowRoot.querySelector('[data-service="${id}"]').getBoundingClientRect();
      return JSON.stringify({ x: Math.round(rect.left + rect.width / 2), y: Math.round(rect.top + rect.height / 2) });
    })()`,
    );
    if (Math.abs(moved.x - start.x) < 4 && Math.abs(moved.y - start.y) < 4)
      throw new Error(`Drag did not move "${id}"`);
  }
  const count = evaluate(v.number(), `${BOARDS}.length`);
  const boards = Array.from({ length: count }, (_, index) => boardAt(index)).filter((board) =>
    evaluate(v.boolean(), `${board}.shadowRoot?.querySelector('.arch-service') != null`),
  );
  const geometry = boards.map((board) => evaluate(geometrySchema, geometryProbe(board)));
  const contrast: Record<string, Contrast[]> = {};
  // The line, its head and its flow share one `--d-edge-line`; a state where the
  // line and the head disagree is a regression even if both clear their floor.
  const colours: Record<string, v.InferOutput<typeof coloursSchema>[]> = {};
  for (const theme of ['light', 'dark'] as const) {
    setTheme(theme);
    contrast[theme] = boards.map((board) => evaluate(contrastSchema, contrastProbe(board)));
    colours[theme] = boards.map((board) => evaluate(coloursSchema, colourProbe(board)));
    if (shot !== undefined) ab('screenshot', `${shot}-${theme}.png`);
  }
  const errors = ab('errors');
  const failures = [
    ...geometry.flatMap((measured, board) =>
      Object.entries(measured.gates).flatMap(([name, found]) => (found > 0 ? [`map ${board} ${name}: ${found}`] : [])),
    ),
    ...Object.entries(contrast).flatMap(([theme, maps]) =>
      maps.flatMap((values, board) =>
        Object.entries(values).flatMap(([name, value]) =>
          value.ratio < value.floor ? [`map ${board} ${theme} ${name}: ${value.ratio} < ${value.floor}`] : [],
        ),
      ),
    ),
    ...Object.entries(colours).flatMap(([theme, maps]) =>
      maps.flatMap((states, board) =>
        Object.entries(states).flatMap(([state, value]) =>
          value.line !== value.head
            ? [`map ${board} ${theme} ${state} link: line ${value.line} ≠ head ${value.head}`]
            : [],
        ),
      ),
    ),
    ...(toggled.hidden !== 0 || toggled.shown === 0 ? ['boundary toggle'] : []),
    ...(/\S/.test(errors) && !/no (page )?errors/i.test(errors) ? [`page errors: ${errors}`] : []),
  ];
  console.log(
    JSON.stringify(
      { url, drag: drag ?? null, maps: geometry, boundaryToggle: toggled, contrast, colours, failures },
      null,
      2,
    ),
  );
  if (failures.length > 0) process.exitCode = 1;
} finally {
  ab('close');
}
