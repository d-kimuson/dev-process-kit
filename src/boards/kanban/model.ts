import * as v from 'valibot';

import type { ElementActionResult } from '../../core/element-actions';
import type { DraftAction } from '../../core/types';
import type { KanbanMessages } from './messages';

import { httpUrlSchema } from '../../lib/link';
import { elementRefSegments } from '../base/model';

/**
 * Domain model of the kanban board: columns in reading order (left to right),
 * each holding its cards in priority order (top to bottom). Column and card ids
 * are unique on the board, so a card is found without knowing its column.
 *
 * Reviewers reshape the board from the page: `ADD_CARD` and `MOVE_CARD` element
 * actions are replayed over the authored board (`reduceKanbanActions`) and the
 * cards they touch are marked, so the agent can fold them into the JSON later.
 */

/** A card's number, unique on the board; it is the `TASK-<number>` key people say. */
const cardNumberSchema = v.pipe(v.number(), v.integer(), v.minValue(1));

/** A card's link: a web address and an optional label to read it by (esa, Slack, a PR). */
export type KanbanLink = {
  readonly url: string;
  readonly label: string | null;
};

const linkSchema = v.strictObject({
  url: httpUrlSchema,
  label: v.exactOptional(v.pipe(v.string(), v.minLength(1))),
});

const cardSchema = v.strictObject({
  id: v.pipe(v.string(), v.minLength(1)),
  number: v.optional(cardNumberSchema),
  title: v.pipe(v.string(), v.minLength(1)),
  description: v.optional(v.string()),
  tags: v.optional(v.array(v.string())),
  assignee: v.optional(v.string()),
  links: v.optional(v.array(linkSchema)),
  questions: v.optional(v.string()),
});

/** Theme accents a column heading can take; named so they follow the theme. */
export const KANBAN_COLORS = ['gray', 'blue', 'green', 'amber', 'violet', 'red'] as const;

export type KanbanColor = (typeof KANBAN_COLORS)[number];

const columnSchema = v.strictObject({
  id: v.pipe(v.string(), v.minLength(1)),
  label: v.pipe(v.string(), v.minLength(1)),
  description: v.optional(v.string()),
  color: v.optional(v.picklist(KANBAN_COLORS)),
  limit: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1))),
  cards: v.optional(v.array(cardSchema)),
});

const boardSchema = v.strictObject({ columns: v.array(columnSchema) });

/** What a draft action did to a card: `added` wins over `moved`. */
export type KanbanCardChange = 'added' | 'moved' | null;

export type KanbanCard = {
  readonly id: string;
  /**
   * The card's number, unique on the board: people call the card by its key
   * `TASK-<number>`. Data that leaves it out numbers the card after the
   * highest number, in board order.
   */
  readonly number: number;
  readonly title: string;
  readonly description: string | null;
  readonly tags: readonly string[];
  readonly assignee: string | null;
  /** Related links, in the order the card lists them. */
  readonly links: readonly KanbanLink[];
  /** Space-separated grill question ids. */
  readonly questions?: string;
  /** Id of the column the card is in now. */
  readonly column: string;
  readonly change: KanbanCardChange;
};

export type KanbanColumn = {
  readonly id: string;
  readonly label: string;
  readonly description: string | null;
  /** Accent of the heading; `null` keeps it plain. */
  readonly color: KanbanColor | null;
  /** WIP limit; `null` when the column has none. */
  readonly limit: number | null;
  readonly cards: readonly KanbanCard[];
};

export type KanbanData = { readonly columns: readonly KanbanColumn[] };

/** Where a card goes: before `before` in `column`, or at its end when `before` is `null`. */
export type KanbanPosition = { readonly column: string; readonly before: string | null };

export const emptyKanbanData = (): KanbanData => ({ columns: [] });

/* ------------------------------------------------------------------ parsing */

