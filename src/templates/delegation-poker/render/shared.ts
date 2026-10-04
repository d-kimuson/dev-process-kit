import { html, nothing, type TemplateResult } from 'lit';

import type { DelegationLevel } from '../model';

import { iconComment } from '../../../core/icons';

/** What the board asks the element to do. The renderers own no state. */
export type PokerHandlers = {
  readonly play: (decisionId: string, level: DelegationLevel) => void;
  readonly agree: (decisionId: string, level: DelegationLevel) => void;
  readonly addDecision: () => void;
  readonly rename: (decisionId: string, name: string) => void;
  readonly deleteDecision: (decisionId: string) => void;
  /** Opens the review rail with a note on `target` (`decision:deps`). */
  readonly comment: (target: string) => void;
};

/** The note button, with how many notes the target already has. */
export const commentButton = (
  target: string,
  label: string,
  count: number,
  handlers: PokerHandlers,
): TemplateResult => html`
  <button
    class="dpk-icon-btn"
    type="button"
    data-comment=${target}
    aria-label=${label}
    title=${label}
    @click=${() => handlers.comment(target)}
  >
    ${iconComment()} ${count > 0 ? html`<span class="dpk-icon-badge">${count}</span>` : nothing}
  </button>
`;
