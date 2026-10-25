/**
 * The app as one view definition over its pages.
 *
 * Every action of a page carries the page in its target
 * (`story:pay@scope`), so one draft, one controller and one storage record
 * hold the whole document. Each action is validated, applied, canonicalized
 * and described by its own page content's definition against that page's
 * slice of the state; the app never interprets an action across pages. An
 * action whose page is gone cannot apply, and the core reports it as stale
 * (`target-missing`) like an action on any missing target.
 *
 * Which pages the app holds is state as well (`layout`): the app's own
 * actions add a page of any view or board it knows, or take one away.
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
  ViewDefinition,
} from '../types';
import type { AppMessages } from './messages';

import { PAGE_KEY, pageKeysOf, pageNavigation } from '../page/navigation';
import { APP_WIDE_TARGET, isAppWide, qualify, qualifyRef, splitPage } from '../page/page-target';
import { ownAction, parseViewAction } from '../schema';
import { targetRef } from '../target';
import { appActions } from './actions';

// oxlint-disable-next-line typescript/no-explicit-any -- each page brings its own state type; the app only routes it.
export type AnyDefinition = ViewDefinition<any>;

/** One page as the app sees it: its id, how the switcher names it, and its content's definition. */
export type PageSpec = {
  readonly id: string;
  readonly label: string;
  readonly definition: AnyDefinition;
};

/** Where a page sits in the app and what it holds; its model lives in `AppState.pages`. */
export type PageEntry = {
  readonly id: string;
  /** Which tier the page's content belongs to. */
  readonly kind: 'view' | 'board';
  /** The view's or board's name (`usm`, `er-diagram`), so `dpk-view-<content>` or `dpk-board-<content>` renders it. */
  readonly content: string;
  readonly label: string;
};

export type AppState = {
  readonly title: string;
  /** The pages in switcher order. */
  readonly layout: readonly PageEntry[];
  /** Each page's content state, by page id. */
  readonly pages: Readonly<Record<string, unknown>>;
};

/** The pages the app's markup holds, each with the base its own JSON gives. */
export type AppBase = {
  readonly layout: readonly PageEntry[];
  readonly pages: Readonly<Record<string, unknown>>;
};

export type AppSource = {
  /** Every page element in the app, read on every call: pages may still be arriving. */
  readonly pages: () => readonly PageSpec[];
  /** The pages written in the app's markup, not the ones a draft added. */
  readonly base: () => AppBase;
  /** The views and boards a page can be added from. */
  readonly catalog: () => readonly AnyDefinition[];
  readonly messages: AppMessages;
};

const appBaseSchema = object({ title: optional(string()) });

/**
 * Accepts any stored action of a page that is gone, so it stays in the draft
 * and is reported as stale instead of vanishing silently.
 */
const ORPHAN_DESCRIPTOR: ActionDescriptor = { schema: any(), mode: 'append', targetType: 'unknown' };

export const APP_TEMPLATE_NAME = 'app';

/** A page id for a new page of `content` that no page of the app has yet. */
export const freshPageId = (content: string, taken: ReadonlySet<string>): string => {
  if (!taken.has(content)) return content;
  let index = 2;
  while (taken.has(`${content}-${index}`)) index += 1;
  return `${content}-${index}`;
};