export const parseKanbanData = (input: unknown): KanbanData => {
  const parsed = v.parse(boardSchema, input);
  const columnIds = new Set<string>();
  const cardIds = new Set<string>();
  // Authored numbers stay as they are; a card without one takes the next number
  // after the highest, in board order (column order, then card order).
  const numbers = parsed.columns.flatMap((column) =>
    (column.cards ?? []).flatMap((card) => (card.number === undefined ? [] : [card.number])),
  );
  const repeated = numbers.find((number, index) => numbers.indexOf(number) !== index);
  if (repeated !== undefined) throw new Error(`duplicate card number: ${repeated}`);
  let nextNumber = Math.max(0, ...numbers);
  const columns = parsed.columns.map((column): KanbanColumn => {
    if (columnIds.has(column.id)) throw new Error(`duplicate column id: ${column.id}`);
    columnIds.add(column.id);
    return {
      id: column.id,
      label: column.label,
      description: column.description ?? null,
      color: column.color ?? null,
      limit: column.limit ?? null,
      cards: (column.cards ?? []).map((card): KanbanCard => {
        if (cardIds.has(card.id)) throw new Error(`duplicate card id: ${card.id}`);
        cardIds.add(card.id);
        const links = (card.links ?? []).map((link): KanbanLink => ({ url: link.url, label: link.label ?? null }));
        const urls = links.map((link) => link.url);
        if (new Set(urls).size !== urls.length) throw new Error(`card "${card.id}" links the same URL twice`);
        return {
          id: card.id,
          number: card.number ?? ++nextNumber,
          title: card.title,
          description: card.description ?? null,
          tags: card.tags ?? [],
          assignee: card.assignee ?? null,
          links,
          ...(card.questions === undefined ? {} : { questions: card.questions }),
          column: column.id,
          change: null,
        };
      }),
    };
  });
  return { columns };
};

/* ---------------------------------------------------------------- structure */

export const findCard = (data: KanbanData, id: string): KanbanCard | undefined =>
  data.columns.flatMap((column) => column.cards).find((card) => card.id === id);

export const allCards = (data: KanbanData): readonly KanbanCard[] => data.columns.flatMap((column) => column.cards);

/** Every column stays, so the board keeps its shape; only non-matching cards go. */
export const visibleKanban = (data: KanbanData, matches: ((card: KanbanCard) => boolean) | null): KanbanData =>
  matches === null
    ? data
    : { columns: data.columns.map((column) => ({ ...column, cards: column.cards.filter(matches) })) };

/** Whether moving `id` to `column` before `before` would leave it where it is. */
export const isSamePosition = (data: KanbanData, id: string, column: string, before: string | null): boolean => {
  const card = findCard(data, id);
  if (card === undefined || card.column !== column) return false;
  if (before === id) return true;
  const cards = data.columns.find((item) => item.id === column)?.cards ?? [];
  const index = cards.findIndex((item) => item.id === id);
  return (cards[index + 1]?.id ?? null) === before;
};

/* --------------------------------------------------------------- card keys */

/** The key people call a card by: `TASK-12`. */
export const cardKey = (card: Pick<KanbanCard, 'number'>): string => `TASK-${card.number}`;

/** The number a card added now takes: one after the highest on the board. */
export const nextCardNumber = (data: KanbanData): number =>
  Math.max(0, ...allCards(data).map((card) => card.number)) + 1;

/* ---------------------------------------------------------- element actions */

export const ADD_CARD = 'ADD_CARD';
export const MOVE_CARD = 'MOVE_CARD';
export const SET_CARD_TITLE = 'SET_CARD_TITLE';
export const SET_CARD_DESCRIPTION = 'SET_CARD_DESCRIPTION';
export const SET_CARD_ASSIGNEE = 'SET_CARD_ASSIGNEE';
export const ADD_CARD_TAG = 'ADD_CARD_TAG';
export const REMOVE_CARD_TAG = 'REMOVE_CARD_TAG';
export const ADD_CARD_LINK = 'ADD_CARD_LINK';
export const REMOVE_CARD_LINK = 'REMOVE_CARD_LINK';

const addCardPayloadSchema = v.object({
  id: v.pipe(v.string(), v.minLength(1)),
  title: v.pipe(v.string(), v.trim(), v.minLength(1)),
  /** A stored draft names the number it took; without one the card takes the next free number. */
  number: v.optional(cardNumberSchema),
});

const moveCardPayloadSchema = v.object({
  column: v.pipe(v.string(), v.minLength(1)),
  before: v.nullable(v.pipe(v.string(), v.minLength(1))),
});

/** `<board-id>/<kind>/<id>` → the id, when the kind matches. */
const idOfTarget = (targetId: string, kind: 'column' | 'card'): string | null => {
  const segments = elementRefSegments(targetId);
  return segments?.length === 3 && segments[1] === kind ? (segments[2] ?? null) : null;
};

const withoutCard = (data: KanbanData, id: string): KanbanData => ({
  columns: data.columns.map((column) =>
    column.cards.some((card) => card.id === id)
      ? { ...column, cards: column.cards.filter((card) => card.id !== id) }
      : column,
  ),
});

const insertCard = (data: KanbanData, card: KanbanCard, position: KanbanPosition): KanbanData => ({
  columns: data.columns.map((column) => {
    if (column.id !== position.column) return column;
    const placed = { ...card, column: column.id };
    const index = position.before === null ? -1 : column.cards.findIndex((item) => item.id === position.before);
    return {
      ...column,
      cards:
        index < 0 ? [...column.cards, placed] : [...column.cards.slice(0, index), placed, ...column.cards.slice(index)],
    };
  }),
});

