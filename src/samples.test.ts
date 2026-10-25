// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { parseArchitectureData } from './boards/architecture-map/model';
import { parseDependencyData } from './boards/dependency-graph/model';
import { parseErData } from './boards/er-diagram/model';
import { parseExampleMappingBase } from './boards/example-mapping/model';
import { parseKanbanData } from './boards/kanban/model';
import { parseMindMapData } from './boards/mind-map/model';
import { parseSequenceData } from './boards/sequence-diagram/model';
import { parseStateData } from './boards/state-diagram/model';
import { frameOf, parseWhiteboardBase } from './boards/whiteboard/model';
import { parseChangeLog, revisionsOf } from './core/changes';
import { parseGrill } from './core/grill';
import { parseDelegationPokerBase } from './views/delegation-poker/model';
import { parsePlainBase } from './views/plain/model';
import { parseSlidesBase } from './views/slides/model';
import { parseTaskBoardBase } from './views/task-board/model';

/**
 * The samples are what a reader opens first, and their data is hand-written JSON
 * inside HTML — the exact place where drift hides. Parsing them here means a
 * sample can never teach a shape the component would reject.
 */
// `import.meta.url` is root-relative under the test environment, so resolve the
// sample directory from the vitest root instead.
const sample = (name: string): string => readFileSync(resolve('sample', name), 'utf8');

/** The questions a page asks, read apart from its base data. */
const GRILL = /<script type="application\/json" data-dpk-grill>([\s\S]*?)<\/script>/;

/** A change log, which a template element may carry before its base data. */
const CHANGE_LOG = /<script type="application\/json" data-dpk-changes>([\s\S]*?)<\/script>/;

/** The `n`-th `<script type="application/json">` base data child of a given element. */
const jsonChild = (html: string, tag: string, index = 0): unknown => {
  const blocks = [
    ...html.matchAll(
      new RegExp(
        `<${tag}\\b[^>]*>\\s*(?:${CHANGE_LOG.source}\\s*)?<script type="application/json">([\\s\\S]*?)</script>`,
        'g',
      ),
    ),
  ];
  // The last group: the change log's own group comes first.
  const json = blocks[index]?.at(-1);
  if (!json) throw new Error(`sample has no JSON child #${index} for <${tag}>`);
  return JSON.parse(json);
};

/** The bundle entries a sample loads through `sample/kit.js` (`loadKit([...])`). */
const entriesOf = (html: string): readonly string[] => {
  const list = /loadKit\(\[([^\]]*)\]\)/.exec(html)?.[1];
  if (list === undefined) throw new Error('sample loads no entry through loadKit');
  return [...list.matchAll(/'([^']*)'/g)].map((match) => match[1] ?? '');
};

/** Every `questions` value anywhere in a parsed diagram payload. */
const questionsIn = (value: unknown, found: string[] = []): string[] => {
  if (Array.isArray(value)) {
    for (const item of value) questionsIn(item, found);
    return found;
  }
  if (typeof value !== 'object' || value === null) return found;
  for (const [key, item] of Object.entries(value)) {
    if (key === 'questions' && typeof item === 'string') found.push(...item.split(/\s+/));
    else questionsIn(item, found);
  }
  return found;
};

