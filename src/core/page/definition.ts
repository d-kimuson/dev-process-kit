/**
 * The page as one template definition over its boards.
 *
 * Every action of a board carries the board in its target
 * (`story:pay@scope`), so one draft, one controller and one storage record
 * hold the whole page. Each action is validated, applied, canonicalized and
 * described by its own board's definition against that board's slice of the
 * state; the page never interprets an action across boards. An action whose
 * board is gone cannot apply, and the core reports it as stale
 * (`target-missing`) like an action on any missing target.
 *
 * Which boards the page holds is state as well (`layout`): the page's own
 * actions add a board of any template it knows, or take one away.
 */
import { any, object, optional, parse, string } from 'valibot';

import type {
  ActionDescription,
  ActionDescriptor,
  ActionTarget,
  CommentTargetOption,
  DraftAction,
  Navigation,
  NavigationPatch,
  TemplateDefinition,
} from '../types';
import type { PageMessages } from './messages';

import { ownAction, parseTemplateAction } from '../schema';
import { targetRef } from '../target';
import { pageActions } from './actions';
import { isPageWide, PAGE_WIDE_TARGET, qualify, qualifyRef, splitBoard } from './board-target';
import { BOARD_KEY, boardNavigation, pageKeysOf } from './navigation';

// oxlint-disable-next-line typescript/no-explicit-any -- each board brings its own state type; the page only routes it.
export type AnyDefinition = TemplateDefinition<any>;

/** One board as the page sees it: its id, how the rail names it, and its template. */
export type BoardSpec = {
  readonly id: string;
  readonly label: string;
  readonly definition: AnyDefinition;
};

/** Where a board sits on the page and what it is; its model lives in `PageState.boards`. */
export type BoardLayout = {
  readonly id: string;
  /** The template's name (`usm`), so `dpk-template-<template>` renders it. */
  readonly template: string;
  readonly label: string;
};

export type PageState = {
  readonly title: string;
  /** The boards in rail order. */
  readonly layout: readonly BoardLayout[];
  /** Each board's state, by board id. */
  readonly boards: Readonly<Record<string, unknown>>;
};

/** The boards the page's markup holds, each with the base its own JSON gives. */
export type PageBase = {
  readonly layout: readonly BoardLayout[];
  readonly boards: Readonly<Record<string, unknown>>;
};

export type PageSource = {
  /** Every board element on the page, read on every call: boards may still be arriving. */
  readonly boards: () => readonly BoardSpec[];
  /** The boards written in the page's markup, not the ones a draft added. */
  readonly base: () => PageBase;
  /** The templates a board can be added from. */
  readonly catalog: () => readonly AnyDefinition[];
  readonly messages: PageMessages;
};

const pageBaseSchema = object({ title: optional(string()) });

/**
 * Accepts any stored action of a board that is gone, so it stays in the draft
 * and is reported as stale instead of vanishing silently.
 */
const ORPHAN_DESCRIPTOR: ActionDescriptor = { schema: any(), mode: 'append', targetType: 'unknown' };

export const PAGE_TEMPLATE_NAME = 'page';

/** A board id for a new board of `template` that no board of the page has yet. */
export const freshBoardId = (template: string, taken: ReadonlySet<string>): string => {
  if (!taken.has(template)) return template;
  let index = 2;
  while (taken.has(`${template}-${index}`)) index += 1;
  return `${template}-${index}`;
};