type Step = { readonly data: KanbanData; readonly result: ElementActionResult };

const addCard = (m: KanbanMessages, data: KanbanData, action: DraftAction): Step => {
  const title = m.addCardTitle;
  const columnId = idOfTarget(action.target.id, 'column');
  const column = data.columns.find((item) => item.id === columnId);
  if (column === undefined) return { data, result: { id: action.id, title, stale: 'target-missing' } };
  const payload = v.safeParse(addCardPayloadSchema, action.payload);
  if (!payload.success || findCard(data, payload.output.id) !== undefined) {
    return { data, result: { id: action.id, title, stale: 'constraint-violated' } };
  }
  const number = payload.output.number ?? nextCardNumber(data);
  if (allCards(data).some((card) => card.number === number)) {
    return { data, result: { id: action.id, title, stale: 'constraint-violated' } };
  }
  const card: KanbanCard = {
    id: payload.output.id,
    number,
    title: payload.output.title,
    description: null,
    tags: [],
    assignee: null,
    links: [],
    column: column.id,
    change: 'added',
  };
  return {
    data: insertCard(data, card, { column: column.id, before: null }),
    result: { id: action.id, title, summary: m.addSummary(column.label, card.title), tone: 'create' },
  };
};

const moveCard = (m: KanbanMessages, data: KanbanData, action: DraftAction): Step => {
  const title = m.moveCardTitle;
  const cardId = idOfTarget(action.target.id, 'card');
  const card = cardId === null ? undefined : findCard(data, cardId);
  if (card === undefined) return { data, result: { id: action.id, title, stale: 'target-missing' } };
  const payload = v.safeParse(moveCardPayloadSchema, action.payload);
  const from = data.columns.find((column) => column.id === card.column);
  const to = payload.success ? data.columns.find((column) => column.id === payload.output.column) : undefined;
  const before = payload.success ? payload.output.before : null;
  const beforeFound = before === null || (before !== card.id && to?.cards.some((item) => item.id === before) === true);
  if (!payload.success || from === undefined || to === undefined || !beforeFound) {
    return { data, result: { id: action.id, title, stale: 'constraint-violated' } };
  }
  const moved: KanbanCard = { ...card, change: card.change ?? 'moved' };
  const summary =
    from.id === to.id ? m.moveSummarySame(card.title, to.label) : m.moveSummaryAcross(card.title, from.label, to.label);
  return {
    data: insertCard(withoutCard(data, card.id), moved, { column: to.id, before }),
    result: { id: action.id, title, summary, tone: 'move' },
  };
};

/** A card edit: the next card, or `null` when the patch cannot apply. */
type CardEdit = (card: KanbanCard) => KanbanCard | null;

/** Replaces one card in place, keeping its column and its order. */
const withCard = (data: KanbanData, next: KanbanCard): KanbanData => ({
  columns: data.columns.map((column) =>
    column.cards.some((card) => card.id === next.id)
      ? { ...column, cards: column.cards.map((card) => (card.id === next.id ? next : card)) }
      : column,
  ),
});

/** Applies one edit to the card a target names, and reports it as applied or stale. */
const editCard = (m: KanbanMessages, data: KanbanData, action: DraftAction, title: string, edit: CardEdit): Step => {
  const cardId = idOfTarget(action.target.id, 'card');
  const card = cardId === null ? undefined : findCard(data, cardId);
  if (card === undefined) return { data, result: { id: action.id, title, stale: 'target-missing' } };
  const next = edit(card);
  if (next === null) return { data, result: { id: action.id, title, stale: 'constraint-violated' } };
  return {
    data: withCard(data, next),
    result: { id: action.id, title, summary: m.editSummary(cardKey(card), card.title), tone: 'update' },
  };
};

const setCardTitlePayload = v.object({ title: v.pipe(v.string(), v.trim(), v.minLength(1)) });
const setCardDescriptionPayload = v.object({ description: v.string() });
const setCardAssigneePayload = v.object({ assignee: v.string() });
const cardTagPayload = v.object({ tag: v.pipe(v.string(), v.trim(), v.minLength(1)) });
const addCardLinkPayload = v.object({
  url: httpUrlSchema,
  label: v.exactOptional(v.pipe(v.string(), v.trim(), v.minLength(1))),
});
const removeCardLinkPayload = v.object({ url: v.pipe(v.string(), v.minLength(1)) });

const setCardTitle = (m: KanbanMessages, data: KanbanData, action: DraftAction): Step => {
  const payload = v.safeParse(setCardTitlePayload, action.payload);
  if (!payload.success)
    return { data, result: { id: action.id, title: m.setTitleTitle, stale: 'constraint-violated' } };
  return editCard(m, data, action, m.setTitleTitle, (card) => ({ ...card, title: payload.output.title }));
};