describe('sample pages', () => {
  it('every sample hides its root element until the kit defines it, so raw content cannot flash', () => {
    const files = readdirSync(resolve('sample')).filter((name) => name.endsWith('.html'));
    expect(files.length).toBeGreaterThan(0);
    const missing = files.filter((name) => !sample(name).includes('body > :not(:defined)'));
    expect(missing, 'sample(s) missing the FOUC guard style (docs/index.md#page-height)').toEqual([]);
  });

  it('diagrams.html carries data every diagram accepts', () => {
    const html = sample('diagrams.html');
    expect(parseStateData(jsonChild(html, 'dpk-board-state-diagram')).nodes).toHaveLength(8);
    const sequence = parseSequenceData(jsonChild(html, 'dpk-board-sequence-diagram'));
    expect(sequence.participants).toHaveLength(5);
    expect(sequence.items.length).toBeGreaterThan(3);
    expect(parseDependencyData(jsonChild(html, 'dpk-board-dependency-graph')).nodes).toHaveLength(7);
    const er = parseErData(jsonChild(html, 'dpk-board-er-diagram'));
    expect(er.nodes.map((node) => node.status)).toEqual(
      expect.arrayContaining(['added', 'removed', 'changed', 'same']),
    );
    const architecture = parseArchitectureData(jsonChild(html, 'dpk-board-architecture-map'));
    expect(architecture.nodes).toHaveLength(8);
    expect(architecture.boundaries).toHaveLength(3);
    const mindMap = parseMindMapData(jsonChild(html, 'dpk-board-mind-map'));
    expect(mindMap.nodes.filter((node) => node.depth === 1).length).toBeGreaterThan(3);
    expect(new Set(mindMap.nodes.map((node) => node.side))).toEqual(new Set([null, 'left', 'right']));
    const kanban = parseKanbanData(jsonChild(html, 'dpk-board-kanban'));
    expect(kanban.columns.length).toBeGreaterThan(2);
    expect(kanban.columns.flatMap((column) => column.cards).length).toBeGreaterThan(3);
  });

  it('diagrams.html is an dpk-view-plain page whose sections and diagrams are commentable', () => {
    const html = sample('diagrams.html');
    expect(entriesOf(html)).toContain('views/plain.js');
    expect(entriesOf(html)).toContain('components.js');
    const plain = parsePlainBase(jsonChild(html, 'dpk-view-plain'));
    expect(plain.title).not.toBe('');
    // Every declared section has a comment button, and every button names a section.
    const sections = plain.sections.map((section) => section.id);
    const buttons = [...html.matchAll(/data-dpk-comment="section:([^"]+)"/g)].map((match) => match[1]);
    const byName = (a: string | undefined, b: string | undefined): number => (a ?? '').localeCompare(b ?? '');
    expect([...buttons].sort(byName)).toEqual([...sections].sort(byName));
    // Element comments need a stable, unique id on every diagram (not the page or template wrapper).
    const diagrams = [...html.matchAll(/<dpk-(?!page\b|app\b|view-|internal-)[a-z-]+\b([^>]*)>/g)].map(
      (match) => match[1] ?? '',
    );
    const ids = diagrams.map((attributes) => /\bid="([^"]+)"/.exec(attributes)?.[1]);
    expect(ids).toHaveLength(7);
    expect(ids.every((id) => id !== undefined)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('example-mapping.html maps the flow through the example-mapping diagram', () => {
    const html = sample('example-mapping.html');
    expect(entriesOf(html)).toContain('components.js');
    const mapping = parseExampleMappingBase(jsonChild(html, 'dpk-board-example-mapping'));
    expect(mapping.title).not.toBe('');
    expect(mapping.stories.length).toBeGreaterThan(1);
    expect(mapping.rules.length).toBeGreaterThan(1);
    expect(mapping.examples.length).toBeGreaterThan(1);
    expect(mapping.questions.length).toBeGreaterThan(0);
    // Every rule hangs off a story, every example and question off a rule.
    // Parsing already rejects a bad reference, so the sample only asserts the
    // shape the board needs.
    expect(mapping.stories.map((story) => story.id)).toContain('cancel');
    expect(mapping.rules.map((rule) => rule.storyId)).toContain('cancel');
    expect(mapping.examples.map((example) => example.ruleId)).toContain('before-shipping');
    expect(mapping.questions.map((question) => question.ruleId)).toContain('before-shipping');
  });

  it('grill.html asks its questions over a plain page', () => {
    const html = sample('grill.html');
    expect(entriesOf(html)).toEqual(expect.arrayContaining(['views/plain.js', 'components.js']));
    expect(parsePlainBase(jsonChild(html, 'dpk-view-plain')).title).not.toBe('');
    const grill = parseGrill(JSON.parse(GRILL.exec(html)?.[1] ?? 'null'));
    expect(grill.questions.length).toBeGreaterThan(3);

    // The diagrams are the author's main area, annotated with question references.
    const er = parseErData(jsonChild(html, 'dpk-board-er-diagram'));
    expect(er.nodes.find((node) => node.id === 'refunds')?.status).toBe('added');
    expect(er.nodes.find((node) => node.id === 'orders')?.status).toBe('changed');
    expect(er.edges.filter((edge) => edge.status === 'added')).toHaveLength(1);
    const sequence = parseSequenceData(jsonChild(html, 'dpk-board-sequence-diagram'));
    expect(sequence.participants.map((participant) => participant.id)).toContain('refund');

    // Every badge points at a question, and every question has a badge.
    const refs = new Set(grill.questions.map((question) => question.ref));
    const referenced = [
      ...[...html.matchAll(/data-grill-questions="([^"]*)"/g)].flatMap((match) => (match[1] ?? '').split(/\s+/)),
      ...['dpk-board-er-diagram', 'dpk-board-sequence-diagram'].flatMap((tag) => questionsIn(jsonChild(html, tag))),
    ].filter((token) => token !== '');
    expect(referenced.length).toBeGreaterThan(0);
    for (const ref of referenced) expect(refs.has(ref), `${ref} has no question`).toBe(true);
    for (const ref of refs) expect(referenced).toContain(ref);
    expect(grill.questions.every((question) => question.options.length > 0)).toBe(true);
  });

  it('slides.html explains a mechanism through the slides template', () => {
    const html = sample('slides.html');
    expect(entriesOf(html)).toContain('views/slides.js');
    const deck = parseSlidesBase(jsonChild(html, 'dpk-view-slides'));
    expect(deck.title).not.toBe('');
    expect(new Set(deck.slides.map((slide) => slide.layout))).toEqual(new Set(['title', 'section', 'content']));

    // Every slide body is routed to a slide that exists.
    const ids = new Set(deck.slides.map((slide) => slide.id));
    const bodies = [...html.matchAll(/data-preview-id="([^"]*)"/g)].map((match) => match[1] ?? '');
    expect(bodies.length).toBeGreaterThan(0);
    for (const body of bodies) expect(ids.has(body), `${body} has no slide`).toBe(true);
  });

  it('task-board.html follows a task through the task-board template', () => {
    const html = sample('task-board.html');
    expect(entriesOf(html)).toContain('views/task-board.js');
    expect(entriesOf(html)).toContain('components.js');
    const board = parseTaskBoardBase(jsonChild(html, 'dpk-view-task-board'));
    expect(board.title).not.toBe('');
    expect(board.status).not.toBeNull();
    // The context tab reads as a design doc, with the diagrams under it.
    expect(board.context.why).not.toBeNull();
    expect(board.context.what).not.toBeNull();
    expect(board.context.goals.length).toBeGreaterThan(0);
    expect(board.context.nonGoals.length).toBeGreaterThan(0);
    expect(parseErData(jsonChild(html, 'dpk-board-er-diagram')).nodes.length).toBeGreaterThan(1);
    expect(parseSequenceData(jsonChild(html, 'dpk-board-sequence-diagram')).participants.length).toBeGreaterThan(1);
    expect([...html.matchAll(/<dpk-[a-z-]+\b[^>]*\bslot="main"/g)]).toHaveLength(2);
    // The log is a conversation: both sides speak in it.
    const kinds = new Set(
      board.log.map((entry) => board.members.find((member) => member.id === entry.from)?.kind ?? 'agent'),
    );
    expect(kinds).toEqual(new Set(['agent', 'human']));
    expect(new Set(board.todos.map((todo) => todo.status))).toEqual(new Set(['todo', 'doing', 'blocked', 'done']));
    // Proposals sit in the todo list, waiting to be accepted.
    expect(board.todos.some((todo) => todo.proposed && todo.reason !== null)).toBe(true);
    // Outputs of both kinds: a URL to open and a file path to copy.
    expect(board.outputs.some((output) => output.href.startsWith('https://'))).toBe(true);
    expect(board.outputs.some((output) => !output.href.includes('://'))).toBe(true);
    // Every kind of question: one the agent works around, one blocking with a
    // recommendation to approve and one blocking with nothing to fall back on.
    expect(board.questions.some((question) => !question.blocking)).toBe(true);
    expect(board.questions.some((question) => question.blocking && question.assumption !== null)).toBe(true);
    expect(board.questions.some((question) => question.blocking && question.assumption === null)).toBe(true);
    // A person has open todos too, so the "people" filter and their status select have something to show.
    const people = new Set(board.members.filter((member) => member.kind === 'human').map((member) => member.id));
    const theirs = board.todos.filter((todo) => todo.assignee !== null && people.has(todo.assignee));
    expect(theirs.some((todo) => todo.status !== 'done')).toBe(true);
  });

  it('delegation-poker.html deals the decisions the reader still has to play', () => {
    const html = sample('delegation-poker.html');
    expect(entriesOf(html)).toContain('views/delegation-poker.js');
    const poker = parseDelegationPokerBase(jsonChild(html, 'dpk-view-delegation-poker'));
    expect(poker.title).not.toBe('');
    expect(poker.players.length).toBeGreaterThan(1);
    // Most areas wait for the reader's card; one is already agreed, so the board shows both.
    expect(poker.decisions.filter((decision) => decision.agreed === undefined).length).toBeGreaterThan(3);
    expect(poker.decisions.some((decision) => decision.agreed !== undefined)).toBe(true);
    // The cards spread out somewhere, so the lowest and the highest have something to explain.
    expect(poker.decisions.some((decision) => new Set(decision.cards.map((card) => card.level)).size > 1)).toBe(true);
  });

  it('whiteboard.html lays out a brainstorm on the whiteboard diagram', () => {
    const html = sample('whiteboard.html');
    expect(entriesOf(html)).toContain('components.js');
    const board = parseWhiteboardBase(jsonChild(html, 'dpk-board-whiteboard'));
    expect(board.title).not.toBe('');
    // Every kind of item, and connectors with and without a label.
    expect(new Set(board.items.map((item) => item.kind))).toEqual(new Set(['sticky', 'text', 'shape', 'frame']));
    expect(board.connectors.some((connector) => connector.label !== undefined)).toBe(true);
    expect(board.connectors.some((connector) => connector.label === undefined)).toBe(true);
    // Each frame holds stickies, so moving one between frames has something to say.
    const frames = board.items.filter((item) => item.kind === 'frame');
    expect(frames.length).toBeGreaterThan(1);
    for (const frame of frames) {
      expect(board.items.some((item) => item.kind === 'sticky' && frameOf(board, item)?.id === frame.id)).toBe(true);
    }
  });

  it.each(['usm.html', 'whiteboard.html'])('%s announces changes about things the page has', (name) => {
    const html = sample(name);
    const log = parseChangeLog(JSON.parse(CHANGE_LOG.exec(html)?.[1] ?? 'null'));
    if (!log.ok) throw new Error(log.error);
    // A version before this one, so the bell shows how the history reads.
    expect(log.log.earlier.length).toBeGreaterThan(0);
    expect(log.log.latest.entries.length).toBeGreaterThan(0);
    const entries = revisionsOf(log.log).flatMap((revision) => revision.entries);
    const ids = entries.flatMap((entry) => entry.target?.split(':')[1]?.split('.').at(-1) ?? []);
    expect(ids.filter((id) => !html.includes(`"id": "${id}"`))).toEqual([]);
  });
});
