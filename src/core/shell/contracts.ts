/**
 * The element-side contracts a template and slot content see.
 *
 * `TemplateElement` implements `TemplateApi`; `TemplateRenderContext` is the
 * read-only view handed to templates and author slot content.
 */
import type { TemplateResult, nothing } from 'lit';

import type { DraftExport } from '../controller';
import type { StaleAction } from '../derive';
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

export type TemplateSnapshot<S> = {
  readonly base: S;
  readonly state: S;
  readonly navigation: Navigation;
  readonly actions: readonly DraftAction[];
  readonly comments: readonly DraftAction[];
  readonly stale: readonly StaleAction[];
  readonly issues: readonly ValidationIssue[];
};

/** Read-only view handed to slot content and template components. */
export type TemplateRenderContext<S> = {
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

export type TemplateApi<S> = {
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
  removeAction(id: string): void;
  clearActions(): void;
  importDraft(actions: readonly DraftAction[]): void;
  navigate(patch: NavigationPatch, options?: { replace?: boolean }): void;
  hashFor(patch: NavigationPatch): string;
  snapshot(): TemplateSnapshot<S>;
  exportDraft(): DraftExport;
  exportBrief(): string;
  subscribe(listener: (snapshot: TemplateSnapshot<S>) => void): () => void;
};

export type ShellRegions = {
  readonly header?: TemplateResult | typeof nothing;
  readonly sidebar?: TemplateResult | typeof nothing;
  readonly sidebarHidden?: boolean;
  readonly main?: TemplateResult | typeof nothing;
  readonly footer?: TemplateResult | typeof nothing;
};