const setCardDescription = (m: KanbanMessages, data: KanbanData, action: DraftAction): Step => {
  const payload = v.safeParse(setCardDescriptionPayload, action.payload);
  if (!payload.success)
    return { data, result: { id: action.id, title: m.setDescriptionTitle, stale: 'constraint-violated' } };
  const description = payload.output.description.trim() === '' ? null : payload.output.description;
  return editCard(m, data, action, m.setDescriptionTitle, (card) => ({ ...card, description }));
};

const setCardAssignee = (m: KanbanMessages, data: KanbanData, action: DraftAction): Step => {
  const payload = v.safeParse(setCardAssigneePayload, action.payload);
  if (!payload.success)
    return { data, result: { id: action.id, title: m.setAssigneeTitle, stale: 'constraint-violated' } };
  const assignee = payload.output.assignee.trim() === '' ? null : payload.output.assignee.trim();
  return editCard(m, data, action, m.setAssigneeTitle, (card) => ({ ...card, assignee }));
};

const addCardTag = (m: KanbanMessages, data: KanbanData, action: DraftAction): Step => {
  const payload = v.safeParse(cardTagPayload, action.payload);
  if (!payload.success) return { data, result: { id: action.id, title: m.addTagTitle, stale: 'constraint-violated' } };
  const tag = payload.output.tag;
  return editCard(m, data, action, m.addTagTitle, (card) =>
    card.tags.includes(tag) ? null : { ...card, tags: [...card.tags, tag] },
  );
};

const removeCardTag = (m: KanbanMessages, data: KanbanData, action: DraftAction): Step => {
  const payload = v.safeParse(cardTagPayload, action.payload);
  if (!payload.success)
    return { data, result: { id: action.id, title: m.removeTagTitle, stale: 'constraint-violated' } };
  const tag = payload.output.tag;
  return editCard(m, data, action, m.removeTagTitle, (card) =>
    !card.tags.includes(tag) ? null : { ...card, tags: card.tags.filter((item) => item !== tag) },
  );
};

const addCardLink = (m: KanbanMessages, data: KanbanData, action: DraftAction): Step => {
  const payload = v.safeParse(addCardLinkPayload, action.payload);
  if (!payload.success) return { data, result: { id: action.id, title: m.addLinkTitle, stale: 'constraint-violated' } };
  const link: KanbanLink = { url: payload.output.url, label: payload.output.label ?? null };
  return editCard(m, data, action, m.addLinkTitle, (card) =>
    card.links.some((item) => item.url === link.url) ? null : { ...card, links: [...card.links, link] },
  );
};

const removeCardLink = (m: KanbanMessages, data: KanbanData, action: DraftAction): Step => {
  const payload = v.safeParse(removeCardLinkPayload, action.payload);
  if (!payload.success)
    return { data, result: { id: action.id, title: m.removeLinkTitle, stale: 'constraint-violated' } };
  const url = payload.output.url;
  return editCard(m, data, action, m.removeLinkTitle, (card) =>
    !card.links.some((item) => item.url === url)
      ? null
      : { ...card, links: card.links.filter((item) => item.url !== url) },
  );
};

/**
 * Replays the draft's element actions over the authored board, in order.
 * Each action is reported on: applied, or why it is stale. Pure.
 */
export const reduceKanbanActions = (
  m: KanbanMessages,
  data: KanbanData,
  actions: readonly DraftAction[],
): { readonly data: KanbanData; readonly results: readonly ElementActionResult[] } => {
  let board = data;
  const results: ElementActionResult[] = [];
  for (const action of actions) {
    const step =
      action.type === ADD_CARD
        ? addCard(m, board, action)
        : action.type === MOVE_CARD
          ? moveCard(m, board, action)
          : action.type === SET_CARD_TITLE
            ? setCardTitle(m, board, action)
            : action.type === SET_CARD_DESCRIPTION
              ? setCardDescription(m, board, action)
              : action.type === SET_CARD_ASSIGNEE
                ? setCardAssignee(m, board, action)
                : action.type === ADD_CARD_TAG
                  ? addCardTag(m, board, action)
                  : action.type === REMOVE_CARD_TAG
                    ? removeCardTag(m, board, action)
                    : action.type === ADD_CARD_LINK
                      ? addCardLink(m, board, action)
                      : action.type === REMOVE_CARD_LINK
                        ? removeCardLink(m, board, action)
                        : {
                            data: board,
                            result: { id: action.id, title: action.type, stale: 'unsupported-action-type' as const },
                          };
    board = step.data;
    results.push(step.result);
  }
  return { data: board, results };
};
