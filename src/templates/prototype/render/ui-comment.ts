import { html, nothing, type TemplateResult } from 'lit';
import { keyed } from 'lit/directives/keyed.js';

import type { ComposerMessages } from '../../../components/comment-composer/messages';
import type { PrototypeMessages } from '../messages';
import type { UiCommentPin } from '../present';
import type { UiCommentIntent, UiCommentMode } from '../ui-mode';

import { presentComposer } from '../../../components/comment-composer/present';
import { renderComposer } from '../../../components/comment-composer/view';
import { iconComment } from '../../../core/icons';

export type UiCommentView = {
  readonly mode: UiCommentMode;
  /** The comments already on the previews on screen. */
  readonly pins: readonly UiCommentPin[];
  /** `Desktop › "Save"` for the element being commented on. */
  readonly targetLabel?: string;
  /** Earlier comments on the same element, shown above the text box. */
  readonly notes: readonly string[];
  readonly composer: ComposerMessages;
  readonly send: (intent: UiCommentIntent) => void;
  readonly submit: (body: string) => void;
};

/** Turns the mode on and off. Pressed while the reader is commenting on the UI. */
export const renderUiCommentToggle = (m: PrototypeMessages, view: UiCommentView): TemplateResult => {
  const on = view.mode.kind !== 'off';
  return html`<button
    class=${on ? 'dpk-btn dpk-btn--accent ui-comment-toggle' : 'dpk-btn ui-comment-toggle'}
    type="button"
    aria-pressed=${on ? 'true' : 'false'}
    title=${m.uiCommentHint}
    @click=${() => view.send({ kind: 'toggle' })}
  >
    ${iconComment()} ${m.uiComment}
  </button>`;
};

/** The hint above the canvas while the mode is on. */
export const renderUiCommentHint = (m: PrototypeMessages, view: UiCommentView): TemplateResult | typeof nothing => {
  if (view.mode.kind === 'off') return nothing;
  return html`<p class="ui-comment-hint" role="status">${iconComment()} ${m.uiCommentHint}</p>`;
};

/**
 * Drawn over the canvas while the mode is on: the box under the pointer, the
 * box of the element being commented on, and a numbered pin on every element
 * that already has a comment. The element positions them, since only it can
 * measure the author's markup.
 */
export const renderUiCommentLayer = (m: PrototypeMessages, view: UiCommentView): TemplateResult | typeof nothing => {
  if (view.mode.kind === 'off') return nothing;
  return html`<div class="ui-layer" aria-hidden="true">
    <div class="ui-box ui-hover" hidden></div>
    <div class="ui-box ui-picked" hidden></div>
    ${view.pins.map(
      (pin) =>
        html`<span
          class="ui-pin"
          hidden
          data-preview=${pin.previewId}
          data-selector=${pin.selector}
          title=${m.uiCommentPin(pin.number, pin.body)}
          >${pin.number}</span
        >`,
    )}
  </div>`;
};

/** The composer for the picked element; it floats next to it in the top layer. */
export const renderUiComposer = (view: UiCommentView): TemplateResult | typeof nothing => {
  const mode = view.mode;
  if (mode.kind !== 'composing') return nothing;
  const vm = presentComposer(mode.body, view.notes, {
    key: `ui:${mode.target.previewId}/${mode.target.selector}`,
    ...(view.targetLabel === undefined ? {} : { label: view.targetLabel }),
  });
  return html`${keyed(
    `${mode.target.previewId}/${mode.target.selector}`,
    renderComposer(view.composer, vm, (intent) => {
      if (intent.kind === 'input') view.send({ kind: 'input', body: intent.body });
      else if (intent.kind === 'comment') view.submit(intent.body);
      else view.send({ kind: 'dismiss' });
    }),
  )}`;
};