export const appDefinition = (source: AppSource): ViewDefinition<AppState> => {
  const m = source.messages;
  const contentOf = (kind: 'view' | 'board', name: string): AnyDefinition | undefined =>
    source.catalog().find((definition) => definition.kind === kind && definition.name === name);
  /** A page of the state, rendered by its element when it has one and by its content's definition until then. */
  const specOf = (state: AppState, id: string): PageSpec | undefined => {
    const entry = state.layout.find((page) => page.id === id);
    if (entry === undefined || !Object.hasOwn(state.pages, id)) return undefined;
    const definition =
      source.pages().find((page) => page.id === id)?.definition ?? contentOf(entry.kind, entry.content);
    return definition === undefined ? undefined : { id, label: entry.label, definition };
  };
  const specsOf = (state: AppState): readonly PageSpec[] =>
    state.layout.flatMap((entry) => {
      const spec = specOf(state, entry.id);
      return spec === undefined ? [] : [spec];
    });
  const scoped = (state: AppState, target: ActionTarget) => {
    const split = splitPage(target);
    if (split === null) return null;
    return { ...split, spec: specOf(state, split.page) };
  };
  const stripped = (action: DraftAction, target: ActionTarget): DraftAction => ({ ...action, target });
  const withPage = (state: AppState, id: string, next: unknown): AppState => ({
    ...state,
    pages: { ...state.pages, [id]: next },
  });
  const activePage = (state: AppState, navigation: Navigation): PageSpec | undefined => {
    const pages = specsOf(state);
    return pages.find((page) => page.id === navigation[PAGE_KEY]) ?? pages[0];
  };
  const fallbackDescription = (action: DraftAction, targetLabel: string): ActionDescription => ({
    title: action.type === 'comment' ? m.comment : action.type,
    targetLabel,
    tone: action.type === 'comment' ? 'comment' : 'meta',
  });
  const baseState = (title: string): AppState => {
    const base = source.base();
    return { title, layout: base.layout, pages: base.pages };
  };

  /** The app's own actions: a page comes or goes. */
  const applyAppAction = (state: AppState, action: DraftAction): AppState | null => {
    const parsed = parseViewAction(appActions, action);
    if (parsed === null) return null;
    const { page } = parsed.payload;
    const present = state.layout.some((entry) => entry.id === page);
    if (parsed.type === 'ADD_PAGE') {
      const content = contentOf(parsed.payload.kind, parsed.payload.content);
      if (present || content === undefined) return null;
      const empty: unknown = content.emptyBase();
      return {
        ...state,
        layout: [
          ...state.layout,
          { id: page, kind: parsed.payload.kind, content: content.name, label: parsed.payload.label },
        ],
        pages: { ...state.pages, [page]: empty },
      };
    }
    if (parsed.type === 'RENAME_PAGE') {
      if (!present) return null;
      return {
        ...state,
        layout: state.layout.map((entry) => (entry.id === page ? { ...entry, label: parsed.payload.label } : entry)),
      };
    }
    if (!present) return null;
    return {
      ...state,
      layout: state.layout.filter((entry) => entry.id !== page),
      pages: Object.fromEntries(Object.entries(state.pages).filter(([id]) => id !== page)),
    };
  };
  const describeAppAction = (action: DraftAction): ActionDescription => {
    const parsed = parseViewAction(appActions, action);
    if (parsed === null) return fallbackDescription(action, m.wholePage);
    if (parsed.type === 'ADD_PAGE') {
      const content = contentOf(parsed.payload.kind, parsed.payload.content)?.label ?? parsed.payload.content;
      return { title: m.pageAdded, targetLabel: `${parsed.payload.label} (${content})`, tone: 'create' };
    }
    if (parsed.type === 'RENAME_PAGE') {
      return { title: m.pageRenamed, targetLabel: parsed.payload.label, tone: 'update' };
    }
    const label = source.base().layout.find((entry) => entry.id === parsed.payload.page)?.label;
    return { title: m.pageRemoved, targetLabel: label ?? parsed.payload.page, tone: 'delete' };
  };

  return {
    kind: 'view',
    name: APP_TEMPLATE_NAME,
    label: m.label,
    parseBase: (input) => baseState(parse(appBaseSchema, input).title ?? m.untitled),
    emptyBase: () => baseState(m.untitled),
    // Read on every lookup: pages may still be arriving when the app starts.
    get actions() {
      return Object.fromEntries([
        ...source.pages().flatMap((page) => Object.entries(page.definition.actions)),
        ...Object.entries(appActions),
      ]);
    },
    actionFor: (type, target) => {
      if (target === undefined || isAppWide(target)) return ownAction(appActions, type);
      const split = splitPage(target);
      if (split === null) return undefined;
      // Without the state, only a page that is in the app can name its vocabulary.
      const page = source.pages().find((spec) => spec.id === split.page);
      if (page === undefined) return ORPHAN_DESCRIPTOR;
      return ownAction(page.definition.actions, type);
    },
    apply: (state, action) => {
      if (isAppWide(action.target)) return applyAppAction(state, action);
      const page = scoped(state, action.target);
      if (page?.spec === undefined) return null;
      const next: unknown = page.spec.definition.apply(state.pages[page.page], stripped(action, page.target));
      return next === null ? null : withPage(state, page.page, next);
    },
    canonicalState: (state) => ({
      ...state,
      pages: Object.fromEntries(
        Object.entries(state.pages).map(([id, value]) => {
          const definition = specOf(state, id)?.definition;
          return [id, definition?.canonicalState ? definition.canonicalState(value) : value];
        }),
      ),
    }),
    canonicalTarget: (state, target) => {
      const page = scoped(state, target);
      const definition = page?.spec?.definition;
      if (page === null || definition?.canonicalTarget === undefined) return target;
      return qualify(definition.canonicalTarget(state.pages[page.page], page.target), page.page);
    },
    hasTarget: (state, target) => {
      if (isAppWide(target)) return true;
      const page = scoped(state, target);
      if (page?.spec === undefined) return false;
      return page.spec.definition.hasTarget(state.pages[page.page], page.target);
    },
    pageTargetExists: (state, target) => isAppWide(target) || scoped(state, target)?.spec !== undefined,
    describe: (action, state, base) => {
      if (isAppWide(action.target)) {
        return action.type === 'comment' ? fallbackDescription(action, m.wholePage) : describeAppAction(action);
      }
      const page = scoped(state, action.target);
      if (page === null) return fallbackDescription(action, targetRef(action.target));
      if (page.spec === undefined) return fallbackDescription(action, m.missingPage(page.page));
      const description = page.spec.definition.describe(
        stripped(action, page.target),
        state.pages[page.page],
        base?.pages[page.page],
      );
      return { ...description, targetLabel: `${page.spec.label} › ${description.targetLabel}` };
    },
    serialize: (action) => {
      const split = splitPage(action.target);
      const page = split === null ? undefined : source.pages().find((spec) => spec.id === split.page);
      if (split === null || page === undefined)
        return `${action.type} ${targetRef(action.target)} ${JSON.stringify(action.payload)}`;
      return `${page.definition.serialize(stripped(action, split.target))} @${split.page}`;
    },
    resolveNavigation: (state, navigation) => {
      const active = activePage(state, navigation);
      const result: Record<string, string> = active === undefined ? {} : { [PAGE_KEY]: active.id };
      for (const page of specsOf(state)) {
        const own = page.definition.resolveNavigation(state.pages[page.id], pageNavigation(navigation, page.id));
        Object.assign(result, pageKeysOf(page.id, own));
      }
      return result;
    },
    navigationFor: (state, target): NavigationPatch | null => {
      const page = scoped(state, target);
      if (page?.spec === undefined) return null;
      const own = page.spec.definition.navigationFor?.(state.pages[page.page], page.target) ?? null;
      return { [PAGE_KEY]: page.page, ...pageKeysOf(page.page, own ?? {}) };
    },
    commentTargets: (state, navigation): readonly CommentTargetOption[] => [
      { value: targetRef(APP_WIDE_TARGET), label: m.wholePage, group: m.pageGroup },
      ...specsOf(state).flatMap((page) =>
        page.definition.commentTargets(state.pages[page.id], pageNavigation(navigation, page.id)).map((option) => ({
          value: qualifyRef(option.value, page.id),
          label: option.label,
          group: option.group === undefined ? page.label : `${page.label} · ${option.group}`,
        })),
      ),
    ],
    currentTarget: (state, navigation) => {
      const page = activePage(state, navigation);
      if (page === undefined) return null;
      const current = page.definition.currentTarget?.(state.pages[page.id], pageNavigation(navigation, page.id));
      if (current === null || current === undefined)
        return { value: qualifyRef(`page:${page.definition.name}`, page.id), label: page.label, group: m.pageGroup };
      return { ...current, value: qualifyRef(current.value, page.id), label: `${page.label} › ${current.label}` };
    },
    title: (state) => state.title,
  };
};
