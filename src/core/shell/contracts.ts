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
  /**
   * The template's own controls in the screen's header row, after the page's
   * title; the author's `slot="header"` markup joins them. A page content that
   * sits inside a page draws them in a bar of its own instead, since the page
   * owns the screen's one header.
   */
  readonly header?: TemplateResult | typeof nothing;
  /** On the side `sidebarLayout` names; the author's `slot="sidebar"` content joins it. */
  readonly sidebar?: TemplateResult | typeof nothing;
  readonly sidebarHidden?: boolean;
  /** A fixed column before everything else, that never folds (a template's own rail). */
  readonly rail?: TemplateResult | typeof nothing;
  readonly main?: TemplateResult | typeof nothing;
  readonly footer?: TemplateResult | typeof nothing;
};

/**
 * One section of the settings dialog, rendered by the template that owns it.
 * `ViewElement.renderSettingsSections` returns them in reading order; the
 * dialog puts the kit's own `display` section first, shows one at a time, and
 * draws a secondary nav of their labels only when there is more than one.
 *
 * A section is rendered in the shadow root of the element that **draws** the
 * dialog, which is the chrome owner — `<dpk-app>` for a page inside it — not
 * the template's own root. The template's page CSS does not reach there, so a
 * section that relies on it renders unstyled inside an app: a section has to
 * be self-styled, i.e. render an element with its own shadow root and its own
 * styles (as `<dpk-internal-usm-settings-section>` does), or carry no styling of its
 * own at all.
 */
export type SettingsSection<S> = {
  /** Stable within the template; `openSettings(id)` opens the dialog on it. */
  readonly id: string;
  /** The section's label in the dialog's nav. */
  readonly label: string;
  readonly render: (context: ViewRenderContext<S>) => TemplateResult | typeof nothing;
};

/**
 * A section bound to the context of the element that rendered it, which is
 * what a host showing another element's settings reads: `<dpk-app>` draws its
 * active page content's sections, and only that content knows its own state.
 */
export type BoundSettingsSection = {
  readonly id: string;
  readonly label: string;
  render(): TemplateResult | typeof nothing;
};
