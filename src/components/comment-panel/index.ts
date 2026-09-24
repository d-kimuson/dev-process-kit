import { LitElement, nothing, type TemplateResult } from 'lit';

import type { HandoffOutcome } from '../../core/claude-handoff';
import type { Derivation } from '../../core/derive';
import type { DispatchOutcome, Navigation, TemplateDefinition, ValidationIssue } from '../../core/types';

import { serializeDraft } from '../../core/action';
import { buildAgentBrief } from '../../core/export';
import { FRAMEWORK_VERSION } from '../../core/version';
import { copyText } from '../../lib/dom/clipboard';
import {
  commentSubmission,
  initialPanelState,
  reducePanel,
  type CopyFormat,
  type PanelEvent,
  type PanelIntent,
} from './model';
import { presentPanel, type PanelInputs } from './present';
import { panelStyles } from './styles';
import { renderPanel } from './view';

export type CommentPanelCallbacks = {
  readonly onDelete?: (id: string) => void;
  readonly onClear?: () => void;
  readonly onComment?: (target: string, body: string) => DispatchOutcome;
};

/** Public adapter: owns state references, lifecycle and effects, not presentation rules. */
export class DpkComponentCommentPanel extends LitElement {
  static override styles = panelStyles;
  static override properties = {
    definition: { attribute: false },
    state: { attribute: false },
    navigation: { attribute: false },
    derivation: { attribute: false },
    issues: { attribute: false },
    pendingTarget: { attribute: false },
    onDelete: { attribute: false },
    onClear: { attribute: false },
    onComment: { attribute: false },
    exportBrief: { attribute: false },
    sendToClaude: { attribute: false },
    embedded: { type: Boolean },
  };

  declare embedded: boolean;
  declare definition: TemplateDefinition<unknown> | null;
  declare state: unknown;
  declare navigation: Navigation;
  declare derivation: Derivation<unknown> | null;
  declare issues: readonly ValidationIssue[];
  declare pendingTarget: string | null;
  declare onDelete: CommentPanelCallbacks['onDelete'];
  declare onClear: CommentPanelCallbacks['onClear'];
  declare onComment: CommentPanelCallbacks['onComment'];
  declare exportBrief: (() => string) | undefined;
  /** Set by the template inside a Claude Artifact that can reach Claude; shows "Claude に送る". */
  declare sendToClaude: (() => Promise<HandoffOutcome>) | undefined;
  #ui = initialPanelState();

  constructor() {
    super();
    this.embedded = false;
    this.definition = null;
    this.state = undefined;
    this.navigation = {};
    this.derivation = null;
    this.issues = [];
    this.pendingTarget = null;
  }

  protected override willUpdate(changed: Map<PropertyKey, unknown>): void {
    if (changed.has('pendingTarget') && this.pendingTarget) {
      this.#ui = reducePanel(this.#ui, { kind: 'target-requested', ref: this.pendingTarget });
    }
  }

  protected override updated(changed: Map<PropertyKey, unknown>): void {
    if (changed.has('pendingTarget') && this.pendingTarget && this.isConnected) {
      this.renderRoot.querySelector('textarea')?.focus();
    }
  }

  #inputs(): PanelInputs<unknown> | null {
    if (!this.definition || !this.derivation) return null;
    return {
      definition: this.definition,
      state: this.state,
      navigation: this.navigation,
      derivation: this.derivation,
      issues: this.issues,
      sendable: this.sendToClaude !== undefined,
    };
  }

  protected override render(): TemplateResult | typeof nothing {
    const inputs = this.#inputs();
    return inputs ? renderPanel(presentPanel(inputs, this.#ui), this.#send, this.embedded) : nothing;
  }

  #update(event: PanelEvent): void {
    this.#ui = reducePanel(this.#ui, event);
    this.requestUpdate();
  }

  #send = (intent: PanelIntent): void => {
    switch (intent.kind) {
      case 'delete':
        this.onDelete?.(intent.id);
        return;
      case 'clear':
        this.onClear?.();
        return;
      case 'copy':
        void this.#copy(intent.format);
        return;
      case 'send':
        void this.#sendToClaude();
        return;
      case 'submit': {
        const inputs = this.#inputs();
        if (!inputs || !this.onComment) return;
        const submission = commentSubmission(this.#ui, presentPanel(inputs, this.#ui).target.ref);
        if (!submission) return;
        if (!this.onComment(submission.target, submission.body).ok) return;
        this.#update({ kind: 'submitted' });
        return;
      }
      default:
        this.#update(intent);
    }
  };

  async #sendToClaude(): Promise<void> {
    const send = this.sendToClaude;
    if (!send || this.#ui.send.kind === 'pending') return;
    this.#update({ kind: 'send-started' });
    const request = this.#ui.sendRequest;
    const outcome = await send().catch((): HandoffOutcome => ({ ok: false, reason: 'error' }));
    if (this.isConnected) this.#update({ kind: 'send-finished', request, outcome });
  }

  async #copy(format: CopyFormat): Promise<void> {
    const inputs = this.#inputs();
    if (!inputs) return;
    this.#update({ kind: 'copy-started', format });
    const request = this.#ui.copyRequest;
    try {
      const text =
        format === 'json'
          ? serializeDraft(inputs.derivation.actions)
          : (this.exportBrief?.() ??
            buildAgentBrief(
              {
                ...inputs.derivation,
                navigation: inputs.navigation,
                issues: inputs.issues,
              },
              inputs.definition,
              FRAMEWORK_VERSION,
            ));
      const ok = await copyText(text);
      if (this.isConnected) this.#update({ kind: 'copy-finished', request, ok });
    } catch {
      if (this.isConnected) this.#update({ kind: 'copy-finished', request, ok: false });
    }
  }
}

export type { ActionInput } from '../../core/types';
export const defineCommentPanel = (): void => {
  if (!customElements.get('dpk-component-comment-panel'))
    customElements.define('dpk-component-comment-panel', DpkComponentCommentPanel);
};