export const pageDefinition = (source: PageSource): TemplateDefinition<PageState> => {
  const m = source.messages;
  const templateOf = (name: string): AnyDefinition | undefined =>
    source.catalog().find((definition) => definition.name === name);
  /** A board of the state, rendered by its element when it has one and by its template until then. */
  const specOf = (state: PageState, id: string): BoardSpec | undefined => {
    const entry = state.layout.find((board) => board.id === id);
    if (entry === undefined || !Object.hasOwn(state.boards, id)) return undefined;
    const definition = source.boards().find((board) => board.id === id)?.definition ?? templateOf(entry.template);
    return definition === undefined ? undefined : { id, label: entry.label, definition };
  };
  const specsOf = (state: PageState): readonly BoardSpec[] =>
    state.layout.flatMap((entry) => {
      const spec = specOf(state, entry.id);
      return spec === undefined ? [] : [spec];
    });
  const scoped = (state: PageState, target: ActionTarget) => {
    const split = splitBoard(target);
    if (split === null) return null;
    return { ...split, spec: specOf(state, split.board) };
  };
  const stripped = (action: DraftAction, target: ActionTarget): DraftAction => ({ ...action, target });
  const withBoard = (state: PageState, id: string, next: unknown): PageState => ({
    ...state,
    boards: { ...state.boards, [id]: next },
  });
  const activeBoard = (state: PageState, navigation: Navigation): BoardSpec | undefined => {
    const boards = specsOf(state);
    return boards.find((board) => board.id === navigation[BOARD_KEY]) ?? boards[0];
  };
  const fallbackDescription = (action: DraftAction, targetLabel: string): ActionDescription => ({
    title: action.type === 'comment' ? m.comment : action.type,
    targetLabel,
    tone: action.type === 'comment' ? 'comment' : 'meta',
  });
  const baseState = (title: string): PageState => {
    const base = source.base();
    return { title, layout: base.layout, boards: base.boards };
  };

  /** The page's own actions: a board comes or goes. */
  const applyPageAction = (state: PageState, action: DraftAction): PageState | null => {
    const parsed = parseTemplateAction(pageActions, action);
    if (parsed === null) return null;
    const { board } = parsed.payload;
    const present = state.layout.some((entry) => entry.id === board);
    if (parsed.type === 'ADD_BOARD') {
      const template = templateOf(parsed.payload.template);
      if (present || template === undefined) return null;
      const empty: unknown = template.emptyBase();
      return {
        ...state,
        layout: [...state.layout, { id: board, template: template.name, label: parsed.payload.label }],
        boards: { ...state.boards, [board]: empty },
      };
    }
    if (!present) return null;
    return {
      ...state,
      layout: state.layout.filter((entry) => entry.id !== board),
      boards: Object.fromEntries(Object.entries(state.boards).filter(([id]) => id !== board)),
    };
  };
  const describePageAction = (action: DraftAction): ActionDescription => {
    const parsed = parseTemplateAction(pageActions, action);
    if (parsed === null) return fallbackDescription(action, m.wholePage);
    if (parsed.type === 'ADD_BOARD') {
      const template = templateOf(parsed.payload.template)?.label ?? parsed.payload.template;
      return { title: m.boardAdded, targetLabel: `${parsed.payload.label} (${template})`, tone: 'create' };
    }
    const label = source.base().layout.find((entry) => entry.id === parsed.payload.board)?.label;
    return { title: m.boardRemoved, targetLabel: label ?? parsed.payload.board, tone: 'delete' };
  };

  return {
    name: PAGE_TEMPLATE_NAME,
    label: m.label,
    parseBase: (input) => baseState(parse(pageBaseSchema, input).title ?? m.untitled),
    emptyBase: () => baseState(m.untitled),
    // Read on every lookup: boards may still be arriving when the page starts.
    get actions() {
      return Object.fromEntries([
        ...source.boards().flatMap((board) => Object.entries(board.definition.actions)),
        ...Object.entries(pageActions),
      ]);
    },
    actionFor: (type, target) => {
      if (target === undefined || isPageWide(target)) return ownAction(pageActions, type);
      const split = splitBoard(target);
      if (split === null) return undefined;
      // Without the state, only a board that is on the page can name its vocabulary.
      const board = source.boards().find((spec) => spec.id === split.board);
      if (board === undefined) return ORPHAN_DESCRIPTOR;
      return ownAction(board.definition.actions, type);
    },
    apply: (state, action) => {
      if (isPageWide(action.target)) return applyPageAction(state, action);
      const board = scoped(state, action.target);
      if (board?.spec === undefined) return null;
      const next: unknown = board.spec.definition.apply(state.boards[board.board], stripped(action, board.target));
      return next === null ? null : withBoard(state, board.board, next);
    },
    canonicalState: (state) => ({
      ...state,
      boards: Object.fromEntries(
        Object.entries(state.boards).map(([id, value]) => {
          const definition = specOf(state, id)?.definition;
          return [id, definition?.canonicalState ? definition.canonicalState(value) : value];
        }),
      ),
    }),
    canonicalTarget: (state, target) => {
      const board = scoped(state, target);
      const definition = board?.spec?.definition;
      if (board === null || definition?.canonicalTarget === undefined) return target;
      return qualify(definition.canonicalTarget(state.boards[board.board], board.target), board.board);
    },
    hasTarget: (state, target) => {
      if (isPageWide(target)) return true;
      const board = scoped(state, target);
      if (board?.spec === undefined) return false;
      return board.spec.definition.hasTarget(state.boards[board.board], board.target);
    },
    pageTargetExists: (state, target) => isPageWide(target) || scoped(state, target)?.spec !== undefined,
    describe: (action, state, base) => {
      if (isPageWide(action.target)) {
        return action.type === 'comment' ? fallbackDescription(action, m.wholePage) : describePageAction(action);
      }
      const board = scoped(state, action.target);
      if (board === null) return fallbackDescription(action, targetRef(action.target));
      if (board.spec === undefined) return fallbackDescription(action, m.missingBoard(board.board));
      const description = board.spec.definition.describe(
        stripped(action, board.target),
        state.boards[board.board],
        base?.boards[board.board],
      );
      return { ...description, targetLabel: `${board.spec.label} › ${description.targetLabel}` };
    },
    serialize: (action) => {
      const split = splitBoard(action.target);
      const board = split === null ? undefined : source.boards().find((spec) => spec.id === split.board);
      if (split === null || board === undefined)
        return `${action.type} ${targetRef(action.target)} ${JSON.stringify(action.payload)}`;
      return `${board.definition.serialize(stripped(action, split.target))} @${split.board}`;
    },
    resolveNavigation: (state, navigation) => {
      const active = activeBoard(state, navigation);
      const result: Record<string, string> = active === undefined ? {} : { [BOARD_KEY]: active.id };
      for (const board of specsOf(state)) {
        const own = board.definition.resolveNavigation(state.boards[board.id], boardNavigation(navigation, board.id));
        Object.assign(result, pageKeysOf(board.id, own));
      }
      return result;
    },
    navigationFor: (state, target): NavigationPatch | null => {
      const board = scoped(state, target);
      if (board?.spec === undefined) return null;
      const own = board.spec.definition.navigationFor?.(state.boards[board.board], board.target) ?? null;
      return { [BOARD_KEY]: board.board, ...pageKeysOf(board.board, own ?? {}) };
    },
    commentTargets: (state, navigation): readonly CommentTargetOption[] => [
      { value: targetRef(PAGE_WIDE_TARGET), label: m.wholePage, group: m.pageGroup },
      ...specsOf(state).flatMap((board) =>
        board.definition
          .commentTargets(state.boards[board.id], boardNavigation(navigation, board.id))
          .map((option) => ({
            value: qualifyRef(option.value, board.id),
            label: option.label,
            group: option.group === undefined ? board.label : `${board.label} · ${option.group}`,
          })),
      ),
    ],
    currentTarget: (state, navigation) => {
      const board = activeBoard(state, navigation);
      if (board === undefined) return null;
      const current = board.definition.currentTarget?.(state.boards[board.id], boardNavigation(navigation, board.id));
      if (current === null || current === undefined)
        return { value: qualifyRef(`page:${board.definition.name}`, board.id), label: board.label };
      return { ...current, value: qualifyRef(current.value, board.id), label: `${board.label} › ${current.label}` };
    },
    title: (state) => state.title,
  };
};
