/**
 * Targets inside a page are qualified by the page they belong to:
 * `<type>:<id>@<page>` (`story:checkout.pay@scope`). The qualifier is split
 * off at the last `@`; page names cannot contain one, so a component id that
 * does stays intact. `app:app` is the whole document and is never qualified.
 */
import type { ActionTarget } from '../types';

import { APP_TARGET_TYPE } from '../derive';

export const PAGE_SEPARATOR = '@';
export const APP_WIDE_TARGET: ActionTarget = Object.freeze({ type: APP_TARGET_TYPE, id: 'app' });

/** Page names follow the common id rule, which keeps `@` and `.` out of them. */
export const PAGE_NAME_PATTERN = /^[A-Za-z0-9_-]+$/;

export type PageTarget = {
  readonly page: string;
  /** The target as the page content itself knows it, without the qualifier. */
  readonly target: ActionTarget;
};

export const isAppWide = (target: ActionTarget): boolean =>
  target.type === APP_WIDE_TARGET.type && target.id === APP_WIDE_TARGET.id;

/** The page a target names, or `null` when it names none (app-wide, or a question of the app). */
export const splitPage = (target: ActionTarget): PageTarget | null => {
  const index = target.id.lastIndexOf(PAGE_SEPARATOR);
  if (index < 0) return null;
  const page = target.id.slice(index + 1);
  if (!PAGE_NAME_PATTERN.test(page)) return null;
  return { page, target: { type: target.type, id: target.id.slice(0, index) } };
};

export const qualify = (target: ActionTarget, page: string): ActionTarget => ({
  type: target.type,
  id: `${target.id}${PAGE_SEPARATOR}${page}`,
});

/**
 * Resolves a target written inside a page: one that already names a page of
 * the app keeps it, the app as a whole stays the app, and anything else
 * belongs to `page`.
 */
export const resolvePageTarget = (target: ActionTarget, page: string, pages: ReadonlySet<string>): ActionTarget => {
  if (isAppWide(target)) return target;
  const scoped = splitPage(target);
  if (scoped !== null && pages.has(scoped.page)) return target;
  return qualify(target, page);
};

/** The string form of `qualify`, for refs offered to the comment composer. */
export const qualifyRef = (ref: string, page: string): string => `${ref}${PAGE_SEPARATOR}${page}`;
