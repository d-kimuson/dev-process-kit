/**
 * A diagram as its own board (ADR 20261023_diagram-as-board).
 *
 * A diagram component owns no template-like machinery of its own: when it
 * acts as a full board of `<dpk-page>` (or stands alone, outside any page),
 * it needs only a `ViewDefinition` to drive a `DraftController` with —
 * exactly what a template needs. This is that definition, generic over every
 * diagram: the diagram keeps no state of its own (`DiagramBoardState`), since
 * its real data is the element actions its own `BoardChromeBase` already
 * replays over its authored JSON (ADR 20260924_component-element-actions).
 * `derive()` never calls `apply()` for an element action or a comment, so
 * this definition's own state is never touched by either.
 *
 * `withComponentSnapshot` (./comment-targets) is the same wrapper an
 * embedded diagram's host template already uses to recognize its element
 * actions' targets and describe them in the review list; a diagram-as-board
 * reuses it on itself, as its own (and only) provider.
 */
import type { ElementActionResult } from './element-actions';
import type { CommentTargetOption, ViewDefinition } from './types';

import { withComponentSnapshot } from './comment-targets';
import { targetRef } from './target';

/** A diagram board keeps nothing of its own: see the module doc. */
export type DiagramBoardState = Record<string, never>;

const EMPTY_STATE: DiagramBoardState = {};

export type DiagramBoardSource = {
  /** The board's definition name (the page's `BoardLayout.template`). */
  readonly name: string;
  /** Shown in the page's board switcher and review list. */
  readonly label: string;
  /** Whether the app's add-page menu offers an empty page of this board. */
  readonly addable?: boolean;
  /** The diagram's own live comment targets, read fresh on every call. */
  readonly commentTargets?: () => readonly CommentTargetOption[];
  /** How each of the diagram's own element actions applied, for the review list. */
  readonly elementActionResults?: () => readonly ElementActionResult[];
};

/**
 * A `ViewDefinition` for a diagram acting as a whole board. Call it fresh
 * wherever a live, externally-read `definition` is needed (e.g. a page's own
 * global comment composer); a `DraftController` that owns the actual draft
 * instead keeps itself fresh through `setComponentSnapshot` (the same
 * mechanism an embedded component's host uses), so it only needs the bare
 * form — omit `commentTargets`/`elementActionResults` for that case.
 */
export const diagramBoardDefinition = (source: DiagramBoardSource): ViewDefinition<DiagramBoardState> => {
  const bare: ViewDefinition<DiagramBoardState> = {
    kind: 'board',
    name: source.name,
    label: source.label,
    addable: source.addable ?? false,
    parseBase: () => EMPTY_STATE,
    emptyBase: () => EMPTY_STATE,
    actions: {},
    apply: () => null,
    hasTarget: () => false,
    describe: (action) => ({ title: action.type, targetLabel: targetRef(action.target), tone: 'meta' }),
    serialize: (action) => `${action.type} ${targetRef(action.target)} ${JSON.stringify(action.payload)}`,
    resolveNavigation: () => ({}),
    commentTargets: () => [],
    title: () => source.label,
  };
  const targets = source.commentTargets?.() ?? [];
  const results = new Map((source.elementActionResults?.() ?? []).map((result) => [result.id, result] as const));
  return withComponentSnapshot(bare, targets, results);
};
