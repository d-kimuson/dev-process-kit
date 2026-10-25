/**
 * The element-side contracts a template and slot content see.
 *
 * `ViewElement` implements `ViewApi`; `ViewRenderContext` is the
 * read-only view handed to templates and author slot content.
 */
import type { TemplateResult, nothing } from 'lit';

import type { DraftExport } from '../controller';
import type { StaleAction } from '../derive';
import type { Grill, GrillAnswers } from '../grill';
import type {
  ActionInput,
  BatchDispatchOutcome,
  ActionTarget,
  DispatchOutcome,
  DraftAction,
  Navigation,
  NavigationPatch,
  ValidationIssue,
} from '../types';

export type ViewSnapshot<S> = {
  readonly base: S;
  readonly state: S;
  readonly navigation: Navigation;
  readonly actions: readonly DraftAction[];
  readonly comments: readonly DraftAction[];
  readonly stale: readonly StaleAction[];
  readonly issues: readonly ValidationIssue[];
  /** The questions the page asks (`data-dpk-grill`), and the reader's answers so far. */
  readonly grill: Grill;
  readonly answers: GrillAnswers;
};

/** Read-only view handed to slot content and template components. */
export type ViewRenderContext<S> = {
  readonly state: S;
  readonly base: S;
  readonly navigation: Navigation;
  readonly actions: readonly DraftAction[];
  readonly comments: readonly DraftAction[];
  readonly stale: readonly StaleAction[];
  readonly commentCount: (target: string | ActionTarget) => number;
  readonly dispatch: (input: ActionInput) => DispatchOutcome;
  readonly dispatchBatch: (inputs: readonly ActionInput[]) => BatchDispatchOutcome;
  readonly navigate: (patch: NavigationPatch, options?: { replace?: boolean }) => void;
  readonly hashFor: (patch: NavigationPatch) => string;
  readonly requestComment: (target: string | ActionTarget) => void;
};

export type ViewApi<S> = {
  readonly version: string;
  readonly template: string;
  readonly host: HTMLElement;
  readonly ready: Promise<void>;
  readonly base: S;
  readonly state: S;
  readonly navigation: Navigation;
  readonly actions: readonly DraftAction[];
  readonly comments: readonly DraftAction[];
  readonly stale: readonly StaleAction[];
  readonly issues: readonly ValidationIssue[];
  dispatch(input: ActionInput): DispatchOutcome;
  dispatchBatch(inputs: readonly ActionInput[]): BatchDispatchOutcome;
  comment(target: string | ActionTarget, body: string): DispatchOutcome;
  /** Replaces the body of a comment already in the draft; its target and place stay. */
  editComment(id: string, body: string): DispatchOutcome;
  removeAction(id: string): void;
  clearActions(): void;
  importDraft(actions: readonly DraftAction[]): void;
  navigate(patch: NavigationPatch, options?: { replace?: boolean }): void;
  hashFor(patch: NavigationPatch): string;
  snapshot(): ViewSnapshot<S>;
  exportDraft(): DraftExport;
  exportBrief(): string;
  subscribe(listener: (snapshot: ViewSnapshot<S>) => void): () => void;
};

/**
 * What a template draws into the shell. Every region is optional: a sidebar
 * (or the aside, or the rail) with no content, rendered or slotted by the
 * author, takes no room and draws no buttons.
 */
export type ShellRegions = {
  readonly header?: TemplateResult | typeof nothing;
  /** On the side `sidebarLayout` names; the author's `slot="sidebar"` content joins it. */
  readonly sidebar?: TemplateResult | typeof nothing;
  readonly sidebarHidden?: boolean;
  /** A fixed column before everything else, that never folds (the page's boards). */
  readonly rail?: TemplateResult | typeof nothing;
  readonly main?: TemplateResult | typeof nothing;
  readonly footer?: TemplateResult | typeof nothing;
};
